require('dotenv').config();

const { createDiscordClient, sendEmbed } = require('./src/discord/client');
const { init: initMinecraft } = require('./src/bot/index.js');
const { setupBridge } = require('./src/bridge/chatBridge');
const state = require('./src/bot/state'); // <-- Added

const discordClient = createDiscordClient();

discordClient.once('ready', async () => {

  // Save Discord client so other modules (dashboard, etc.) can use it
  state.discordClient = discordClient;

  const embed = async (e, targetId) => {
    try {
      await sendEmbed(discordClient, e, targetId);
    } catch (err) {
      console.error('[Bridge Error]', err.message);
    }
  };

  initMinecraft(discordClient, embed);
  setupBridge(discordClient, embed);

  console.log('[Startup] ✅ Bridge is running!');
});

discordClient.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('[Startup] ❌ Discord login failed:', err.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  discordClient.destroy();
  process.exit(0);
});