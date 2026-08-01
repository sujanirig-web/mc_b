// minecraft/events.js
const {
  chatEmbed,
  deathEmbed,
  broadcastEmbed,
  statusEmbed,
  joinEmbed,
  leaveEmbed,
  advancementEmbed,
  goalEmbed,
  challengeEmbed,
  actionEmbed,
  whisperEmbed,
  systemEmbed,
} = require('../discord/embeds');

const { stripFormatting, mcToDiscord } = require('../utils/formatters');
const state = require('./state');
const { handleEntityAttack, handleEntityHurt, handlePlayerCollect } = require('./combat');
const { handleSleeping } = require('./movement');
const { scheduleReconnect, stopRejoinCycle, safeKill } = require('./reconnect');
const { stopAntiAfk } = require('./antiAfk');

/**
 * Classify a raw chat message and extract relevant data.
 * Returns null for messages that should be ignored (e.g., death messages).
 * Otherwise returns an object { type, data }.
 */
function classifyMessage(text) {
  if (!text) return null;

  // ---- Death messages – we skip them (handled by the 'death' event) ----
  // Check for common death patterns; if any match, we ignore the message.
  const deathPatterns = [
    / died$/i,
    / was slain by /i,
    / fell from a high place/i,
    / drowned$/i,
    / went up in flames/i,
    / burned to death/i,
    / suffocated$/i,
    / was squished by /i,
    / was shot by /i,
    / was poked to death by /i,
    / was blown up by /i,
    / was killed by /i,
    / tried to swim in lava/i,
    / was struck by lightning/i,
    / was pricked to death/i,
    / withered away/i,
    / starved to death/i,
  ];
  if (deathPatterns.some((pat) => pat.test(text))) {
    return null; // ignore, death event will handle it
  }

  // ---- Join ----
  const joinMatch = text.match(/^(.+) joined the game$/i);
  if (joinMatch) {
    return { type: 'join', data: { username: joinMatch[1] } };
  }

  // ---- Leave ----
  const leaveMatch = text.match(/^(.+) left the game$/i);
  if (leaveMatch) {
    return { type: 'leave', data: { username: leaveMatch[1] } };
  }

  // ---- Advancement ----
  const advMatch = text.match(/^(.+) has made the advancement \[(.+)\]$/i);
  if (advMatch) {
    return { type: 'advancement', data: { username: advMatch[1], advancement: advMatch[2] } };
  }

  // ---- Goal (achievement) ----
  const goalMatch = text.match(/^(.+) has achieved (.+)$/i);
  if (goalMatch) {
    return { type: 'goal', data: { username: goalMatch[1], goal: goalMatch[2] } };
  }

  // ---- Challenge ----
  const challengeMatch = text.match(/^(.+) has completed the challenge (.+)$/i);
  if (challengeMatch) {
    return { type: 'challenge', data: { username: challengeMatch[1], challenge: challengeMatch[2] } };
  }

  // ---- Whisper (private message) ----
  // Format: "From Player: message" or "[Player -> me] message"
  const whisperMatch = text.match(/^From (.+): (.+)/i) || text.match(/^\[(.+) -> me\] (.+)/i);
  if (whisperMatch) {
    return { type: 'whisper', data: { username: whisperMatch[1], message: whisperMatch[2] } };
  }

  // ---- Action (emote) ----
  const actionMatch = text.match(/^\* (.+) (.+)/);
  if (actionMatch) {
    return { type: 'action', data: { username: actionMatch[1], action: actionMatch[2] } };
  }

  // ---- Broadcast (messages starting with a tag like [Server]) ----
  if (/^\[.+\]/.test(text)) {
    // But we already caught whispers with brackets, so this is a generic broadcast
    return { type: 'broadcast', data: { message: text } };
  }

  // ---- Fallback: system message ----
  return { type: 'system', data: { message: text } };
}

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
  // Player chat – handled separately
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    state.sendEmbedFn?.(chatEmbed(username, mcToDiscord(message)));
  });

  // All other messages (join, leave, advancements, broadcasts, etc.)
  bot.on('message', (jsonMsg) => {
    const text = stripFormatting(jsonMsg.toString());
    if (!text) return;

    const result = classifyMessage(text);
    if (!result) return; // death messages are ignored here

    const { type, data } = result;
    let embed = null;

    switch (type) {
      case 'join':
        embed = joinEmbed(data.username);
        break;
      case 'leave':
        embed = leaveEmbed(data.username);
        break;
      case 'advancement':
        embed = advancementEmbed(data.username, data.advancement);
        break;
      case 'goal':
        embed = goalEmbed(data.username, data.goal);
        break;
      case 'challenge':
        embed = challengeEmbed(data.username, data.challenge);
        break;
      case 'whisper':
        embed = whisperEmbed(data.username, data.message);
        break;
      case 'action':
        embed = actionEmbed(data.username, data.action);
        break;
      case 'broadcast':
        // Only send broadcasts if feature is enabled
        if (process.env.FEATURE_BROADCASTS === 'true') {
          embed = broadcastEmbed(data.message);
        }
        break;
      case 'system':
        embed = systemEmbed(data.message);
        break;
      default:
        // Unknown – treat as system
        embed = systemEmbed(text);
    }

    if (embed) {
      state.sendEmbedFn?.(embed);
    }
  });

  // ----- Death -----
  bot.on('death', () => {
    if (process.env.FEATURE_DEATHS !== 'true') return;
    const msg = bot.game?.deathMessage
      ? stripFormatting(bot.game.deathMessage)
      : `${bot.username} died.`;
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