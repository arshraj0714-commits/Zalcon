# Zalcon

A feature-rich, modular Discord bot built with Discord.js — designed for invite
tracking, community management, and server automation.

> Prefix: `-`  •  Slash commands: `/`  •  Embed accent colour: `#34c5be`

---

## Features

### Invite Tracking
- Identify who invited each member
- Separate counters for **joins**, **leaves**, **rejoins**, and **fake invites**
- Custom **join and leave message channels** with rich template variables
- Manually adjust invite counts — add, remove, clear, or reset

### Giveaways
- Create giveaways with a custom prize, duration, and winner count
- End early or reroll winners
- Reaction-based entry

### Greet Messages
- Up to **3 separate greet channels** per server
- **Simple** (plain text) and **Container** (rich UI) modes
- Auto-delete after a configurable number of seconds
- Built-in variable system

### Message Tracking
- Total message counts per member
- Blacklist channels from being counted
- Manually adjust counts — add, remove, clear, or reset
- Daily and all-time leaderboards

### Leaderboards
- Invite leaderboard
- Message leaderboard (all-time and daily)
- Paginated display

### Developer
- Blacklist management (users / guilds)
- Server list

---

## Setup

**Requirements:** Node.js >= 18

```bash
# 1. Install dependencies
npm install

# 2. Configure the bot
cp .env.example .env
# Edit .env with your token, client ID, and (optionally) owner IDs

# 3. Start the bot
npm start
```

### Configuration (.env)
```
TOKEN=your_bot_token
CLIENT_ID=your_application_id
PREFIX=-
OWNER_IDS=123456789,987654321
ACTIVITY_NAME=Zalcon | -help
GLOBAL_SLASH=true
```

The bot uses a local JSON-file database under `./data/` by default, so it runs
with **zero external dependencies**. No MongoDB required.

---

## Commands

### Invites
`invites`, `inviter`, `invited`, `inviteinfo`, `addinvites`, `removeinvites`,
`clearinvites`, `resetmyinvites`, `setjoinchannel`, `setjoinmessage`,
`setleavechannel`, `setleavemessage`, `unsetjoinmessage`, `unsetleavechannel`,
`unsetleavemessage`, `unsetwelcomechannel`, `testmessage`, `variables`

### Greet
`greet`, `greetsetup`, `greetchannels`, `disablegreet`, `greetreset`, `greetvariables`

### Giveaway
`gcreate`, `gend`, `greroll`

### Messages
`messages`, `addmessages`, `removemessages`, `clearmessages`, `resetmymessages`,
`blacklistchannel`, `unblacklistchannel`, `blacklistedchannels`

### Leaderboard
`leaderboard`, `leaderboard messages`, `leaderboard dailymessages`,
`leaderboard invites`, `invitesleaderboard`

### Developer (owner-only)
`blacklist`, `serverlist`

---

## Project Structure

```
src/
├── bot.js                    Entry point
├── config/                   Bot config & emoji definitions
├── database/                 Local JSON database manager
├── events/                   Discord gateway event handlers
├── structures/
│   ├── classes/              Command, Context, Client, Cache
│   └── handlers/             Command loader, event loader, slash registration
├── utils/                    Shared utility functions
└── commands/                 All prefix & slash commands
```

---

## Support

Join the community: **[discord.gg/Yw6sTftAkh](https://discord.gg/Yw6sTftAkh)**
