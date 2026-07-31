// src/dashboard/xp.js
function drawXP(ctx, experience, x, y, width) {
  // experience is a float 0-1
  const barWidth = Math.min(width, 200);
  const barHeight = 10;

  // Background
  ctx.fillStyle = '#404040';
  ctx.fillRect(x, y, barWidth, barHeight);

  // Fill
  ctx.fillStyle = '#55ffff';
  ctx.fillRect(x, y, barWidth * experience, barHeight);

  // Border
  ctx.strokeStyle = '#202020';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, barWidth, barHeight);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px "Minecraft"';
  ctx.fillText(`XP: ${Math.round(experience * 100)}%`, x + barWidth + 8, y + 8);
}

module.exports = { drawXP };