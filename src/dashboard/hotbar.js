// src/dashboard/hotbar.js
const { drawSlot } = require('./slot');

/**
 * Draws the hotbar (9 slots) with a selected slot highlight.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Inventory} inventory
 * @param {number} x - top-left x
 * @param {number} y - top-left y
 * @param {object} itemTextures
 */
function drawHotbar(ctx, inventory, x, y, itemTextures) {
  // Background (a darker bar)
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x - 4, y - 4, 9 * 18 + 8, 22 + 8);

  for (let i = 0; i < 9; i++) {
    const item = inventory.slots[i];
    const slotX = x + i * 18;
    const slotY = y;
    drawSlot(ctx, slotX, slotY, item, itemTextures);
  }

  // Highlight selected slot (assuming bot.heldItem slot)
  const selected = inventory.selectedSlot || 0;
  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + selected * 18 - 2, y - 2, 22, 22);
}

module.exports = { drawHotbar };