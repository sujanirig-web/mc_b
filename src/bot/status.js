// minecraft/status.js
const state = require('./state');

function isBotOnline() {
  return state.currentBot !== null && state.wasConnected === true;
}

function getBot() {
  return state.currentBot;
}

module.exports = { isBotOnline, getBot };