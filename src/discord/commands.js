// ─────────────────────────────────────────────
//  commands.js — all slash + prefix commands
// ─────────────────────────────────────────────

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const { EMOJI, EMBED_COLOR } = require('../utils/formatters');

// ── Helper: check if Discord member has admin role ──
function isAdmin(member) {
  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
  if (!adminRoleId) return false;
  return member.roles.cache.has(adminRoleId);
}

// ── Slash command definitions (registered on bot ready) ──
const slashCommands = [
  new SlashCommandBuilder()
    .setName('players')
    .setDescription('List players currently online in Minecraft'),

  new SlashCommandBuilder()
    .setName('pos')
    .setDescription("Show the bot's current coordinates"),

  new SlashCommandBuilder()
    .setName('health')
    .setDescription("Show the bot's current health and food level"),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message to Minecraft chat')
    .addStringOption(opt =>
      opt.setName('message').setDescription('Message to send').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('startserver')
    .setDescription('🛡️ [Admin] Start the Minecraft server'),

  new SlashCommandBuilder()
    .setName('stopserver')
    .setDescription('🛡️ [Admin] Stop the Minecraft server'),

  new SlashCommandBuilder()
    .setName('reconnect')
    .setDescription('🛡️ [Admin] Force bot to reconnect to Minecraft'),

  new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('🛡️ [Admin] Disconnect bot and pause 5-min rejoin'),
    new SlashCommandBuilder()
    .setName('ai')
    .setDescription('[Admin] Toggle bot AI (movement, combat, etc.)')
    .addStringOption(opt =>
      opt.setName('state').setDescription('on or off').setRequired(true)),

    
].map(cmd => cmd.toJSON());

// ── Command handlers ──
// Each handler receives (interaction_or_message, bot, isSlash)
// and returns an embed to send back.

function handlePlayers(bot) {
  const playerList = Object.keys(bot.players);
  const names = playerList.length
    ? playerList.map(p => `\`${p}\``).join(', ')
    : '_No players online._';

  return new EmbedBuilder()
    .setColor(EMBED_COLOR.chat)
    .setTitle(`${EMOJI.players} Online Players (${playerList.length})`)
    .setDescription(names)
    .setTimestamp();
}

function handlePos(bot) {
  const pos = bot.entity?.position;
  if (!pos) {
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.disconnect)
      .setDescription(`${EMOJI.error} Bot position unavailable.`);
  }

  return new EmbedBuilder()
    .setColor(EMBED_COLOR.chat)
    .setTitle(`${EMOJI.pos} Bot Position`)
    .addFields(
      { name: 'X', value: `\`${Math.floor(pos.x)}\``, inline: true },
      { name: 'Y', value: `\`${Math.floor(pos.y)}\``, inline: true },
      { name: 'Z', value: `\`${Math.floor(pos.z)}\``, inline: true },
    )
    .setTimestamp();
}

function handleHealth(bot) {
  const hp = bot.health != null ? bot.health.toFixed(1) : '?';
  const food = bot.food != null ? bot.food : '?';
  const hpBar = buildBar(bot.health ?? 0, 20, '❤️', '🖤');
  const foodBar = buildBar(bot.food ?? 0, 20, '🍗', '⬛');

  return new EmbedBuilder()
    .setColor(EMBED_COLOR.chat)
    .setTitle(`${EMOJI.health} Bot Status`)
    .addFields(
      { name: 'Health', value: `${hpBar} **${hp}/20**` },
      { name: 'Food',   value: `${foodBar} **${food}/20**` },
    )
    .setTimestamp();
}

// Build a simple bar like ❤️❤️❤️🖤🖤 out of 10 segments
function buildBar(value, max, filled, empty) {
  const segments = 10;
  const filledCount = Math.round((value / max) * segments);
  return filled.repeat(filledCount) + empty.repeat(segments - filledCount);
}

