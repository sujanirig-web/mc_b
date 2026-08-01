// src/bot/autoEat.js

const { State, getState, setState } = require("./brain");

let configured = false;
let inventoryInterval = null;

function configureAutoEat(bot) {
  if (!bot.autoEat) {
    console.log("[AutoEat] Plugin not loaded.");
    return;
  }

  // Prevent configuring twice
  if (configured) return;
  configured = true;

  // =============================
  // AutoEat Options
  // =============================
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

  bot.autoEat.enable();

  console.log("[AutoEat] Enabled.");

  // Enable again after inventory sync
  bot.once("spawn", () => {
    setTimeout(() => {
      if (bot.autoEat) {
        bot.autoEat.enable();
        console.log("[AutoEat] Re-enabled after spawn.");
      }
    }, 3000);
  });

  // =============================
  // Prevent eating while busy
  // =============================

  bot.on("physicsTick", () => {

    if (!bot.autoEat) return;

    const state = getState();

    const blocked =
      state === State.PVP ||
      state === State.ESCAPE ||
      state === State.BRIDGE ||
      state === State.SLEEP;

    if (blocked) {
      bot.autoEat.disable();
    } else {
      bot.autoEat.enable();
    }
  });

  // =============================
  // Events
  // =============================

  bot.on("autoeat_started", () => {

    if (getState() !== State.EAT) {
      setState(State.EAT);
    }

    console.log("[AutoEat] Started eating...");
  });

  bot.on("autoeat_finished", () => {

    if (getState() === State.EAT) {
      setState(State.FOLLOW);
    }

    console.log("[AutoEat] Finished eating.");
  });

  bot.on("autoeat_error", err => {

    if (getState() === State.EAT) {
      setState(State.FOLLOW);
    }

    console.log("[AutoEat] Error:", err.message);
  });

  // =============================
  // Health Logging
  // =============================

  let lastHealth = -1;
  let lastFood = -1;

  bot.on("health", () => {

    if (
      bot.health === lastHealth &&
      bot.food === lastFood
    ) {
      return;
    }

    lastHealth = bot.health;
    lastFood = bot.food;

    console.log(
      `[Health] ❤ ${bot.health}/20 | 🍗 ${bot.food}/20`
    );
  });

  // =============================
  // Inventory Debug (30 sec)
  // =============================

  if (inventoryInterval)
    clearInterval(inventoryInterval);

  inventoryInterval = setInterval(() => {

    const foods = bot.inventory.items()
      .filter(i => i.foodPoints != null);

    if (!foods.length) {
      console.log("[AutoEat] No edible food.");
      return;
    }

    console.log("[AutoEat] Food:");

    for (const food of foods) {
      console.log(
        ` - ${food.name} x${food.count}`
      );
    }

  }, 30000);

  // =============================
  // Cleanup
  // =============================

  bot.once("end", () => {

    if (inventoryInterval) {
      clearInterval(inventoryInterval);
      inventoryInterval = null;
    }

    configured = false;
  });
}

module.exports = {
  configureAutoEat
};