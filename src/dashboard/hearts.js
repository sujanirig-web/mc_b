// src/dashboard/hearts.js
const { loadImage } = require('canvas');
const path = require('path');

let heartFull = null;
let heartHalf = null;
let heartEmpty = null;

async function loadHearts() {

  if (heartFull && heartHalf && heartEmpty) {
    return true;
  }

  const files = {
    full: path.join(__dirname, '../assets/hearts/full.png'),
    half: path.join(__dirname, '../assets/hearts/half.png'),
    empty: path.join(__dirname, '../assets/hearts/empty.png')
  };

  console.log("[Hearts] Loading:", files);

  try {

    heartFull = await loadImage(files.full);
    heartHalf = await loadImage(files.half);
    heartEmpty = await loadImage(files.empty);

    console.log("[Hearts] Loaded successfully");

    return true;

  } catch (err) {

    console.error("[Hearts] Failed:", err.message);

    heartFull = null;
    heartHalf = null;
    heartEmpty = null;

    return false;
  }
}


/**
 * Draws health hearts (10 hearts max = 20 HP)
 */
async function drawHearts(ctx, health, x, y) {

  const loaded = await loadHearts();

  // fallback if textures fail
  if (!loaded) {

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(`♥ ${health}`, x, y + 16);

    return;
  }


  const maxHearts = 10;

  for (let i = 0; i < maxHearts; i++) {

    const heartValue = Math.min(
      Math.max(health - i * 2, 0),
      2
    );

    let img = heartEmpty;

    if (heartValue === 2)
      img = heartFull;

    else if (heartValue === 1)
      img = heartHalf;


    ctx.drawImage(
      img,
      x + i * 18,
      y,
      18,
      18
    );
  }
}


module.exports = { drawHearts };