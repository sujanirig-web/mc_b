const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { slashCommands } = require('./commands');

function createDiscordClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  });
}

async function sendEmbed(client, embed, targetId = null) {
  const channelId = targetId || process.env.DISCORD_CHANNEL_ID;
  if (!channelId) return;

  try {
    // Fetch ensures the thread is found even if not in cache
    const target = await client.channels.fetch(channelId).catch(() => null);
    if (target && typeof target.send === 'function') {
      await target.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('[Discord] sendEmbed Error:', err.message);
  }
}

// IMPORTANT: These names must match what you require in index.js
module.exports = { createDiscordClient, sendEmbed };