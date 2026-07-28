const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalFollow } } = require('mineflayer-pathfinder');
const { plugin: pvp } = require('mineflayer-pvp');
const armorManager = require('mineflayer-armor-manager');

const { startAntiAfk, stopAntiAfk } = require('./antiAfk');
const {
  chatEmbed, deathEmbed, joinEmbed, leaveEmbed,
  broadcastEmbed, statusEmbed,
} = require('../discord/embeds');
const { stripFormatting, mcToDiscord } = require('../utils/formatters');

// --- Global Variables ---
let reconnectDelay = 5_000;
let currentBot = null;
let cycleInterval = null;
let followInterval = null;
let currentFollowTarget =null;
let reconnectTimer = null; 
let reconnectRequested = false;
let reconnectRequestedTimeout = null;
let reconnectSuppressed = false; 
let wasConnected = false;
let isRejoinCycle = false;
let isConnecting = false;

let sendEmbedFn = null;
let discordClient = null;

function init(dcClient, embedFn) {
  discordClient = dcClient;
  sendEmbedFn = embedFn;
  createBot(); 
  return null;
}

function getStatusTarget() {
  if (isRejoinCycle && process.env.DISCORD_REJOIN_THREAD_ID) {
    return process.env.DISCORD_REJOIN_THREAD_ID;
  }
  return process.env.DISCORD_CHANNEL_ID;
}

function isBotOnline() {
  return currentBot !== null && wasConnected === true;
}

// --- IMPROVED REFRESH LOGIC ---
function safeKill(botInstance) {
  if (!botInstance) return;
  
  // 1. Clear all intervals to stop "ghost" logic
  if (followInterval) {
    clearInterval(followInterval);
    followInterval = null;
  }

  currentFollowTarget = null;
  if (botInstance.pathfinder) {
  botInstance.pathfinder.setGoal(null);
}
  
  
  // 2. Remove all event listeners to clear memory cache
  botInstance.removeAllListeners();
  
  // 3. Force end the connection
  botInstance.on('error', () => {}); 
  try { 
    botInstance.quit(); // 'quit' is cleaner than 'end' for most servers
  } catch (e) { /* ignore */ }
  
  console.log('[Minecraft] 🧹 Cache cleared and instance killed.');
}


function scheduleReconnect(delay) {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    if (!reconnectSuppressed && !reconnectRequested) {
      createBot();
    }
  }, delay);
}

