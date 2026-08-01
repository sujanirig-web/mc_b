// ─────────────────────────────────────────────
// embeds.js — Discord embed builders
// Modernized & consistent embed styling
// ─────────────────────────────────────────────

const { EmbedBuilder } = require('discord.js');
const {
  getAvatarUrl,
  EMBED_COLOR,
  EMOJI,
} = require('../utils/formatters');

// ---- Extended colors & emojis for new event types ----
const COLOR = {
  ...EMBED_COLOR,
  advancement: 0xF1C40F, // gold
  goal: 0x2ECC71,        // green
  challenge: 0xE67E22,   // orange
  action: 0x8E44AD,      // purple
  system: 0x95A5A6,      // grey
};

const EMOJIS = {
  ...EMOJI,
  advancement: '🏆',
  goal: '🎯',
  challenge: '⚔️',
  action: '💬',
  system: '📢',
};

/**
 * Base embed with consistent footer and timestamp.
 */
function baseEmbed(color, options = {}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setFooter({
      text: 'MC Bridge • Discord ↔ Minecraft',
    })
    .setTimestamp();

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.author) embed.setAuthor(options.author);
  if (options.fields) embed.addFields(options.fields);

  return embed;
}

// ---- Core embed builders (unchanged signatures) ----

function chatEmbed(username, message) {
  return baseEmbed(COLOR.chat, {
    author: {
      name: username,
      iconURL: getAvatarUrl(username),
    },
    description: message,
  });
}

function deathEmbed(deathMessage) {
  return baseEmbed(COLOR.death, {
    title: `${EMOJIS.death} Player Death`,
    description: deathMessage,
  });
}

function joinEmbed(username) {
  return baseEmbed(COLOR.join, {
    title: `${EMOJIS.join} Player Joined`,
    author: {
      name: username,
      iconURL: getAvatarUrl(username),
    },
    description: `**${username}** joined the Minecraft server.`,
  });
}

function leaveEmbed(username) {
  return baseEmbed(COLOR.leave, {
    title: `${EMOJIS.leave} Player Left`,
    author: {
      name: username,
      iconURL: getAvatarUrl(username),
    },
    description: `**${username}** left the Minecraft server.`,
  });
}

function broadcastEmbed(message) {
  return baseEmbed(COLOR.broadcast, {
    title: `${EMOJIS.broadcast} Server Broadcast`,
    description: message,
  });
}

function whisperEmbed(username, message) {
  return baseEmbed(COLOR.whisper, {
    title: `${EMOJIS.whisper} Private Message`,
    author: {
      name: username,
      iconURL: getAvatarUrl(username),
    },
    fields: [
      { name: 'From', value: username, inline: true },
      { name: 'Message', value: message },
    ],
  });
}

function statusEmbed(connected, reason = '') {
  if (connected) {
    return baseEmbed(COLOR.connect, {
      title: `${EMOJIS.connect} Bot Online`,
      description: 'Successfully connected to the Minecraft server.',
    });
  }

  const embed = baseEmbed(COLOR.disconnect, {
    title: `${EMOJIS.disconnect} Bot Offline`,
    description: 'The bot has disconnected from the Minecraft server.',
  });

  if (reason) {
    embed.addFields({ name: 'Reason', value: `\`${reason}\`` });
  }

  return embed;
}

// ---- New embed builders for additional event types ----

function advancementEmbed(username, advancement) {
  return baseEmbed(COLOR.advancement, {
    title: `${EMOJIS.advancement} Advancement`,
    author: {
      name: username,
      iconURL: getAvatarUrl(username),
    },
    description: `**${username}** has made the advancement **${advancement}**.`,
  });
}

function goalEmbed(username, goal) {
  return baseEmbed(COLOR.goal, {
    title: `${EMOJIS.goal} Goal Achieved`,
    author: {
      name: username,
      iconURL: getAvatarUrl(username),
    },
    description: `**${username}** has achieved **${goal}**.`,
  });
}

function challengeEmbed(username, challenge) {
  return baseEmbed(COLOR.challenge, {
    title: `${EMOJIS.challenge} Challenge Completed`,
    author: {
      name: username,
      iconURL: getAvatarUrl(username),
    },
    description: `**${username}** has completed the challenge **${challenge}**.`,
  });
}

function actionEmbed(username, action) {
  return baseEmbed(COLOR.action, {
    title: `${EMOJIS.action} Action`,
    author: {
      name: username,
      iconURL: getAvatarUrl(username),
    },
    description: `*${username} ${action}*`,
  });
}

function systemEmbed(message) {
  return baseEmbed(COLOR.system, {
    title: `${EMOJIS.system} System Message`,
    description: message,
  });
}

module.exports = {
  chatEmbed,
  deathEmbed,
  joinEmbed,
  leaveEmbed,
  broadcastEmbed,
  whisperEmbed,
  statusEmbed,
  advancementEmbed,
  goalEmbed,
  challengeEmbed,
  actionEmbed,
  systemEmbed,
};