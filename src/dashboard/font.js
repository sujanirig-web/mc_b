// src/dashboard/font.js
const { loadImage } = require('canvas');
const path = require('path');
const { registerFont } = require('canvas');

// We'll register a pixel font if available.
async function loadFont() {
  try {
    const fontPath = path.join(__dirname, '../assets/font/minecraft_font.ttf');
    registerFont(fontPath, { family: 'Minecraft' });
    return true;
  } catch (err) {
    console.warn('[Dashboard] Minecraft font not found. Using default.');
    return false;
  }
}

module.exports = { loadFont };