// ─────────────────────────────────────────────
//  formatters.js — MC color codes + emoji map
// ─────────────────────────────────────────────

// Minecraft § formatting codes → Discord markdown
const MC_TO_DISCORD = {
  '§l': '**',   // bold
  '§o': '_',    // italic
  '§n': '__',   // underline
  '§m': '~~',   // strikethrough
  '§r': '',     // reset
  '§k': '',     // obfuscated (ignore)
};

// Strip ALL MC formatting codes (colors + styles) for clean plain text
function stripFormatting(text) {
  return text.replace(/§[0-9a-fklmnor]/gi, '').trim();
}

// Convert MC bold/italic/etc to Discord markdown, strip color codes
function mcToDiscord(text) {
  let result = text;
  // Strip color codes (§0-§f, §9, etc.) — Discord can't render these
  result = result.replace(/§[0-9a-f]/gi, '');
  // Convert style codes to Discord markdown
  for (const [code, md] of Object.entries(MC_TO_DISCORD)) {
    result = result.replaceAll(code, md);
  }
  return result.trim();
}

// Player avatar URL from mc-heads.net
// Works for both online (UUID-based) and offline (name-based) players
function getAvatarUrl(username) {
  return `https://mc-heads.net/avatar/${username}/64`;
}

// Emoji for each event type
const EMOJI = {
  chat:       '💬',
  death:      '💀',
  join:       '✅',
  leave:      '🚪',
  whisper:    '📩',
  broadcast:  '📢',
  connect:    '🔗',
  disconnect: '🔌',
  error:      '⚠️',
  admin:      '🛡️',
  start:      '🚀',
  stop:       '🛑',
  health:     '❤️',
  pos:        '📍',
  players:    '👥',
};

// Color per event type (Discord embed sidebar color, as hex int)
const EMBED_COLOR = {
  chat:       0x5865F2,   // Discord blurple
  death:      0xFF0000,   // red
  join:       0x57F287,   // green
  leave:      0xFEE75C,   // yellow
  whisper:    0xEB459E,   // pink
  broadcast:  0xFF8C00,   // orange
  connect:    0x57F287,   // green
  disconnect: 0xED4245,   // red
  admin:      0xFEE75C,   // yellow
};

module.exports = {
  stripFormatting,
  mcToDiscord,
  getAvatarUrl,
  EMOJI,
  EMBED_COLOR,
};
