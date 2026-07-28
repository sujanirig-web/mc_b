// ─────────────────────────────────────────────
//  embeds.js — Discord embed builders
// ─────────────────────────────────────────────

const { EmbedBuilder } = require('discord.js');
const { getAvatarUrl, EMBED_COLOR, EMOJI } = require('../utils/formatters');

// Chat message embed — shows player avatar + message
function chatEmbed(username, message) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.chat)
    .setAuthor({
      name: `${username}`,
      iconURL: getAvatarUrl(username),
    })
    .setDescription(message)
    .setTimestamp();
}

// Death message embed
function deathEmbed(deathMessage) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.death)
    .setAuthor({ name: `${EMOJI.death} Death` })
    .setDescription(`\`${deathMessage}\``)
    .setTimestamp();
}

// Player joined embed
function joinEmbed(username) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.join)
    .setAuthor({
      name: `${EMOJI.join} ${username} joined the server`,
      iconURL: getAvatarUrl(username),
    })
    .setTimestamp();
}

// Player left embed
function leaveEmbed(username) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.leave)
    .setAuthor({
      name: `${EMOJI.leave} ${username} left the server`,
      iconURL: getAvatarUrl(username),
    })
    .setTimestamp();
}

// Server broadcast / ops message embed
function broadcastEmbed(message) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.broadcast)
    .setAuthor({ name: `${EMOJI.broadcast} Server Broadcast` })
    .setDescription(`\`${message}\``)
    .setTimestamp();
}

// Whisper embed — someone /tell'd the bot
function whisperEmbed(username, message) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR.whisper)
    .setAuthor({
      name: `${EMOJI.whisper} Whisper from ${username}`,
      iconURL: getAvatarUrl(username),
    })
    .setDescription(`\`${message}\``)
    .setTimestamp();
}

// Bot connect / disconnect status embed
function statusEmbed(connected, reason = '') {
  const type = connected ? 'connect' : 'disconnect';
  return new EmbedBuilder()
    .setColor(EMBED_COLOR[type])
    .setDescription(
      connected
        ? `${EMOJI.connect} **Bot connected to Minecraft.**`
        : `${EMOJI.disconnect} **Bot disconnected.** ${reason ? `\nReason: \`${reason}\`` : ''}`
    )
    .setTimestamp();
}

module.exports = {
  chatEmbed,
  deathEmbed,
  joinEmbed,
  leaveEmbed,
  broadcastEmbed,
  whisperEmbed,
  statusEmbed,
};
