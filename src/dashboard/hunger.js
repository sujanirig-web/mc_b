// src/dashboard/hunger.js
const { loadImage } = require('canvas');
const path = require('path');

let hungerFull = null;
let hungerHalf = null;
let hungerEmpty = null;

async function loadHunger() {

  if (hungerFull && hungerHalf && hungerEmpty) {
    return true;
  }

  const files = {
    full: path.join(__dirname, '../assets/hunger/full.png'),
    half: path.join(__dirname, '../assets/hunger/half.png'),
    empty: path.join(__dirname, '../assets/hunger/empty.png')
  };

  console.log("[Hunger] Loading:", files);

  try {

    hungerFull = await loadImage(files.full);
    hungerHalf = await loadImage(files.half);
    hungerEmpty = await loadImage(files.empty);

    console.log("[Hunger] Loaded successfully");

    return true;

  } catch (err) {

    console.error("[Hunger] Failed:", err.message);

    hungerFull = null;
    hungerHalf = null;
    hungerEmpty = null;

    return false;
  }
}


async function drawHunger(ctx, food, x, y) {

  const loaded = await loadHunger();

  // fallback if textures fail
  if (!loaded) {

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(`🍗 ${food}`, x, y + 16);

    return;
  }


  const maxFood = 10;

  for (let i = 0; i < maxFood; i++) {

    const foodValue = Math.min(
      Math.max(food - i * 2, 0),
      2
    );

    let img = hungerEmpty;

    if (foodValue === 2)
      img = hungerFull;

    else if (foodValue === 1)
      img = hungerHalf;


    ctx.drawImage(
      img,
      x + i * 18,
      y,
      18,
      18
    );
  }
}


module.exports = { drawHunger };