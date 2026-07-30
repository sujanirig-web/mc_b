// minecraft/events.js
const { chatEmbed, deathEmbed, broadcastEmbed, statusEmbed } = require('../discord/embeds');
const { stripFormatting, mcToDiscord } = require('../utils/formatters');
const state = require('./state');
const { handleEntityAttack, handleEntityHurt, handlePlayerCollect } = require('./combat');
const { handleSleeping } = require('./movement');
const { scheduleReconnect, stopRejoinCycle, safeKill } = require('./reconnect');
const { stopAntiAfk } = require('./antiAfk');

function registerEvents(bot) {
  // ----- Combat Events -----
  bot.on('entityAttack', (attacker, victim) => {
    handleEntityAttack(bot, attacker, victim);
  });

  bot.on('entityHurt', (entity) => {
    handleEntityHurt(bot, entity);
  });

  bot.on('playerCollect', (collector) => {
    handlePlayerCollect(bot, collector);
  });

  // ----- Time (sleep) -----
  bot.on('time', () => {
    handleSleeping(bot);
  });

  // ----- Chat / Messages -----
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    state.sendEmbedFn?.(chatEmbed(username, mcToDiscord(message)));
  });

  bot.on('message', (jsonMsg) => {
    const text = stripFormatting(jsonMsg.toString());
    if (!text || process.env.FEATURE_BROADCASTS !== 'true') return;
    const isBroadcast = text.startsWith('[') || text.startsWith('*') || text.includes('joined') || /^\[.+\]/.test(text);
    if (isBroadcast) state.sendEmbedFn?.(broadcastEmbed(text));
  });

  // ----- Death -----
  bot.on('death', () => {
    if (process.env.FEATURE_DEATHS !== 'true') return;
    const msg = bot.game?.deathMessage ? stripFormatting(bot.game.deathMessage) : `${bot.username} died.`;
    state.sendEmbedFn?.(deathEmbed(msg));
    bot.respawn();
  });

  // ----- End of connection -----
  bot.on('end', (reason) => {
    state.isConnecting = false;
    stopAntiAfk();
    stopRejoinCycle();
    const { stopFollowing } = require('./movement');
    stopFollowing();

    console.log(`[Minecraft] Connection ended: ${reason}`);

    if (state.wasConnected) {
      state.sendEmbedFn?.(statusEmbed(false, reason), state.getStatusTarget());
      state.wasConnected = false;
    }
    if (state.reconnectRequested || state.reconnectSuppressed) return;
    scheduleReconnect(state.reconnectDelay);
    state.reconnectDelay = Math.min(state.reconnectDelay * 2, 60_000);
  });

  // ----- Error -----
  bot.on('error', (err) => {
    state.isConnecting = false;
    console.error(`[Minecraft] Critical Error: ${err.message}`);

    if (state.currentBot) {
      safeKill(state.currentBot);
      state.currentBot = null;
    }

    state.wasConnected = false;

    if (!state.reconnectSuppressed && !state.reconnectRequested) {
      scheduleReconnect(15000);
    }
  });
}

module.exports = { registerEvents };