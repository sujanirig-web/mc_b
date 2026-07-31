// src/dashboard/items.js
const { loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

const textureCache = {};

/**
 * Loads all item textures from assets/items/ folder.
 * Returns a map: { 'diamond_sword': Image, ... }
 */
async function loadItemTextures() {
  const itemsDir = path.join(__dirname, '../assets/items');
  if (!fs.existsSync(itemsDir)) {
    console.warn('[Dashboard] Items folder not found. Using fallback.');
    return {};
  }

  const files = fs.readdirSync(itemsDir).filter(f => f.endsWith('.png'));
  for (const file of files) {
    const name = path.basename(file, '.png');
    if (!textureCache[name]) {
      textureCache[name] = await loadImage(path.join(itemsDir, file));
    }
  }
  return textureCache;
}

module.exports = { loadItemTextures };