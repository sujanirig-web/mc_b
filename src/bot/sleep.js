// src/bot/sleep.
const brain = require("./brain");
const state = require("./state");


let sleepingTask = false;
let sleepInterval = null;
let botInstance = null;
let isSleeping = false;
let followPlayer = null;          // the player we are following (to detect their sleep state)

/**
 * Initialize the sleep module with a bot instance and the player to follow.
 * This should be called once after the bot spawns.
 */
function initSleep(bot, playerName) {
  botInstance = bot;
followPlayer = playerName;

isSleeping = false;
sleepingTask = false;
  // Wake up if the bot is forced out of bed (e.g., by being attacked)
  bot.on('wake', () => {
    if (isSleeping) {
        console.log('[Sleep] Woke up');

        isSleeping = false;
        sleepingTask = false;

        brain.setState(brain.State.FOLLOW);
    }
});

  // If the bot dies, ensure sleep state is reset
 bot.on('death', () => {
    isSleeping = false;
    sleepingTask = false;
    brain.setState(brain.State.FOLLOW);
});
}

/**
 * Check if a given entity is inside a bed block.
 * We determine this by looking at the block under the entity's feet.
 */
function isEntityInBed(entity) {
  if (!entity) return false;
  const pos = entity.position.floored();
  const block = botInstance.blockAt(pos);
  return block && botInstance.isABed(block);
}

/**
 * Attempt to make the bot sleep.
 * Returns true if successful, false otherwise.
 */
async function trySleep() {
  if (isSleeping) return true;          // already sleeping
  if (!botInstance) return false;

  if (
  brain.is(brain.State.PVP) ||
  brain.is(brain.State.ESCAPE) ||
  brain.is(brain.State.EAT) ||
  brain.is(brain.State.BRIDGE)
) {
  return false;
}
if (sleepingTask)
  return false;

sleepingTask = true;
  // Check if the bot is already in bed (shouldn't happen, but safety)
  if (botInstance.isSleeping) {
    isSleeping = true;
    sleepingTask = false;
    brain.setState(brain.State.SLEEP);
    return true;
}

  // Find a bed nearby
  const bed = botInstance.findBlock({
    matching: block => botInstance.isABed(block),
    maxDistance: 6
  });

  if (!bed) {
    sleepingTask = false;
    console.log('[Sleep] No bed nearby');
    return false;
}

  try {
    console.log('[Sleep] Attempting to sleep...');
    await botInstance.sleep(bed);

isSleeping = true;
sleepingTask = false;

brain.setState(brain.State.SLEEP);

console.log('[Sleep] Now sleeping');
return true;
  } catch (err) {
    console.log(`[Sleep] Failed to sleep: ${err.message}`);
   isSleeping = false;
sleepingTask = false;
return false;
  }
}

/**
 * Wake the bot up.
 */
function wakeUp() {
  if (!botInstance || !isSleeping) return;
  try {
    botInstance.wake();
    isSleeping = false;
    brain.setState(brain.State.FOLLOW);
sleepingTask = false;
    console.log('[Sleep] Woke up');
  } catch (err) {
    console.log(`[Sleep] Failed to wake: ${err.message}`);
  }
}

/**
 * The main sleep logic: call this periodically (e.g., every second) to check
 * if the followed player is sleeping, and act accordingly.
 */
async function sleepWithPlayer() {
  if (!state.aiEnabled) return;
  if (!botInstance || !followPlayer) return;
  console.log("[Sleep] Checking...");
console.log("[Sleep] Following:", followPlayer);

  // Get the player entity from the bot's known players
 const playerInfo = botInstance.players[followPlayer];

if (!playerInfo) {
  console.log("[Sleep] Player not found");
  return;
}

if (!playerInfo.entity) {
  console.log("[Sleep] Player entity not loaded");
  return;
}
  const playerEntity = playerInfo.entity;
  console.log("[Sleep] Position:", playerEntity.position);

const block = botInstance.blockAt(playerEntity.position.floored());

console.log("[Sleep] Block:", block?.name);
  const playerInBed = isEntityInBed(playerEntity);

  if (playerInBed && !isSleeping) {
    // The player is sleeping → we should sleep too
    await trySleep();
  } else if (!playerInBed && isSleeping) {
    // The player woke up → we wake up too
    wakeUp();
  } else if (playerInBed && isSleeping) {
    // Both already sleeping – do nothing
  }
}

/**
 * Cleanup function to reset state.
 */
function cleanup() {
  if (isSleeping) wakeUp();
  botInstance = null;
  followPlayer = null;
}

module.exports = {
  initSleep,
  sleepWithPlayer,
  cleanup,
  isSleeping: () => isSleeping,
};