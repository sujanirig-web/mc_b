require('dotenv').config();
const { createDiscordClient, sendEmbed } = require('./src/discord/client');
const { init: initMinecraft } = require('./src/bot/minecraft');
const { setupBridge } = require('./src/bridge/chatBridge');

const discordClient = createDiscordClient();

// FIX: Added 'async' to the ready listener
discordClient.once('ready', async () => {
  // FIX: Wrapped in a try/catch to prevent the bot from crashing if a message fails
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