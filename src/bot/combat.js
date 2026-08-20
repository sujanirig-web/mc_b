// src/bot/combat.js

const state = require("./state");
const brain = require("./brain");

let currentTarget = null;  // local combat target

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
  if (state.aiEnabled) return;
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
  if (brain.is(brain.State.PVP)) {
    brain.setState(brain.State.FOLLOW);
  }
}

/**
 * Someone attacked something
 */
function handleEntityAttack(bot, attacker, victim) {
  if (!state.aiEnabled) return;
  if (!attacker || !victim) return;

  if (
    brain.is(brain.State.SLEEP) ||
    brain.is(brain.State.EAT) ||
    brain.is(brain.State.ESCAPE) ||
    brain.is(brain.State.BRIDGE)
  ) {
    return;
  }

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
  if (!state.aiEnabled) return;
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
    if (attacker) startCombat(bot, attacker);
  }
}

/**
 * Re-equip weapon after collecting loot
 */
function handlePlayerCollect(bot, collector) {
  if (!collector) return;
  if (collector.username !== bot.username) return;

  setTimeout(() => {
    if (brain.is(brain.State.PVP) && bot.pvp.target) {
      equipWeapon(bot);
    }
  }, 500);
}

/**
 * Call every second to clean up combat state
 */
function updateCombat(bot) {
  if (!brain.is(brain.State.PVP)) return;

  if (!bot.pvp.target) {
    stopCombat(bot);
    return;
  }
  if (!bot.pvp.target.isValid) {
    stopCombat(bot);
    return;
  }

  const dist = bot.entity.position.distanceTo(bot.pvp.target.position);
  if (dist > 25) {
    console.log("[Combat] Lost target.");
    stopCombat(bot);
  }
}

/**
 * Force-follow if the followed player is >155 blocks away.
 * Overrides combat and any other state.
 */
function forceFollowIfFar(bot) {
  // ✅ FIX: use state.currentFollowTarget set by movement.js
  const target = state.currentFollowTarget;
  if (!target) return;
  if (!target.isValid) return;

  const dist = bot.entity.position.distanceTo(target.position);
  if (dist > 155) {
    if (bot.pvp.target) {
      bot.pvp.stop();
    }
    currentTarget = null;
    brain.setState(brain.State.FOLLOW);
    console.log(`[Combat] Force following ${target.name} (distance ${Math.round(dist)})`);
  }
}

module.exports = {
  handleEntityAttack,
  handleEntityHurt,
  handlePlayerCollect,
  updateCombat,
  startCombat,
  stopCombat,
  forceFollowIfFar   // ✅ FIX: removed setFollowTarget
};