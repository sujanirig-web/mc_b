// minecraft/index.js
const state = require('./state');
const { createBot } = require('./createBot');
const reconnectModule = require('./reconnect');
const { isBotOnline, getBot } = require('./status');


function init(discordClient, sendEmbedFn) {
  state.discordClient = discordClient;
  state.sendEmbedFn = sendEmbedFn;

  reconnectModule.init(createBot);

  createBot();
}

module.exports = {
  init,
  reconnect: reconnectModule.reconnect,
  disconnectAndPauseRejoin: reconnectModule.disconnectAndPauseRejoin,
  getBot,
  isBotOnline,
};