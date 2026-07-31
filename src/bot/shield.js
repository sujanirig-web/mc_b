// src/bot/shield.js

const { GoalFollow } = require('mineflayer-pathfinder').goals;

const HOSTILE_MOBS = [
  "zombie",
  "husk",
  "drowned",
  "zombie_villager",
  "skeleton",
  "stray",
  "pillager",
  "vindicator",
  "evoker",
  "ravager",
  "piglin",
  "piglin_brute",
  "wither_skeleton",
  "creeper"
];

let blocking = false;
let equipping = false;

function getNearestThreat(bot) {
  return bot.nearestEntity(entity => {
    if (!entity) return false;
    if (!HOSTILE_MOBS.includes(entity.name)) return false;

    const dist = bot.entity.position.distanceTo(entity.position);

    if (entity.name.includes("skeleton")) return dist <= 10;
    if (entity.name === "creeper") return dist <= 8;

    return dist <= 3;
  });
}

async function equipShield(bot) {
  if (equipping) return;

  const offhand = bot.inventory.slots[45];

  if (offhand && offhand.name === "shield")
    return true;

  const shield = bot.inventory.items().find(i => i.name === "shield");

  if (!shield)
    return false;

  equipping = true;

  try {
    await bot.equip(shield, "off-hand");
    console.log("[Shield] Equipped shield");
  } catch (err) {
    console.log("[Shield] Equip failed:", err.message);
  }

  equipping = false;

  return bot.inventory.slots[45]?.name === "shield";
}

async function useShield(bot) {

  const threat = getNearestThreat(bot);

  if (!threat) {

    if (blocking) {
      bot.deactivateItem();
      blocking = false;

      console.log("[Shield] Lowered shield");

      const player = bot.nearestEntity(
        e => e.type === "player" &&
             e.username !== bot.username
      );

      if (player) {
        bot.pathfinder.setGoal(new GoalFollow(player, 3), true);
      }
    }

    return;
  }

  const hasShield = await equipShield(bot);

  if (!hasShield)
    return;

  const distance = bot.entity.position.distanceTo(threat.position);

  let shouldBlock = false;

  if (threat.name.includes("skeleton"))
    shouldBlock = distance <= 10;

  else if (threat.name === "creeper")
    shouldBlock = distance <= 6;

  else
    shouldBlock = distance <= 2.8;

  if (!shouldBlock) {

    if (blocking) {
      bot.deactivateItem();
      blocking = false;
    }

    return;
  }

  if (!blocking) {

    console.log(`[Shield] Blocking ${threat.name}`);

    bot.pathfinder.setGoal(null);

    await bot.lookAt(threat.position.offset(0, 1.6, 0), true);

    bot.activateItem(true);

    blocking = true;
  }
}

module.exports = {
  useShield
};