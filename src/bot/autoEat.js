// src/bot/autoEat.js

function configureAutoEat(bot) {
  if (!bot.autoEat) {
    console.log("[AutoEat] Plugin not loaded.");
    return;
  }

  bot.autoEat.options = {
    priority: "foodPoints",
    startAt: 18,
    bannedFood: [
      "rotten_flesh",
      "spider_eye",
      "poisonous_potato",
      "pufferfish",
      "chorus_fruit"
    ]
  };
console.log(bot.autoEat);
console.log(
  "Methods:",
  Object.getOwnPropertyNames(Object.getPrototypeOf(bot.autoEat))
);
  // Enable plugin
  bot.autoEat.enable();

  // Enable again after inventory finishes syncing
  setTimeout(() => {
    if (bot.autoEat) {
      bot.autoEat.enable();
      console.log("[AutoEat] Re-enabled after spawn.");
    }
  }, 3000);

  console.log("[AutoEat] Enabled.");

  // =========================
  // Debug Events
  // =========================

  bot.on("autoeat_started", () => {
    console.log("[AutoEat] Started eating...");
  });

  bot.on("autoeat_finished", () => {
    console.log("[AutoEat] Finished eating.");
  });

  bot.on("autoeat_error", (err) => {
    console.log("[AutoEat] Error:", err.message);
  });

  // Print health/hunger whenever it changes
  bot.on("health", () => {
    console.log(
      `[Health] HP=${bot.health} Food=${bot.food} Saturation=${bot.foodSaturation}`
    );
  });

  // Show inventory every 10 seconds
  setInterval(() => {
    const foods = bot.inventory
      .items()
      .filter(item => item.foodPoints != null);

    console.log("========== INVENTORY ==========");

    if (foods.length === 0) {
      console.log("No edible food found.");
    } else {
      foods.forEach(food => {
        console.log(`- ${food.name} x${food.count}`);
      });
    }

    console.log("===============================");
  }, 10000);
}

module.exports = {
  configureAutoEat
};