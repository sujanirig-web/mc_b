// src/dashboard/slot.js

const { loadImage } = require('canvas');
const path = require('path');

let slotTexture = null;
let slotLoading = null;


/**
 * Load slot texture only once
 */
async function loadSlotTextures() {

  // Already loaded
  if (slotTexture) {
    return true;
  }

  // Already loading, wait for same promise
  if (slotLoading) {
    return slotLoading;
  }


  const slotPath = path.join(
    __dirname,
    '../assets/gui/slot.png'
  );


  console.log("[Slot] Loading:", slotPath);


  slotLoading = loadImage(slotPath)
    .then(img => {

      slotTexture = img;

      console.log("[Slot] Loaded successfully");

      return true;

    })
    .catch(err => {

      console.error("[Slot] Failed:", err.message);

      slotTexture = null;

      return false;

    });


  return slotLoading;
}



/**
 * Draw inventory slot
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {Item|null} item
 * @param {Object} itemTextures
 */
async function drawSlot(ctx, x, y, item, itemTextures = {}) {


  const loaded = await loadSlotTextures();



  // Draw slot background
  if (loaded && slotTexture) {

    ctx.drawImage(
      slotTexture,
      x,
      y,
      18,
      18
    );

  } else {

    // fallback Minecraft-like slot
    ctx.fillStyle = "#555555";
    ctx.fillRect(
      x,
      y,
      18,
      18
    );

    ctx.strokeStyle = "#222222";
    ctx.strokeRect(
      x,
      y,
      18,
      18
    );
  }



  // No item
  if (!item) {
    return;
  }



  // Draw item texture
  const texture = itemTextures[item.name];


  if (texture) {

    ctx.drawImage(
      texture,
      x + 1,
      y + 1,
      16,
      16
    );


  } else {

    // Item fallback
    ctx.fillStyle = "#aaaaaa";

    ctx.fillRect(
      x + 2,
      y + 2,
      14,
      14
    );


    ctx.fillStyle = "#ffffff";
    ctx.font = '8px Arial';


    ctx.fillText(
      item.name.substring(0, 2),
      x + 3,
      y + 11
    );
  }



  // Stack count
  if (item.count > 1) {

    ctx.fillStyle = "#ffffff";
    ctx.font = '12px Arial';


    ctx.fillText(
      item.count.toString(),
      x + 10,
      y + 16
    );
  }

}


module.exports = {
  drawSlot
};