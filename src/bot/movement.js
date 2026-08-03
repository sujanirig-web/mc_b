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

// ---------- Target rotation state ----------
let targetSwitchTime = 0; // timestamp when current target was chosen

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
    const y = start.y;
    const pos = new Vec3(x, y, z);
    const block = bot.blockAt(pos);
    const below = bot.blockAt(pos.offset(0, -1, 0));

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

    const gapPos = findFirstGap(bot, target);
    if (!gapPos) {
      abortBridge(bot, false);
      return;
    }

    let behind = gapPos.offset(-Math.round(dir.x), 0, -Math.round(dir.z));
    let edgeBlock = bot.blockAt(behind);
    if (!edgeBlock || edgeBlock.name === 'air') {
      for (let i = 1; i <= GAP_SCAN_RADIUS; i++) {
        const backPos = gapPos.offset(-Math.round(dir.x) * i, 0, -Math.round(dir.z) * i);
        const block = bot.blockAt(backPos);
        if (block && block.name !== 'air') {
          behind = backPos;
          break;
        }
      }
    }
    edgeBlock = bot.blockAt(behind);
    if (!edgeBlock || edgeBlock.name === 'air') {
      abortBridge(bot, false);
      return;
    }

    bridgeState = BridgeState.MOVING_TO_EDGE;
    bot.pathfinder.setGoal(new GoalNear(behind.x, behind.y, behind.z, 1));

    const moveCheck = setInterval(() => {
      if (bot.entity.position.distanceTo(behind) < 1.5) {
        clearInterval(moveCheck);
        bridgeForward(bot, gapPos, dir, target);
      }
    }, 200);

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
 */
async function bridgeForward(bot, firstGapPos, dir, target) {
  bridgeState = BridgeState.PLACING;

  let currentGapPos = firstGapPos;
  let blocksPlaced = 0;
  const maxBlocks = 6;

  while (blocksPlaced < maxBlocks) {
    const blockItem = findPlaceableBlock(bot);
    if (!blockItem) {
      abortBridge(bot, false);
      return;
    }

    const placePos = currentGapPos;
    const support = findSupportAndFace(bot, placePos);
    if (!support) {
      abortBridge(bot, false);
      return;
    }

    bot.setControlState('sneak', true);

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

      const placed = bot.blockAt(placePos);
      if (!placed || placed.name === 'air') {
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
        const placedAgain = bot.blockAt(placePos);
        if (!placedAgain || placedAgain.name === 'air') {
          bot.setControlState('sneak', false);
          abortBridge(bot, false);
          return;
        }
      }

      blocksPlaced++;
      console.log(`[Bridge] Placed block ${blocksPlaced} at ${placePos}`);

      const standPos = placePos.offset(0, 1, 0);
      bot.pathfinder.setGoal(new GoalNear(standPos.x, standPos.y, standPos.z, 1));

      await new Promise((resolve) => {
        const waitInterval = setInterval(() => {
          if (bot.entity.position.distanceTo(standPos) < 1.5) {
            clearInterval(waitInterval);
            resolve();
          }
        }, 200);
        setTimeout(() => {
          clearInterval(waitInterval);
          resolve();
        }, 3000);
      });

      const nextPos = bot.entity.position.floored().plus(dir.scaled(2));
      const nextBlock = bot.blockAt(nextPos);
      const belowNext = bot.blockAt(nextPos.offset(0, -1, 0));
      if (!nextBlock || nextBlock.name !== 'air' ||
          (belowNext && belowNext.name !== 'air' && !belowNext.name.includes('water') && !belowNext.name.includes('lava'))) {
        break;
      }
      currentGapPos = nextPos;
    } catch (err) {
      console.log(`[Bridge] Error while placing: ${err.message}`);
      bot.setControlState('sneak', false);
      abortBridge(bot, false);
      return;
    }
  }

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

// ---------- Public Interface ----------

function shouldBridge(bot, target) {
  if (isBridging) return false;
  if (!target || !bot.entity) return false;
  if (bot.pvp?.target || bot.isSleeping) return false;
  if (bot.entity.isInWater || bot.entity.isInLava) return false;
  if (Math.abs(bot.entity.velocity.y) > 0.5) return false;

  const currentPos = bot.entity.position.floored();
  if (lastPosition && currentPos.equals(lastPosition)) {
    if (!stuckTimer) {
      stuckTimer = setTimeout(() => {
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

function performBridge(bot, target) {
  return Promise.resolve(false);
}

// ---------- Main Following Loop (sticky follow + 2‑min rotation) ----------
function startFollowing(bot) {
  console.log("[Movement] startFollowing() called");
  if (state.followInterval) clearInterval(state.followInterval);

  state.followInterval = setInterval(() => {
    // Connection & state checks (silent)
    if (!state.currentBot || state.currentBot !== bot || !state.wasConnected) {
      return;
    }

    // Blocked by higher priority states
    if (brain.is(brain.State.PVP) ||
        brain.is(brain.State.ESCAPE) ||
        brain.is(brain.State.SLEEP) ||
        brain.is(brain.State.BRIDGE)) {
      return;
    }

    if (isBridging) return;

    // --- Determine who to follow ---
    let target = state.currentFollowTarget;
    const now = Date.now();

    if (target && target.isValid) {
      // Target is valid – check rotation timer
      const timeWithTarget = (now - targetSwitchTime) / 1000;
      if (timeWithTarget >= 120) { // 2 minutes
        // Look for other players within 50 blocks
        const otherPlayers = Object.values(bot.entities)
          .filter(e => e.type === 'player' && e.username !== bot.username && e !== target)
          .filter(e => e.position.distanceTo(bot.entity.position) < 50);

        if (otherPlayers.length > 0) {
          // Switch to nearest other player
          const newTarget = otherPlayers.reduce((a, b) =>
            a.position.distanceTo(bot.entity.position) < b.position.distanceTo(bot.entity.position) ? a : b
          );
          console.log(`[Movement] Rotating target: ${target.username} → ${newTarget.username}`);
          target = newTarget;
          state.currentFollowTarget = target;
          targetSwitchTime = now;
        } else {
          // No other players nearby – reset timer to avoid repeated checks
          targetSwitchTime = now;
        }
      }
      // else keep current target
    } else {
      // No valid target – pick the nearest player
      target = bot.nearestEntity(e => e.type === "player" && e.username !== bot.username);
      if (target) {
        console.log(`[Movement] New follow target: ${target.username}`);
        state.currentFollowTarget = target;
        targetSwitchTime = now;
      } else {
        // No players online
        state.currentFollowTarget = null;
        bot.pathfinder.setGoal(null);
        brain.setState(brain.State.IDLE);
        return;
      }
    }

    // --- Follow logic ---
    brain.setState(brain.State.FOLLOW);
    shouldBridge(bot, target);

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
  defaultMove.allowParkour = false;
  defaultMove.allowSprinting = true;
  defaultMove.allowOpeningDoors = true;
  defaultMove.canOpenDoors = true;

  // Avoid drops taller than 2 blocks
  defaultMove.maxDrop = 2;

  bot.pathfinder.setMovements(defaultMove);
}

module.exports = {
  configurePathfinder,
  startFollowing,
  stopFollowing,
  handleSleeping,
  startBridge,
};