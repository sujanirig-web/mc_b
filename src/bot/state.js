// minecraft/state.js
const state = {
  currentBot: null,
  reconnectDelay: 5_000,
  cycleInterval: null,
  followInterval: null,
  currentFollowTarget: null,
  reconnectTimer: null,
  reconnectRequested: false,
  reconnectRequestedTimeout: null,
  reconnectSuppressed: false,
  wasConnected: false,
  isRejoinCycle: false,
  isConnecting: false,

  // Discord integration
  sendEmbedFn: null,
  discordClient: null,
};

// Getters / setters (avoid accidental reassignment)
module.exports = {
  get currentBot() { return state.currentBot; },
  set currentBot(bot) { state.currentBot = bot; },

  get reconnectDelay() { return state.reconnectDelay; },
  set reconnectDelay(val) { state.reconnectDelay = val; },

  get cycleInterval() { return state.cycleInterval; },
  set cycleInterval(val) { state.cycleInterval = val; },

  get followInterval() { return state.followInterval; },
  set followInterval(val) { state.followInterval = val; },

  get currentFollowTarget() { return state.currentFollowTarget; },
  set currentFollowTarget(val) { state.currentFollowTarget = val; },

  get reconnectTimer() { return state.reconnectTimer; },
  set reconnectTimer(val) { state.reconnectTimer = val; },

  get reconnectRequested() { return state.reconnectRequested; },
  set reconnectRequested(val) { state.reconnectRequested = val; },

  get reconnectRequestedTimeout() { return state.reconnectRequestedTimeout; },
  set reconnectRequestedTimeout(val) { state.reconnectRequestedTimeout = val; },

  get reconnectSuppressed() { return state.reconnectSuppressed; },
  set reconnectSuppressed(val) { state.reconnectSuppressed = val; },

  get wasConnected() { return state.wasConnected; },
  set wasConnected(val) { state.wasConnected = val; },

  get isRejoinCycle() { return state.isRejoinCycle; },
  set isRejoinCycle(val) { state.isRejoinCycle = val; },

  get isConnecting() { return state.isConnecting; },
  set isConnecting(val) { state.isConnecting = val; },

  get sendEmbedFn() { return state.sendEmbedFn; },
  set sendEmbedFn(fn) { state.sendEmbedFn = fn; },

  get discordClient() { return state.discordClient; },
  set discordClient(client) { state.discordClient = client; },

  // Helper to get the target channel/thread for status embeds
  getStatusTarget() {
    return this.isRejoinCycle && process.env.DISCORD_REJOIN_THREAD_ID
      ? process.env.DISCORD_REJOIN_THREAD_ID
      : process.env.DISCORD_CHANNEL_ID;
  },
};