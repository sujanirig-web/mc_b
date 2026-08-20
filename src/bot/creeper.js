// src/bot/creeper.js
// src/bot/creeper.js

const { goals: { GoalNear } } = require('mineflayer-pathfinder');
const Brain = require('./brain');
const state = require('./state');

let evading = false;
let evadeInterval = null;

// =====================
// CONFIG
// =====================
const DETECT_DISTANCE = 8;
const SAFE_DISTANCE = 15;
const RUN_DISTANCE = 10;
const EVADE_UPDATE = 500;

// =====================
// Public
// =====================
function avoidCreepers(bot) {
  if (!state.aiEnabled) return;

  // Already escaping
  if (evading) return;

  // Don't interrupt higher-priority actions
  if (
    Brain.is(Brain.State.PVP) ||
    Brain.is(Brain.State.EAT) ||
    Brain.is(Brain.State.BRIDGE)
  ) {
    return;
  }

  const creeper = getNearestCreeper(bot);

  if (!creeper) return;

  const distance = bot.entity.position.distanceTo(creeper.position);

  if (distance > DETECT_DISTANCE) return;

  console.log(`[Creeper] ⚠ Creeper detected (${distance.toFixed(1)} blocks)`);

  startEvading(bot);
}

// =====================
// Start Escape
// =====================
function startEvading(bot) {

  if (evading) return;

  evading = true;

  Brain.setState(Brain.State.ESCAPE);

  console.log("[Creeper] Running away...");

  if (evadeInterval)
    clearInterval(evadeInterval);

  evadeInterval = setInterval(() => {

    if (!bot.entity) {
      stopEvading(bot);
      return;
    }

    const creeper = getNearestCreeper(bot);

    // Creeper gone
    if (!creeper) {
      stopEvading(bot);
      return;
    }

    const distance =
      bot.entity.position.distanceTo(creeper.position);

    // Safe now
    if (distance >= SAFE_DISTANCE) {
      stopEvading(bot);
      return;
    }

    // Run opposite direction
    const dx =
      bot.entity.position.x - creeper.position.x;

    const dz =
      bot.entity.position.z - creeper.position.z;

    const len = Math.sqrt(dx * dx + dz * dz) || 1;

    const runX =
      bot.entity.position.x +
      (dx / len) * RUN_DISTANCE;

    const runZ =
      bot.entity.position.z +
      (dz / len) * RUN_DISTANCE;

    bot.pathfinder.setGoal(
      new GoalNear(
        runX,
        bot.entity.position.y,
        runZ,
        1
      ),
      false
    );

  }, EVADE_UPDATE);
}

// =====================
// Stop Escape
// =====================
function stopEvading(bot) {

  if (!evading) return;

  evading = false;

  clearInterval(evadeInterval);
  evadeInterval = null;

  bot.pathfinder.setGoal(null);

  Brain.setState(Brain.State.IDLE);

  console.log("[Creeper] ✅ Safe. Returning to normal.");
}

// =====================
// Helpers
// =====================
function getNearestCreeper(bot) {

  return bot.nearestEntity(entity =>
    entity &&
    entity.name === "creeper"
  );

}

function isEvading() {
  return evading;
}

module.exports = {
  avoidCreepers,
  isEvading
};