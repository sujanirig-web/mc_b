// src/dashboard/armor.js
const { drawSlot } = require('./slot');

/**
 * Draws 4 armor slots (helmet, chestplate, leggings, boots).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Inventory} inventory
 * @param {number} x - top-left x
 * @param {number} y - top-left y
 * @param {object} itemTextures
 */
function drawArmor(ctx, inventory, x, y, itemTextures) {
  const armorSlots = [5, 6, 7, 8]; // helmet, chest, legs, boots in Mineflayer inventory
  // Draw each vertically
  for (let i = 0; i < armorSlots.length; i++) {
    const item = inventory.slots[armorSlots[i]];
    const slotX = x;
    const slotY = y + i * 20;
    drawSlot(ctx, slotX, slotY, item, itemTextures);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px "Minecraft"';
  ctx.fillText('Armor', x, y - 10);
}

module.exports = { drawArmor };