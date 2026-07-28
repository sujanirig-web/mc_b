# 🎮 MC ↔ Discord Bridge Bot

A self-hosted Minecraft ↔ Discord bridge bot that relays chat, events, and gives you full server control from Discord.

---

## ✨ Features

### 💬 Chat & Communication
- **Two-way chat bridge** — MC chat appears in Discord (rich embeds with player avatars), Discord messages appear in MC
- **Death messages** — relayed to Discord with 💀
- **Join / Leave notifications** — with player avatar
- **Server broadcasts** — ops messages and announcements relayed to 📢
- **Whisper detection** — `/tell` messages sent to bot appear in Discord

### 🎮 Commands (slash `/` and prefix `!`)
| Command | Access | Description |
|---|---|---|
| `/players` or `!players` | Everyone | List online players |
| `/pos` or `!pos` | Everyone | Bot's current coordinates |
| `/health` or `!health` | Everyone | Bot's HP and food bar |
| `/say <msg>` or `!say` | Everyone | Send message to Minecraft |
| `!help` | Everyone | Show all commands |
| `/startserver` or `!startserver` | Admin only | Start the Minecraft server |
| `/stopserver` or `!stopserver` | Admin only | Stop the Minecraft server |
| `/reconnect` or `!reconnect` | Admin only | Force bot to rejoin |

### 🤖 Bot Behavior
- **Anti-AFK** — random movement, look, arm swing every 30s
- **Auto-reconnect** — exponential backoff (5s → 10s → 20s → max 60s)
- **Offline & Microsoft auth** — configurable in `.env`
- **Discord status** — shows server IP and command prefix

---

## 📋 Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- A Discord bot token (see below)
- A Minecraft server (cracked or premium)

---

## 🚀 Setup

### Step 1 — Clone and install

```bash
git clone https://github.com/yourusername/mc-dc-bot.git
cd mc-dc-bot
npm install
```

### Step 2 — Create your Discord bot

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → give it a name
3. Go to **Bot** tab → click **Reset Token** → copy the token
4. Scroll down and enable all three **Privileged Gateway Intents**:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot` + `applications.commands`
   - Bot Permissions: `Send Messages`, `Read Messages/View Channels`, `Embed Links`
6. Copy the generated URL and invite the bot to your server

### Step 3 — Enable Developer Mode in Discord

1. Discord Settings → Advanced → **Developer Mode: ON**
2. Right-click your bridge channel → **Copy Channel ID**
3. Right-click your admin role → **Copy Role ID**

### Step 4 — Configure .env

```bash
cp .env.example .env
```

Open `.env` and fill in every value:

```env
# ── Minecraft ──
MC_HOST=your.server.ip        # IP or hostname
MC_PORT=25565                  # default Minecraft port
MC_USERNAME=BridgeBot          # bot's in-game name
MC_AUTH=offline                # offline (cracked) or microsoft (premium)
MC_VERSION=1.20.1              # match your server's version
MC_START_CMD=java -jar server.jar --nogui  # command to start server

# ── Discord ──
DISCORD_TOKEN=your_token_here
DISCORD_CHANNEL_ID=your_channel_id
DISCORD_ADMIN_ROLE_ID=your_admin_role_id
COMMAND_PREFIX=!