function handleSay(bot, message) {
  try {
    bot.chat(message);
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.join)
      .setDescription(`${EMOJI.chat} Sent to Minecraft: **${message}**`);
  } catch {
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.disconnect)
      .setDescription(`${EMOJI.error} Failed to send message — bot may not be connected.`);
  }
}

function handleStartServer(member, callback) {
  if (!isAdmin(member)) {
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.disconnect)
      .setDescription(`${EMOJI.error} **Access denied.** You need the admin role to use this.`);
  }

  const cmd = process.env.MC_START_CMD;
  if (!cmd) {
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.disconnect)
      .setDescription(`${EMOJI.error} \`MC_START_CMD\` is not set in your \`.env\` file.`);
  }

  // Run in background (detached), don't block bot process
  exec(cmd, { detached: true, stdio: 'ignore' }, (err) => {
    if (err) console.error('[Start Server] Error:', err.message);
  });

  if (callback) callback(); // e.g. trigger reconnect after delay

  return new EmbedBuilder()
    .setColor(EMBED_COLOR.connect)
    .setDescription(`${EMOJI.start} **Starting Minecraft server...**\nCommand: \`${cmd}\``);
}

function handleStopServer(member, bot) {
  if (!isAdmin(member)) {
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.disconnect)
      .setDescription(`${EMOJI.error} **Access denied.** You need the admin role to use this.`);
  }

  try {
    bot.chat('/stop'); // works if bot is op'd
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.disconnect)
      .setDescription(`${EMOJI.stop} **Stop command sent to server.**\nBot sent \`/stop\` — requires bot to be OP'd.`);
  } catch {
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.disconnect)
      .setDescription(`${EMOJI.error} Could not send stop command — bot may not be connected.`);
  }
}

function handleReconnect(member, reconnectFn) {
  if (!isAdmin(member)) {
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.disconnect)
      .setDescription(`${EMOJI.error} **Access denied.** You need the admin role to use this.`);
  }

  // Trigger reconnect after a short delay so embed sends first
  setTimeout(reconnectFn, 1500);

  return new EmbedBuilder()
    .setColor(EMBED_COLOR.admin)
    .setDescription(`${EMOJI.admin} **Reconnecting bot to Minecraft...**`);
}

function handleDisconnect(member, disconnectFn) {
  if (!isAdmin(member)) {
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.disconnect)
      .setDescription(`${EMOJI.error} **Access denied.** You need the admin role to use this.`);
  }

  // Trigger disconnect after a short delay so embed sends first.
  setTimeout(() => disconnectFn(), 1500);

  return new EmbedBuilder()
    .setColor(EMBED_COLOR.disconnect)
    .setDescription(`${EMOJI.disconnect} ** disconnected**`);
}
function handleAi(member, stateValue) {
  if (!isAdmin(member)) {
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.disconnect)
      .setDescription(`${EMOJI.error} **Access denied.** You need the admin role to use this.`);
  }

  const botState = require('../bot/state');
  const val = stateValue?.toLowerCase();

  if (val === 'on') {
    botState.aiEnabled = true;
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.connect)
      .setDescription(`${EMOJI.connect} **AI enabled.** Bot will now follow, fight, shield, sleep, and evade. works only with 1.16.5`);
  } else if (val === 'off') {
    botState.aiEnabled = false;
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.disconnect)
      .setDescription(`${EMOJI.disconnect} **AI disabled.** Bot will stop moving, combat, shielding, sleeping, and creeper evasion.`);
  } else {
    return new EmbedBuilder()
      .setColor(EMBED_COLOR.disconnect)
      .setDescription(`${EMOJI.error} Invalid value. Use \`!ai on\` or \`!ai off\`.`);
  }
}


module.exports = {
  slashCommands,
  handlePlayers,
  handlePos,
  handleHealth,
  handleSay,
  handleStartServer,
  handleStopServer,
  handleReconnect,
  handleDisconnect,
  handleAi,
  isAdmin,
};