async function createBot() {
  if (isConnecting) return;
  isConnecting = true;

  if (currentBot) {
    safeKill(currentBot);
    currentBot = null;
  }

  let autoeat;
  try {
    const autoeatModule = await import('mineflayer-auto-eat');
    autoeat = autoeatModule.default?.plugin || autoeatModule.plugin || autoeatModule.default;
  } catch (err) {
    console.error('[Minecraft] ❌ Auto-eat import failed:', err.message);
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
    checkTimeoutInterval: 120000 
  });

  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  if (typeof autoeat === 'function') bot.loadPlugin(autoeat);

  currentBot = bot;

  bot.once('spawn', () => {
    isConnecting = false;
    console.log('[Minecraft] 🐺 Fresh Instance Spawned!');
    reconnectDelay = 5_000; 
    wasConnected = true; 
    reconnectSuppressed = false; 
    
    sendEmbedFn?.(statusEmbed(true), getStatusTarget());
    
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    
    defaultMove.canDig = false; 
    defaultMove.allowParkour = true;
    defaultMove.allowSprinting = true;
    defaultMove.allowOpeningDoors = true; 
    defaultMove.canOpenDoors = true; 
    
    bot.pathfinder.setMovements(defaultMove);

    if (bot.autoEat) {
      bot.autoEat.options.priority = 'foodPoints';
      bot.autoEat.options.bannedFood = ['rotten_flesh', 'spider_eye'];
      bot.autoEat.enable(); 
    }

    if (process.env.FEATURE_ANTI_AFK === 'true') startAntiAfk(bot);
    maybeStartRejoinCycle();

    // Store interval in global variable so we can kill it on reconnect
    followInterval = setInterval(() => {
      if (
  !currentBot ||
  currentBot !== bot ||
  bot.pvp?.target ||
  bot.isSleeping ||
  !wasConnected
) return;

      const target = bot.nearestEntity(
  e => e.type === 'player' && e.username !== bot.username
);

if (!target) {
  currentFollowTarget = null;
  bot.pathfinder.setGoal(null);
  return;
}

if (currentFollowTarget !== target.username) {
  currentFollowTarget = target.username;
  bot.pathfinder.setGoal(new GoalFollow(target, 3), true);
}
    }, 1000);
  });

  // --- Combat Helper Logic ---
  bot.on('entityAttack', (attacker, victim) => {
    if (attacker.type === 'player' && attacker.username !== bot.username) {
      if (victim.type !== 'player') bot.pvp.attack(victim);
    }
  });

  bot.on('entityHurt', (entity) => {
    if (entity.type === 'player' && entity.username !== bot.username) {
      const attacker = bot.nearestEntity(e => e.type === 'mob' && e.position.distanceTo(entity.position) < 4);
      if (attacker) bot.pvp.attack(attacker);
    }
  });

  bot.on('playerCollect', (collector) => {
    if (collector.username !== bot.username) return;
    setTimeout(() => {
      const weapon = bot.inventory.items().find(i => i.name.includes('sword') || i.name.includes('axe'));
      if (weapon) bot.equip(weapon, 'hand');
    }, 500);
  });

  bot.on('time', () => {
    if (bot.time.isDay || bot.isSleeping || bot.pvp?.target) return;
    const bed = bot.findBlock({ matching: b => bot.isABed(b), maxDistance: 8 });
    if (bed) bot.sleep(bed).catch(() => {});
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return; 
    sendEmbedFn?.(chatEmbed(username, mcToDiscord(message)));
  });

  bot.on('death', () => {
    if (process.env.FEATURE_DEATHS !== 'true') return;
    const msg = bot.game?.deathMessage ? stripFormatting(bot.game.deathMessage) : `${bot.username} died.`;
    sendEmbedFn?.(deathEmbed(msg));
    bot.respawn();
  });

  bot.on('message', (jsonMsg) => {
    const text = stripFormatting(jsonMsg.toString());
    if (!text || process.env.FEATURE_BROADCASTS !== 'true') return;
    const isBroadcast = text.startsWith('[') || text.startsWith('*') || text.includes('joined') || /^\[.+\]/.test(text);
    if (isBroadcast) sendEmbedFn?.(broadcastEmbed(text));
  });

  bot.on('end', (reason) => {
    isConnecting = false;
    stopAntiAfk();
    stopRejoinCycle();
    console.log(`[Minecraft] Connection ended: ${reason}`);
    
    // Clear follow interval immediately on end
    if (followInterval) { clearInterval(followInterval); followInterval = null; }

    if (wasConnected) {
      sendEmbedFn?.(statusEmbed(false, reason), getStatusTarget());
      wasConnected = false; 
    }
    if (reconnectRequested || reconnectSuppressed) return;
    scheduleReconnect(reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 60_000); 
  });

  bot.on('error', (err) => {
  isConnecting = false;
  console.error(`[Minecraft] Critical Error: ${err.message}`);

  if (currentBot) {
    safeKill(currentBot);
    currentBot = null;
  }

  wasConnected = false;

  if (!reconnectSuppressed && !reconnectRequested) {
    scheduleReconnect(15000);
  }
});

return bot;
}

// ── Control Helpers ──
function stopRejoinCycle() { if (cycleInterval) { clearInterval(cycleInterval); cycleInterval = null; } }
function maybeStartRejoinCycle() {
  if (process.env.FEATURE_REJOIN_CYCLE !== 'true' || cycleInterval) return;
  const minutes = Number.parseFloat(process.env.REJOIN_CYCLE_MINUTES || '30'); 
  const intervalMs = Math.max(10000, Math.round(minutes * 60000));
  cycleInterval = setInterval(() => { requestReconnect('Scheduled rejoin cycle', true); }, intervalMs);
}
function requestReconnect(source, fromCycle = false) {
  reconnectSuppressed = false; 
  isRejoinCycle = fromCycle;
  if (reconnectRequestedTimeout) clearTimeout(reconnectRequestedTimeout);
  
  // Kill the old bot and all its listeners/intervals before starting new one
  if (currentBot) { safeKill(currentBot); currentBot = null; }
  
  reconnectRequested = true;
  reconnectRequestedTimeout = setTimeout(() => { reconnectRequested = false; createBot(); }, 5000);
}
function reconnect() { requestReconnect('Manual command'); }
function disconnectAndPauseRejoin() {
  reconnectSuppressed = true; stopRejoinCycle();
  if (currentBot) { safeKill(currentBot); currentBot = null; }
}

module.exports = { init, reconnect, disconnectAndPauseRejoin, getBot: () => currentBot, isBotOnline };