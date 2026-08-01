// src/bot/shield.js

const brain = require("./brain");

let shieldRaised = false;
let updateInterval = null;

/**
 * Equip shield into offhand
 */
async function equipShield(bot) {
    const shield = bot.inventory.items().find(item => item.name === "shield");

    if (!shield) return false;

    try {
        await bot.equip(shield, "off-hand");
        return true;
    } catch (err) {
        console.log("[Shield] Failed to equip:", err.message);
        return false;
    }
}

/**
 * Raise shield
 */
function raiseShield(bot) {

    if (shieldRaised) return;

    if (!bot.heldItem) return;

    shieldRaised = true;

    bot.activateItem(true);

    console.log("[Shield] Raised");
}

/**
 * Lower shield
 */
function lowerShield(bot) {

    if (!shieldRaised) return;

    shieldRaised = false;

    bot.deactivateItem();

    console.log("[Shield] Lowered");
}

/**
 * Should shield?
 */
function shouldBlock(bot) {

    if (brain.is(brain.State.ESCAPE))
        return true;

    if (brain.is(brain.State.PVP))
        return true;

    return false;
}

/**
 * Main updater
 */
function startShield(bot) {

    stopShield();

    updateInterval = setInterval(async () => {

        // Higher priority states disable shield
        if (
            brain.is(brain.State.SLEEP) ||
            brain.is(brain.State.EAT) ||
            brain.is(brain.State.BRIDGE)
        ) {

            lowerShield(bot);
            return;
        }

        // Shield missing
        const hasShield = bot.inventory.items().some(i => i.name === "shield");

        if (!hasShield) {
            lowerShield(bot);
            return;
        }

        // Equip if necessary
        if (
            !bot.inventory.slots[45] ||
            bot.inventory.slots[45].name !== "shield"
        ) {
            await equipShield(bot);
        }

        if (shouldBlock(bot))
            raiseShield(bot);
        else
            lowerShield(bot);

    }, 300);

    console.log("[Shield] Started");
}

/**
 * Stop shield manager
 */
function stopShield() {

    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }

    shieldRaised = false;
}

/**
 * Cleanup
 */
function cleanup(bot) {

    lowerShield(bot);

    stopShield();
}

module.exports = {
    startShield,
    stopShield,
    cleanup,
    raiseShield,
    lowerShield,
    equipShield
};