// src/dashboard/updater.js

const { renderDashboard } = require("./renderer");
const {
  EmbedBuilder,
  AttachmentBuilder
} = require("discord.js");

let updateInterval = null;
let dashboardMessage = null;
let lastBuffer = null;
let isUpdating = false;

/**
 * Starts the Discord dashboard updater.
 *
 * Sends ONE message and edits it forever.
 */
function startDashboardUpdater(
  bot,
  discordClient,
  threadId,
  intervalMs = 5000
) {
  stopDashboardUpdater();

  updateInterval = setInterval(async () => {

    // Prevent overlapping renders
    if (isUpdating) return;

    isUpdating = true;

    try {

      const channel = await discordClient.channels.fetch(threadId);

      if (!channel) {
        isUpdating = false;
        return;
      }

      // Generate dashboard image
      const buffer = await renderDashboard(bot, {
        showInventory: true
      });

      // Skip if image didn't change
      if (lastBuffer && buffer.equals(lastBuffer)) {
        isUpdating = false;
        return;
      }

      lastBuffer = buffer;

      const attachment = new AttachmentBuilder(buffer, {
        name: "dashboard.png"
      });

      const embed = new EmbedBuilder()
        .setTitle("🎮 Minecraft Bot Dashboard")
        .setColor(0x55ff55)
        .setImage("attachment://dashboard.png")
        .setFooter({
          text: `Updated ${new Date().toLocaleTimeString()}`
        });

      // First time -> send message
      if (!dashboardMessage) {

        dashboardMessage = await channel.send({
          embeds: [embed],
          files: [attachment]
        });

        console.log("[Dashboard] Sent dashboard.");

      } else {

        // Edit same message
        try {

          await dashboardMessage.edit({
            embeds: [embed],
            files: [attachment]
          });

        } catch (err) {

          // Message deleted or inaccessible
          console.log("[Dashboard] Dashboard message missing. Recreating...");

          dashboardMessage = await channel.send({
            embeds: [embed],
            files: [attachment]
          });
        }
      }

    } catch (err) {

      console.error("[Dashboard] Update failed:", err.message);

    } finally {

      isUpdating = false;

    }

  }, intervalMs);

  console.log(
    `[Dashboard] Updater started (${intervalMs / 1000}s interval).`
  );
}

function stopDashboardUpdater() {

  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  dashboardMessage = null;
  lastBuffer = null;
  isUpdating = false;

  console.log("[Dashboard] Updater stopped.");
}

module.exports = {
  startDashboardUpdater,
  stopDashboardUpdater
};