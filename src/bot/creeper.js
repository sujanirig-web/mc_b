// src/bot/creeper.js

const { goals: { GoalNear } } = require('mineflayer-pathfinder');

let evading = false;
let evadeInterval = null;

// =====================
// CONFIG
// =====================
const DETECT_DISTANCE = 8;      // Start escaping
const SAFE_DISTANCE = 15;       // Stop escaping
const RUN_DISTANCE = 10;        // Run this far away
const EVADE_UPDATE = 500;       // Update every 500ms

// =====================
// Main Function
// =====================
function avoidCreepers(bot) {
  // Already escaping
  if (evading) return;

  const creeper = getNearestCreeper(bot);
  if (!creeper) return;

  const distance = bot.entity.position.distanceTo(creeper.position);

  if (distance > DETECT_DISTANCE) return;

  console.log(`[Creeper] ⚠ Creeper detected (${distance.toFixed(1)} blocks)`);

  startEvading(bot);
}

// =====================
// Start Evading
// =====================
function startEvading(bot) {
  if (evading) return;

  evading = true;

  console.log("[Creeper] Running away...");

  evadeInterval = setInterval(() => {

    const creeper = getNearestCreeper(bot);

    // Creeper gone
    if (!creeper) {
      stopEvading();
      return;
    }

    const distance = bot.entity.position.distanceTo(creeper.position);

    // Safe distance reached
    if (distance >= SAFE_DISTANCE) {
      stopEvading();
      return;
    }

    // Calculate direction opposite of creeper
    const dx = bot.entity.position.x - creeper.position.x;
    const dz = bot.entity.position.z - creeper.position.z;

    const length = Math.sqrt(dx * dx + dz * dz) || 1;

    const runX = bot.entity.position.x + (dx / length) * RUN_DISTANCE;
    const runZ = bot.entity.position.z + (dz / length) * RUN_DISTANCE;

    bot.pathfinder.setGoal(
      new GoalNear(
        runX,
        bot.entity.position.y,
        runZ,
        1
      )
    );

  }, EVADE_UPDATE);
}

// =====================
// Stop Evading
// =====================
function stopEvading() {
  if (!evading) return;

  clearInterval(evadeInterval);
  evadeInterval = null;
  evading = false;

  console.log("[Creeper] ✅ Safe. Returning to follow.");
}

// =====================
// Find Nearest Creeper
// =====================
function getNearestCreeper(bot) {
  return bot.nearestEntity(entity =>
    entity &&
    entity.name === "creeper"
  );
}

module.exports = {
  avoidCreepers
};