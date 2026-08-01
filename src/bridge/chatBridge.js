//  chatBridge.js — connects Discord ↔ Minecraft
// ─────────────────────────────────────────────npm 

const {
  handlePlayers, handlePos, handleHealth,
  handleSay, handleStartServer, handleStopServer, handleReconnect, handleDisconnect,
} = require('../discord/commands');

const { getBot, reconnect, disconnectAndPauseRejoin, isBotOnline } = require('../bot/index.js');
const { EmbedBuilder } = require('discord.js');
const { EMOJI, EMBED_COLOR } = require('../utils/formatters');

// USE NATIVE NET (No libraries to break, no "not a function" errors) 
const net = require('net');

const PREFIX = process.env.COMMAND_PREFIX || '!';
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

/**
 * Checks if the actual Minecraft server port is open.
 */
function checkServerStatus() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const port = parseInt(process.env.MC_PORT) || 21028;
    const host = process.env.MC_HOST || '127.0.0.1';

    socket.setTimeout(2000); // 2 second timeout

    socket.once('connect', () => {
      socket.destroy();
      resolve(true); // Server is actually online
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false); // Server is not responding
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false); // Server is closed/offline
    });

    socket.connect(port, host);
  });
}

function setupBridge(discordClient, sendEmbed) {

  // ── Slash commands ──────────────────────────
  discordClient.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const bot = getBot();
    const { commandName, member } = interaction;

    await interaction.deferReply(); 
    let embed;

    if (commandName === 'reconnect') {
      const isUp = await checkServerStatus();
      if (isUp) {
        embed = handleReconnect(member, reconnect);
      } else {
        embed = dumbfuckEmbed();
        reconnect(); 
      }
    } else {
      // General commands check bot status
      switch (commandName) {
        case 'players': embed = isBotOnline() ? handlePlayers(bot) : notConnectedEmbed(); break;
        case 'pos': embed = isBotOnline() ? handlePos(bot) : notConnectedEmbed(); break;
        case 'health': embed = isBotOnline() ? handleHealth(bot) : notConnectedEmbed(); break;
        case 'say': embed = isBotOnline() ? handleSay(bot, interaction.options.getString('message')) : notConnectedEmbed(); break;
        case 'startserver': embed = handleStartServer(member, () => setTimeout(reconnect, 10000)); break;
        case 'stopserver': embed = isBotOnline() ? handleStopServer(member, bot) : notConnectedEmbed(); break;
        case 'disconnect': embed = isBotOnline() ? handleDisconnect(member, disconnectAndPauseRejoin) : notConnectedEmbed(); break;
      }
    }

    if (embed) await interaction.editReply({ embeds: [embed] });
  });

  // ── Prefix commands ─────────────────────────
  discordClient.on('messageCreate', async (msg) => {
    if (msg.author.bot || msg.channelId !== CHANNEL_ID) return;
    const content = msg.content.trim();
    if (!content.startsWith(PREFIX)) {
        if (isBotOnline()) {
            const sender = msg.member?.displayName || msg.author.username;
            getBot().chat(`[DC] ${sender}: ${content.slice(0, 200)}`);
        }
        return;
    }

    const [cmd, ...args] = content.slice(PREFIX.length).trim().split(/\s+/);
    const bot = getBot();

    switch (cmd.toLowerCase()) {
      case 'reconnect': {
        const isUp = await checkServerStatus();
        if (isUp) {
          msg.reply({ embeds: [handleReconnect(msg.member, reconnect)] });
        } else {
          msg.reply({ embeds: [dumbfuckEmbed()] });
          reconnect(); 
        }
        break;
      }
      case 'players': msg.reply({ embeds: [isBotOnline() ? handlePlayers(bot) : notConnectedEmbed()] }); break;
      case 'pos': msg.reply({ embeds: [isBotOnline() ? handlePos(bot) : notConnectedEmbed()] }); break;
      case 'health': msg.reply({ embeds: [isBotOnline() ? handleHealth(bot) : notConnectedEmbed()] }); break;
      case 'startserver': msg.reply({ embeds: [handleStartServer(msg.member, () => setTimeout(reconnect, 10000))] }); break;
      case 'stopserver': msg.reply({ embeds: [isBotOnline() ? handleStopServer(msg.member, bot) : notConnectedEmbed()] }); break;
      case 'disconnect': msg.reply({ embeds: [isBotOnline() ? handleDisconnect(msg.member, disconnectAndPauseRejoin) : notConnectedEmbed()] }); break;
    }
  });
}

// ── Helper embeds ──────────────────────────────────────

function notConnectedEmbed() {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.disconnect)
    .setDescription(`${EMOJI.disconnect} server is offline, start the server first`);
}

function dumbfuckEmbed() {
  return new EmbedBuilder()
    .setColor(0xFF0000) 
    .setTitle('❌ Server Offline')
    .setDescription('server is offline dumbfuck start the server first');
}

module.exports = { setupBridge };