// src/bot/movement.js
const { pathfinder, Movements, goals: { GoalFollow, GoalNear } } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');
const state = require('./state');
const brain = require("./brain");

// ---------- Configuration ----------
const BRIDGE_BLOCK_TYPES = ['planks', 'stone', 'cobblestone', 'dirt', 'grass'];
const STUCK_THRESHOLD_MS = 1500;          // time without movement before we consider stuck
const GAP_SCAN_RADIUS = 3;                // blocks ahead to scan
const PLACEMENT_TIMEOUT_MS = 3000;        // max time to place a block

// ---------- Bridge State Machine ----------
const BridgeState = {
  IDLE: 'idle',
  STUCK: 'stuck',
  MOVING_TO_EDGE: 'moving_to_edge',
  PLACING: 'placing',
  DONE: 'done',
};

let bridgeState = BridgeState.IDLE;
let isBridging = false;
let lastPosition = null;
let stuckTimer = null;
let bridgeResolve = null;

// ---------- Helper Functions ----------

/** Find a placeable block in the bot's inventory */
function findPlaceableBlock(bot) {
  return bot.inventory.items().find(item =>
    BRIDGE_BLOCK_TYPES.some(type => item.name.includes(type))
  );
}

/** Find a support block and the face to place against */
function findSupportAndFace(bot, placePos) {
  const offsets = [
    new Vec3(1, 0, 0), new Vec3(-1, 0, 0),
    new Vec3(0, 0, 1), new Vec3(0, 0, -1),
    new Vec3(0, -1, 0), new Vec3(0, 1, 0)
  ];
  for (const offset of offsets) {
    const supportPos = placePos.plus(offset);
    const block = bot.blockAt(supportPos);
    if (block && block.name !== 'air') {
      // The face vector is the direction from supportPos to placePos
      const face = offset.scaled(-1);
      return { support: supportPos, face };
    }
  }
  return null;
}

/**
 * Scan the terrain in front of the bot to find the first gap.
 * A gap is an air block with air (or water/lava) below it.
 */
function findFirstGap(bot, target) {
  if (!target) return null;
  const start = bot.entity.position.floored();
  const dir = target.position.minus(bot.entity.position).normalize();

  for (let i = 1; i <= GAP_SCAN_RADIUS; i++) {
    const x = start.x + Math.round(dir.x * i);
    const z = start.z + Math.round(dir.z * i);
    const y = start.y;                      // step level (feet)
    const pos = new Vec3(x, y, z);
    const block = bot.blockAt(pos);
    const below = bot.blockAt(pos.offset(0, -1, 0));

    // Gap if the block is air and the block below is not solid (air, water, or lava)
    if (block && block.name === 'air' && below &&
        (below.name === 'air' || below.name.includes('water') || below.name.includes('lava'))) {
      return pos;
    }
  }
  return null;
}

/**
 * Start the bridge process.
 * Returns a promise that resolves to true if the bridge was completed successfully.
 */
function startBridge(bot, target) {
  if (isBridging) return Promise.resolve(false);
  isBridging = true;
  bridgeState = BridgeState.STUCK;

  return new Promise((resolve) => {
    bridgeResolve = resolve;
    const dir = target.position.minus(bot.entity.position).normalize();

    // 1. Find the gap
    const gapPos = findFirstGap(bot, target);
    if (!gapPos) {
      abortBridge(bot, false);
      return;
    }

    // 2. Determine the edge block (the solid block just before the gap)
    // The edge is the block behind the gap (one step back from gapPos)
   let behind = gapPos.offset(-Math.round(dir.x), 0, -Math.round(dir.z));
    let edgeBlock = bot.blockAt(behind);
    if (!edgeBlock || edgeBlock.name === 'air') {
      // Fallback: if behind is air, try to find the nearest solid block behind
      for (let i = 1; i <= GAP_SCAN_RADIUS; i++) {
        const backPos = gapPos.offset(-Math.round(dir.x) * i, 0, -Math.round(dir.z) * i);
        const block = bot.blockAt(backPos);
        if (block && block.name !== 'air') {
         behind = backPos;
          break;
        }
      }
    }
    // Verify we found a solid edge
    edgeBlock = bot.blockAt(behind);
    if (!edgeBlock || edgeBlock.name === 'air') {
      abortBridge(bot, false);
      return;
    }

    // 3. Move to the edge block
    bridgeState = BridgeState.MOVING_TO_EDGE;
    bot.pathfinder.setGoal(new GoalNear(behind.x, behind.y, behind.z, 1));

    // Wait until the bot is within 1.5 blocks of the edge
    const moveCheck = setInterval(() => {
      if (bot.entity.position.distanceTo(behind) < 1.5) {
        clearInterval(moveCheck);
        // We are at the edge → start placing blocks sequentially
        bridgeForward(bot, gapPos, dir, target);
      }
    }, 200);

    // Safety timeout: if we can't reach the edge within 5 seconds, abort
    setTimeout(() => {
      clearInterval(moveCheck);
      if (bridgeState === BridgeState.MOVING_TO_EDGE) {
        abortBridge(bot, false);
      }
    }, 5000);
  });
}

