// Zalcon — bot client
import {
    Client,
    GatewayIntentBits,
    Partials,
    Options,
    ActivityType,
} from 'discord.js';
import { config } from '#config';
import { db } from '#dbManager';
import { logger } from '#utils';
import { setClient as setEmojiClient } from '#emoji';
import { Cache } from '#classes/cache';
import { CommandHandler } from '#handlers/commandHandler';
import { EventHandler } from '#handlers/eventHandler';
import { clearAllTimers } from '#timerUtils';

export class Bot extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildMessageReactions,
            ],
            partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember],
            makeCache: Options.cacheWithLimits({
                ...Options.DefaultMakeCacheSettings,
                ReactionManager: 0,
            }),
            allowedMentions: { repliedUser: false },
        });

        this.commands = new Map();          // fullName -> Command instance
        this.commandsByPrimary = new Map();  // primaryName -> Command[]
        this.aliasMap = new Map();            // alias (lowercased) -> Command
        this.slashCommands = new Map();       // slash key -> Command
        this.cooldowns = new Map();           // `${fullName}:${userId}` -> expiresAt
        this.inviteCache = new Map();          // guildId -> Collection<code, Invite> (plain Map, no TTL)
        this.startedAt = Date.now();
    }

    async init() {
        await db.init();

        this.commandHandler = new CommandHandler(this);
        await this.commandHandler.loadCommands();

        this.eventHandler = new EventHandler(this);
        await this.eventHandler.loadEvents();

        if (!config.token || config.token === 'PUT_YOUR_BOT_TOKEN_HERE') {
            logger.error('Client', 'No bot token configured. Set TOKEN in your environment or src/config/config.js');
            process.exit(1);
        }

        await this.login(config.token);

        // Register the client with the emoji resolver so it can look up
        // custom emojis by name from any server the bot is in.
        setEmojiClient(this);
    }

    async cleanup() {
        clearAllTimers();
        try { await db.disconnect(); } catch {}
        try { this.destroy(); } catch {}
    }
}

export default Bot;
