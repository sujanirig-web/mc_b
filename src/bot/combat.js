// src/bot/combat.js

const state = require("./state");
const brain = require("./brain");


let currentTarget = null;
let followTarget = null;               // Added: target player to follow when far away

/**
 * Equip best weapon
 */
async function equipWeapon(bot) {
  const weapon = bot.inventory.items().find(item =>
    item.name.includes("netherite_sword") ||
    item.name.includes("diamond_sword") ||
    item.name.includes("iron_sword") ||
    item.name.includes("stone_sword") ||
    item.name.includes("wooden_sword") ||
    item.name.includes("axe")
  );

  if (!weapon) return false;

  try {
    await bot.equip(weapon, "hand");
    return true;
  } catch {
    return false;
  }
}

/**
 * Start attacking
 */
async function startCombat(bot, target) {
  if (!target) return;

  // Don't interrupt higher priority states
  if (
    brain.is(brain.State.SLEEP) ||
    brain.is(brain.State.EAT) ||
    brain.is(brain.State.ESCAPE) ||
    brain.is(brain.State.BRIDGE)
  ) {
    return;
  }

  if (currentTarget === target && bot.pvp.target === target) return;

  currentTarget = target;

  brain.setState(brain.State.PVP);

  await equipWeapon(bot);

  try {
    bot.pvp.attack(target);
    console.log(`[Combat] Attacking ${target.name}`);
  } catch (err) {
    console.log("[Combat]", err.message);
  }
}

/**
 * Stop combat
 */
function stopCombat(bot) {
  if (bot.pvp.target) {
    bot.pvp.stop();
  }

  currentTarget = null;

  if (brain.is(brain.State.PVP))
    brain.setState(brain.State.FOLLOW);
}

/**
 * Someone attacked something
 */
function handleEntityAttack(bot, attacker, victim) {

  if (!attacker || !victim) return;

  // Ignore if busy
  if (
    brain.is(brain.State.SLEEP) ||
    brain.is(brain.State.EAT) ||
    brain.is(brain.State.ESCAPE) ||
    brain.is(brain.State.BRIDGE)
  ) {
    return;
  }

  // Protect player
  if (
    attacker.type === "mob" &&
    victim.type === "player" &&
    victim.username !== bot.username
  ) {
    startCombat(bot, attacker);
  }
}

/**
 * Someone got hurt
 */
function handleEntityHurt(bot, entity) {

  if (!entity) return;

  if (
    brain.is(brain.State.SLEEP) ||
    brain.is(brain.State.EAT) ||
    brain.is(brain.State.ESCAPE) ||
    brain.is(brain.State.BRIDGE)
  ) {
    return;
  }

  if (
    entity.type === "player" &&
    entity.username !== bot.username
  ) {

    const attacker = bot.nearestEntity(e =>
      e.type === "mob" &&
      e.position.distanceTo(entity.position) < 6
    );

    if (attacker)
      startCombat(bot, attacker);
  }
}


/**
 * Re-equip weapon after collecting loot
 */
function handlePlayerCollect(bot, collector) {

  if (!collector) return;

  if (collector.username !== bot.username)
    return;

  setTimeout(() => {

    if (
      brain.is(brain.State.PVP) &&
      bot.pvp.target
    ) {
      equipWeapon(bot);
    }

  }, 500);
}

/**
 * Call every second
 */
function updateCombat(bot) {

  if (!brain.is(brain.State.PVP))
    return;

  if (!bot.pvp.target) {
    stopCombat(bot);
    return;
  }

  if (!bot.pvp.target.isValid) {
    stopCombat(bot);
    return;
  }

  const dist = bot.entity.position.distanceTo(
    bot.pvp.target.position
  );

  if (dist > 25) {
    console.log("[Combat] Lost target.");
    stopCombat(bot);
  }
}

/* ---------- Added: follow when far away ---------- */

/**
 * Set the player to follow when distance exceeds 155 blocks.
 * @param {Object} player - The player entity to follow.
 */
function setFollowTarget(player) {
  followTarget = player;
}

/**
 * Force the bot to stop everything and follow the target if it is more than 155 blocks away.
 * This overrides all current states (SLEEP, EAT, ESCAPE, BRIDGE, etc.).
 * Should be called periodically (e.g., in the main loop).
 * @param {Object} bot - The bot instance.
 */
function forceFollowIfFar(bot) {
  if (!followTarget) return;

  // If target is dead or gone, clear it
  if (!followTarget.isValid) {
    followTarget = null;
    return;
  }

  const dist = bot.entity.position.distanceTo(followTarget.position);

  if (dist > 155) {
    // Stop any active combat
    if (bot.pvp.target) {
      bot.pvp.stop();
    }
    currentTarget = null;

    // Override any state and force FOLLOW
    brain.setState(brain.State.FOLLOW);

    // Set the follow target so the follow module knows whom to track
    state.followTarget = followTarget;

    console.log(`[Combat] Force following ${followTarget.name} (distance ${Math.round(dist)})`);
  }
}

module.exports = {
  handleEntityAttack,
  handleEntityHurt,
  handlePlayerCollect,
  updateCombat,
  startCombat,
  stopCombat,
  setFollowTarget,     // Added export
  forceFollowIfFar     // Added export
};