# ── Features ──
FEATURE_ANTI_AFK=true
FEATURE_DEATHS=true
FEATURE_JOIN_LEAVE=true
FEATURE_WHISPERS=true
FEATURE_BROADCASTS=true
```

### Step 5 — Run

```bash
node index.js
```

You should see:
```
[Startup] Starting MC ↔ Discord Bridge Bot...
[Discord] Logged in as BridgeBot#1234
[Discord] Slash commands registered.
[Minecraft] Bot spawned.
```

---

## 🔑 .env Reference

| Variable | Required | Description |
|---|---|---|
| `MC_HOST` | ✅ | Your Minecraft server IP or hostname |
| `MC_PORT` | ✅ | Server port (default: 25565) |
| `MC_USERNAME` | ✅ | Bot's in-game name (or Microsoft email if premium) |
| `MC_AUTH` | ✅ | `offline` for cracked, `microsoft` for premium |
| `MC_VERSION` | ❌ | Server version e.g. `1.20.1` (auto-detects if blank) |
| `MC_START_CMD` | ❌ | Shell command to start MC server (for `/startserver`) |
| `DISCORD_TOKEN` | ✅ | Bot token from Discord developer portal |
| `DISCORD_CHANNEL_ID` | ✅ | Channel ID where chat is bridged |
| `DISCORD_ADMIN_ROLE_ID` | ❌ | Role ID allowed to run admin commands |
| `COMMAND_PREFIX` | ❌ | Prefix for text commands (default: `!`) |
| `FEATURE_ANTI_AFK` | ❌ | `true`/`false` — random movement to avoid AFK kick |
| `FEATURE_DEATHS` | ❌ | `true`/`false` — relay death messages |
| `FEATURE_JOIN_LEAVE` | ❌ | `true`/`false` — relay join/leave events |
| `FEATURE_WHISPERS` | ❌ | `true`/`false` — relay `/tell` whispers to bot |
| `FEATURE_BROADCASTS` | ❌ | `true`/`false` — relay server broadcasts |

---

## 🛡️ Admin Commands

Admin commands require the Discord role set in `DISCORD_ADMIN_ROLE_ID`.

### `/startserver`
Runs the shell command in `MC_START_CMD` on the host machine — starts your Minecraft server. Bot will auto-reconnect 10 seconds after.

> ⚠️ The machine running this bot must be the same machine that runs your Minecraft server for this to work. If your server is on a remote VPS, you'd need SSH access.

### `/stopserver`
Sends `/stop` in-game — requires bot to be **OP'd** on the server.

### `/reconnect`
Disconnects and reconnects the bot immediately.

---

## 🔧 Microsoft Authentication

If your server is online-mode (premium), set `MC_AUTH=microsoft` in `.env`. On first run, the bot will print a URL like:

```
[Minecraft] Microsoft auth: visit https://microsoft.com/link and enter code XXXXXXXX
```

Open that URL, log in with the Minecraft account you want the bot to use, and it will authenticate automatically.

---

## 📁 Project Structure

```
mc-dc-bot/
├── src/
│   ├── bot/
│   │   ├── minecraft.js      ← mineflayer bot + all MC events
│   │   └── antiAfk.js        ← anti-AFK loop
│   ├── discord/
│   │   ├── client.js         ← discord.js setup + slash command registration
│   │   ├── embeds.js         ← all Discord embed builders
│   │   └── commands.js       ← command logic (shared by slash + prefix)
│   ├── bridge/
│   │   └── chatBridge.js     ← MC ↔ DC wiring + command routing
│   └── utils/
│       └── formatters.js     ← MC color codes, emoji map, avatar URLs
├── index.js                  ← entry point + startup validation
├── .env.example              ← template (copy to .env)
├── .env                      ← your config (never commit this!)
├── .gitignore
├── package.json
└── README.md
```

---

## 🙈 .gitignore

Make sure `.env` is ignored before pushing to GitHub:

```
node_modules/
.env
```

---

## 🐛 Troubleshooting

**Bot not relaying chat?**
- Check `DISCORD_CHANNEL_ID` is correct
- Make sure Message Content Intent is enabled in Discord dev portal

**Slash commands not showing?**
- Wait up to 1 hour for Discord to propagate globally
- Slash commands are registered on bot startup — restart the bot

**Bot keeps disconnecting?**
- Check `MC_VERSION` matches your server
- For Microsoft auth, re-run and re-authenticate

**`/startserver` does nothing?**
- `MC_START_CMD` must be set in `.env`
- The bot process must be running on the same machine as your MC server
