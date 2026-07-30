function configureAutoEat(bot) {
  if (!bot.autoEat) {
    console.log("[AutoEat] Plugin not loaded.");
    return;
  }

  bot.autoEat.options = {
    priority: "saturation", // Prefer better foods
    startAt: 16,            // Eat when hunger drops below 16 (8 shanks)
    bannedFood: [
      "rotten_flesh",
      "spider_eye",
      "poisonous_potato",
      "pufferfish",
      "chorus_fruit"
    ]
  };

  bot.on("autoeat_started", () => {
    console.log("[AutoEat] Eating...");
  });

  bot.on("autoeat_finished", () => {
    console.log("[AutoEat] Finished eating.");
  });

  bot.on("autoeat_error", (err) => {
    console.log("[AutoEat] Error:", err.message);
  });

  bot.autoEat.enable();

  console.log("[AutoEat] Enabled.");
}

module.exports = {
  configureAutoEat
};