/**
 * Continuously place blocks forward until the gap is bridged or we run out of blocks.
 * This creates a real bridge, one block at a time.
 */
async function bridgeForward(bot, firstGapPos, dir, target) {
  bridgeState = BridgeState.PLACING;

  let currentGapPos = firstGapPos;
  let blocksPlaced = 0;
  const maxBlocks = 6; // prevent infinite loops

  while (blocksPlaced < maxBlocks) {
    // Check if we have blocks
    const blockItem = findPlaceableBlock(bot);
    if (!blockItem) {
      abortBridge(bot, false);
      return;
    }

    // The block to place is the current gap position (the air block we step into)
    const placePos = currentGapPos;
    const support = findSupportAndFace(bot, placePos);
    if (!support) {
      abortBridge(bot, false);
      return;
    }

    // Sneak before placing
    bot.setControlState('sneak', true);

    // Equip and place the block
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Placement timeout')), PLACEMENT_TIMEOUT_MS);
        bot.equip(blockItem, 'hand', (err) => {
          if (err) { clearTimeout(timeout); reject(err); return; }
          const lookPos = placePos.offset(0.5, 0.5, 0.5);
          bot.lookAt(lookPos, () => {
            bot.placeBlock(bot.blockAt(support.support), support.face, (err) => {
              clearTimeout(timeout);
              if (err) reject(err);
              else resolve();
            });
          });
        });
      });

      // Verify placement
      const placed = bot.blockAt(placePos);
      if (!placed || placed.name === 'air') {
        // Retry once with the same support
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Retry timeout')), PLACEMENT_TIMEOUT_MS);
          bot.lookAt(placePos.offset(0.5, 0.5, 0.5), () => {
            bot.placeBlock(bot.blockAt(support.support), support.face, (err) => {
              clearTimeout(timeout);
              if (err) reject(err);
              else resolve();
            });
          });
        });
        // Verify again
        const placedAgain = bot.blockAt(placePos);
        if (!placedAgain || placedAgain.name === 'air') {
          // Still failed – abort
          bot.setControlState('sneak', false);
          abortBridge(bot, false);
          return;
        }
      }

      // Successfully placed one block
      blocksPlaced++;
      console.log(`[Bridge] Placed block ${blocksPlaced} at ${placePos}`);

      // Move forward onto the new block: set a temporary GoalNear to stand on it
      // The block we just placed is at (placePos.x, placePos.y, placePos.z)
      // We want to stand on top of it: (placePos.x, placePos.y+1, placePos.z)
      const standPos = placePos.offset(0, 1, 0);
      bot.pathfinder.setGoal(new GoalNear(standPos.x, standPos.y, standPos.z, 1));

      // Wait until we are on the new block
      await new Promise((resolve) => {
        const waitInterval = setInterval(() => {
          if (bot.entity.position.distanceTo(standPos) < 1.5) {
            clearInterval(waitInterval);
            resolve();
          }
        }, 200);
        // Safety timeout: after 3 seconds, assume we're stuck and abort
        setTimeout(() => {
          clearInterval(waitInterval);
          resolve();
        }, 3000);
      });

      // Now check if there is still a gap ahead (the next block)
      const nextGap = findFirstGap(bot, target); // need target here – we don't have it directly
      // We need the target from the outer scope; we'll pass it as an argument
      // For simplicity, we'll use the dir to look ahead from current position.
      const nextPos = bot.entity.position.floored().plus(dir.scaled(2));
      const nextBlock = bot.blockAt(nextPos);
      const belowNext = bot.blockAt(nextPos.offset(0, -1, 0));
      if (!nextBlock || nextBlock.name !== 'air' ||
          (belowNext && belowNext.name !== 'air' && !belowNext.name.includes('water') && !belowNext.name.includes('lava'))) {
        // No more gap – bridge is complete
        break;
      }
      // Otherwise, continue: set currentGapPos to the new gap and loop
      currentGapPos = nextPos;
    } catch (err) {
      console.log(`[Bridge] Error while placing: ${err.message}`);
      bot.setControlState('sneak', false);
      abortBridge(bot, false);
      return;
    }
  }

  // All done – we bridged the gap (or ran out of blocks)
  bot.setControlState('sneak', false);
  finishBridge(bot, true);
}

function finishBridge(bot, success) {
  bridgeState = BridgeState.DONE;
  isBridging = false;
  if (bridgeResolve) {
    bridgeResolve(success);
    bridgeResolve = null;
  }
}

