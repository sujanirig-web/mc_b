// src/dashboard/inventory.js
const { drawSlot } = require('./slot'); // we'll create a generic slot drawer

/**
 * Draws the 27-slot inventory (3 rows of 9) in the classic Minecraft style.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Inventory} inventory - Mineflayer inventory object
 * @param {number} x - top-left x
 * @param {number} y - top-left y
 * @param {object} itemTextures - loaded item textures
 */
function drawInventory(ctx, inventory, x, y, itemTextures) {
  // Background (semi-transparent)
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 8, y - 8, 176 + 16, 120 + 16); // 3 rows * 18px + spacing

  // Draw each slot (9 columns x 3 rows)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      const slotIndex = 9 + row * 9 + col; // inventory slots start at index 9 (hotbar is 0-8)
      const item = inventory.slots[slotIndex];
      const slotX = x + col * 18;
      const slotY = y + row * 18;
      drawSlot(ctx, slotX, slotY, item, itemTextures);
    }
  }

  // Optional: draw a border or label
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px "Minecraft"';
  ctx.fillText('Inventory', x, y - 14);
}

module.exports = { drawInventory };