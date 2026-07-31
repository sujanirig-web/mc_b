// src/dashboard/renderer.js
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const { drawInventory } = require('./inventory');
const { drawArmor } = require('./armor');
const { drawHotbar } = require('./hotbar');
const { drawHearts } = require('./hearts');
const { drawHunger } = require('./hunger');
const { drawXP } = require('./xp');
const { drawPlayerSkin } = require('./player');
const { loadItemTexture } = require('./items');
const { loadFont } = require('./font');

// Configuration
const WIDTH = 420;
const HEIGHT = 500; // enough for inventory + HUD
const BACKGROUND_COLOR = '#2d2d2d';

/**
 * Main render function – generates a canvas buffer with the bot's status.
 * @param {Bot} bot - Mineflayer bot instance.
 * @param {object} options - { showInventory: boolean }
 * @returns {Promise<Buffer>}
 */
async function renderDashboard(bot, options = { showInventory: true }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Load assets (async)
  const font = await loadFont();
  const itemTextures = await loadItemTextures(); // we'll have a map

  // ---- Draw HUD elements (top part) ----
  const hudY = 20;
  // Health
  drawHearts(ctx, bot.health, 20, hudY);
  // Hunger
  drawHunger(ctx, bot.food, 20, hudY + 30);
  // XP bar
  drawXP(ctx, bot.experience, 20, hudY + 60, WIDTH - 40);
  // Armor
  drawArmor(ctx, bot.inventory, WIDTH - 120, hudY);
  // Player skin (optional)
  // drawPlayerSkin(ctx, bot, 20, hudY + 100);

  // ---- Hotbar ----
  await drawHotbar(
ctx,
bot.inventory,
34,
410,
itemTextures
);

  // ---- Inventory (if enabled) ----
  if (options.showInventory) {
    // Inventory is drawn in the middle area, below HUD, above hotbar
    const invX = 34;// centered
    const invY = 100;
    drawInventory(ctx, bot.inventory, invX, invY, itemTextures);
  }

  // ---- Add text labels (optional) ----
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px "Minecraft"';
  ctx.fillText(`Health: ${bot.health}`, 20, HEIGHT - 20);
  ctx.fillText(`Hunger: ${bot.food}`, 150, HEIGHT - 20);
  ctx.fillText(`XP: ${Math.round(bot.experience * 100)}%`, 280, HEIGHT - 20);

  // Return buffer
  return canvas.toBuffer('image/png');
}

// Helper to load all item textures (could be optimized with caching)
async function loadItemTextures() {
  // We'll load on demand in items.js; this is just a placeholder.
  return {};
}

module.exports = { renderDashboard };