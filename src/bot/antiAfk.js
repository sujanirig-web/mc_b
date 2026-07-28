// ─────────────────────────────────────────────
//  antiAfk.js — keeps bot from being AFK kicked
// ─────────────────────────────────────────────

let afkInterval = null;

function startAntiAfk(bot) {
  if (afkInterval) return; // already running

  afkInterval = setInterval(() => {
    try {
      // Random yaw (0 to 360°), keep pitch near 0
      const yaw = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * 0.4;
      bot.look(yaw, pitch, false);

      // Swing arm occasionally
      bot.swingArm();

      // Small random jump every other tick
      if (Math.random() > 0.5) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 200);
      }
    } catch {
      // Bot may not be spawned yet — silently ignore
    }
  }, 30_000); // every 30 seconds

  console.log('[Anti-AFK] Started.');
}

function stopAntiAfk() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
    console.log('[Anti-AFK] Stopped.');
  }
}

module.exports = { startAntiAfk, stopAntiAfk };
