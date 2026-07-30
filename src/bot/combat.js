// minecraft/combat.js
function handleEntityAttack(bot, attacker, victim) {
  if (attacker.type === 'player' && attacker.username !== bot.username) {
    if (victim.type !== 'player') bot.pvp.attack(victim);
  }
}

function handleEntityHurt(bot, entity) {
  if (entity.type === 'player' && entity.username !== bot.username) {
    const attacker = bot.nearestEntity(e => e.type === 'mob' && e.position.distanceTo(entity.position) < 4);
    if (attacker) bot.pvp.attack(attacker);
  }
}

function handlePlayerCollect(bot, collector) {
  if (collector.username !== bot.username) return;
  setTimeout(() => {
    const weapon = bot.inventory.items().find(i => i.name.includes('sword') || i.name.includes('axe'));
    if (weapon) bot.equip(weapon, 'hand');
  }, 500);
}

module.exports = {
  handleEntityAttack,
  handleEntityHurt,
  handlePlayerCollect,
};