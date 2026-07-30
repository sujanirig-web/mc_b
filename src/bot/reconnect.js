// minecraft/reconnect.js
const state = require('./state');
let createBotFn = null;

function init(createBot) {
  createBotFn = createBot;
}

function scheduleReconnect(delay) {
  if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    if (!state.reconnectSuppressed && !state.reconnectRequested) {
      createBotFn();
    }
  }, delay);
}

function stopRejoinCycle() {
  if (state.cycleInterval) {
    clearInterval(state.cycleInterval);
    state.cycleInterval = null;
  }
}

function maybeStartRejoinCycle() {
  if (process.env.FEATURE_REJOIN_CYCLE !== 'true' || state.cycleInterval) return;
  const minutes = Number.parseFloat(process.env.REJOIN_CYCLE_MINUTES || '30');
  const intervalMs = Math.max(10000, Math.round(minutes * 60000));
  state.cycleInterval = setInterval(() => {
    requestReconnect('Scheduled rejoin cycle', true);
  }, intervalMs);
}

function requestReconnect(source, fromCycle = false) {
  state.reconnectSuppressed = false;
  state.isRejoinCycle = fromCycle;
  if (state.reconnectRequestedTimeout) clearTimeout(state.reconnectRequestedTimeout);

  // Kill the current bot (if any) without triggering reconnect
  if (state.currentBot) {
    safeKill(state.currentBot);
    state.currentBot = null;
  }

  state.reconnectRequested = true;
  state.reconnectRequestedTimeout = setTimeout(() => {
    state.reconnectRequested = false;
    createBotFn();
  }, 5000);
}

function safeKill(botInstance) {
  if (!botInstance) return;

  // Clear follow interval
  const { stopFollowing } = require('./movement');
  stopFollowing();

  // Clear any pathfinder goal
  if (botInstance.pathfinder) botInstance.pathfinder.setGoal(null);

  // Remove all listeners to avoid memory leaks
  botInstance.removeAllListeners();

  // Suppress errors during quit
  botInstance.on('error', () => {});
  try { botInstance.quit(); } catch (_) {}

  console.log('[Minecraft] 🧹 Cache cleared and instance killed.');
}

function reconnect() {
  requestReconnect('Manual command');
}

function disconnectAndPauseRejoin() {
  state.reconnectSuppressed = true;
  stopRejoinCycle();
  if (state.currentBot) {
    safeKill(state.currentBot);
    state.currentBot = null;
  }
}

module.exports = {
  init,
  scheduleReconnect,
  stopRejoinCycle,
  maybeStartRejoinCycle,
  requestReconnect,
  safeKill,
  reconnect,
  disconnectAndPauseRejoin,
};