function abortBridge(bot, success) {
  bridgeState = BridgeState.IDLE;
  isBridging = false;
  if (bridgeResolve) {
    bridgeResolve(success);
    bridgeResolve = null;
  }
}

// ---------- Public Interface for movement.js ----------

/**
 * Called inside the follow interval to detect if we are stuck and should bridge.
 * It returns false immediately; the actual bridge is started asynchronously.
 */
function shouldBridge(bot, target) {
  if (isBridging) return false;
  if (!target || !bot.entity) return false;
  if (bot.pvp?.target || bot.isSleeping) return false;
  if (bot.entity.isInWater || bot.entity.isInLava) return false;
  if (Math.abs(bot.entity.velocity.y) > 0.5) return false; // falling/jumping

  const currentPos = bot.entity.position.floored();
  if (lastPosition && currentPos.equals(lastPosition)) {
    // We haven't moved since last tick
    if (!stuckTimer) {
      stuckTimer = setTimeout(() => {
        // We are stuck – check if a gap exists
        const gap = findFirstGap(bot, target);
        if (gap && findPlaceableBlock(bot) && findSupportAndFace(bot, gap)) {
          startBridge(bot, target);
        } else {
          stuckTimer = null;
        }
      }, STUCK_THRESHOLD_MS);
    }
    return false;
  } else {
    lastPosition = currentPos;
    if (stuckTimer) {
      clearTimeout(stuckTimer);
      stuckTimer = null;
    }
    return false;
  }
}

/**
 * This function is called from the follow loop as a no‑op because bridging is started by shouldBridge.
 * We keep it for compatibility.
 */
function performBridge(bot, target) {
  return Promise.resolve(false);
}

// ---------- Main Following Loop ----------
function startFollowing(bot) {
  console.log("[Movement] startFollowing() called");
  if (state.followInterval) clearInterval(state.followInterval);
state.followInterval = setInterval(() => {

    console.log("========== FOLLOW LOOP ==========");

    if (!state.currentBot) {
        console.log("No currentBot");
        return;
    }

    if (state.currentBot !== bot) {
        console.log("Wrong bot instance");
        return;
    }

    if (!state.wasConnected) {
        console.log("Not connected");
        return;
    }

    console.log("Passed connection checks");

    if (brain.is(brain.State.PVP)) {
        console.log("Blocked by PVP");
        return;
    }

    if (brain.is(brain.State.ESCAPE)) {
        console.log("Blocked by ESCAPE");
        return;
    }

    if (brain.is(brain.State.SLEEP)) {
        console.log("Blocked by SLEEP");
        return;
    }

    if (brain.is(brain.State.BRIDGE)) {
        console.log("Blocked by BRIDGE");
        return;
    }

    console.log("Passed brain checks");

    if (isBridging) {
        console.log("Currently bridging");
        return;
    }

    console.log("Looking for target...");

    const target = bot.nearestEntity(
        e => e.type === "player" && e.username !== bot.username
    );

    console.log("Target =", target?.username);

if (!target) {
    console.log("No player found.");
    state.currentFollowTarget = null;
    bot.pathfinder.setGoal(null);
    brain.setState(brain.State.IDLE);
    return;
}

console.log("Following", target.username);

state.currentFollowTarget = target;
brain.setState(brain.State.FOLLOW);

// Check if we need to bridge
shouldBridge(bot, target);

// If we're already bridging, don't overwrite the bridge goal
if (!isBridging) {
    bot.pathfinder.setGoal(new GoalFollow(target, 3), true);
}

}, 1000);
}

function stopFollowing() {
  if (state.followInterval) {
    clearInterval(state.followInterval);
    state.followInterval = null;
  }
  state.currentFollowTarget = null;
  isBridging = false;
  bridgeState = BridgeState.IDLE;
  if (stuckTimer) {
    clearTimeout(stuckTimer);
    stuckTimer = null;
  }
  lastPosition = null;
}

function handleSleeping(bot) {
  if (bot.time.isDay || bot.isSleeping || bot.pvp?.target) return;
  const bed = bot.findBlock({ matching: b => bot.isABed(b), maxDistance: 8 });
  if (bed) bot.sleep(bed).catch(() => {});
}

function configurePathfinder(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  defaultMove.canDig = false;
  defaultMove.allowParkour = false;      // prevent jumping into gaps
  defaultMove.allowSprinting = true;
  defaultMove.allowOpeningDoors = true;
  defaultMove.canOpenDoors = true;
  bot.pathfinder.setMovements(defaultMove);
}

module.exports = {
  configurePathfinder,
  startFollowing,
  stopFollowing,
  handleSleeping,
  startBridge,
};