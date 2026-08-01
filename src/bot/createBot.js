// minecraft/createBot.js
const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const { plugin: pvp } = require('mineflayer-pvp');
const armorManager = require('mineflayer-armor-manager');
const state = require('./state');
const { configureAutoEat } = require('./autoEat');
const { configurePathfinder, startFollowing, startBridge } = require('./movement');
const { registerEvents } = require('./events');
const { maybeStartRejoinCycle, safeKill } = require('./reconnect');
const { startAntiAfk } = require('./antiAfk');
const { statusEmbed } = require('../discord/embeds');
const { initSleep, sleepWithPlayer } = require('./sleep');
const { avoidCreepers } = require('./creeper');
const { startShield } = require("./shield");
const { startDashboardUpdater } = require('../dashboard/updater');



async function createBot() {
  if (state.isConnecting) return;
  state.isConnecting = true;

  // Kill existing bot
  if (state.currentBot) {
    safeKill(state.currentBot);
    state.currentBot = null;
  }

  // Load auto-eat plugin dynamically
 // Load auto-eat plugin
let autoeat;

try {
  autoeat = require("mineflayer-auto-eat").plugin;
  console.log("[AutoEat] Plugin found.");
} catch (err) {
  console.error("[AutoEat] Failed to load:", err.message);
}

  const bot = mineflayer.createBot({
    host: process.env.MC_HOST,
    port: parseInt(process.env.MC_PORT) || 21028,
    username: process.env.MC_USERNAME || 'BridgeBot',
    auth: process.env.MC_AUTH === 'microsoft' ? 'microsoft' : 'offline',
    version: '1.16.5',
    viewDistance: 'tiny',
    physicsEnabled: true,
    connectTimeout: 30000,
    checkTimeoutInterval: 120000,
  });

  state.currentBot = bot;

  // Load plugins
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  if (autoeat) {
   bot.loadPlugin(autoeat);
   console.log("Has autoEat:", !!bot.autoEat);

if (bot.autoEat) {
    console.log("AutoEat methods:", Object.keys(bot.autoEat));
}

console.log("[AutoEat] Plugin loaded.");
console.log("bot.autoEat =", bot.autoEat);
console.log("Keys containing 'eat':",
    Object.keys(bot).filter(k => k.toLowerCase().includes("eat"))
);
  }
  bot.on('login', () => {
  console.log('[Minecraft] Logged into server.');
});

bot.on('spawn', () => {
  console.log('[Minecraft] Spawned successfully.');
});

bot.on('kicked', (reason, loggedIn) => {
  console.log('========== KICKED ==========');
  console.log(reason);
  console.log('Logged In:', loggedIn);
  console.log('============================');
});

bot.on('error', (err) => {
  console.log('========== ERROR ==========');
  console.log(err);
  console.log('===========================');
});


  // --- Spawn event ---
  bot.once('spawn', () => {
    state.isConnecting = false;
    console.log('[Minecraft] 🐺 Fresh Instance Spawned!');
    state.reconnectDelay = 5_000;
    state.wasConnected = true;
    state.reconnectSuppressed = false;

    state.sendEmbedFn?.(statusEmbed(true), state.getStatusTarget());

    // Configure modules
    configurePathfinder(bot);
    configureAutoEat(bot);

    if (process.env.FEATURE_ANTI_AFK === 'true') startAntiAfk(bot);
    maybeStartRejoinCycle();
    startFollowing(bot);

    setInterval(() => {
    avoidCreepers(bot);
}, 1000);

startShield(bot);

const THREAD_ID = process.env.DISCORD_DASHBOARD_THREAD_ID;

if (state.discordClient && THREAD_ID) {
    startDashboardUpdater(
        bot,
        state.discordClient,
        THREAD_ID,
        5000
    );

    console.log("[Dashboard] Started.");
}

const player = bot.nearestEntity(
  e => e.type === 'player' && e.username !== bot.username
);

if (player) {
  initSleep(bot, player.username);
  console.log(`[Sleep] Following ${player.username}`);
}setInterval(() => {
  sleepWithPlayer();
}, 5000);
  });

  // Register all other event listeners
  registerEvents(bot);

  return bot;
}

module.exports = { createBot };