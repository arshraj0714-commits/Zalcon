// Zalcon — bot configuration
// Fill in your credentials below, or provide them via environment variables.

const env = process.env;

export const config = {
    // Discord bot token (REQUIRED)
    token: env.TOKEN || env.DISCORD_TOKEN || 'PUT_YOUR_BOT_TOKEN_HERE',

    // Application / client ID of your bot (REQUIRED for slash commands)
    clientId: env.CLIENT_ID || env.APPLICATION_ID || 'PUT_YOUR_CLIENT_ID_HERE',

    // MongoDB connection URI (optional — if omitted, Zalcon uses a local
    // JSON-file database stored in ./data so the bot runs out of the box)
    mongoUri: env.MONGO_URI || env.MONGODB_URI || '',

    // Default command prefix
    prefix: env.PREFIX || '-',

    // Bot owner IDs (for developer commands like `blacklist`, `serverlist`)
    ownerIds: (env.OWNER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean),

    // Discord presence
    status: env.STATUS || 'online',
    activityType: env.ACTIVITY_TYPE || 'WATCHING', // PLAYING | STREAMING | LISTENING | WATCHING | COMPETING
    activityName: env.ACTIVITY_NAME || 'Zalcon | -help',

    // Whether to register slash commands globally (true) or per-guild (false, faster for testing)
    globalSlash: env.GLOBAL_SLASH !== 'false',

    // Invite-tracking: accounts younger than this many days are treated as "fake"
    fakeAccountAgeDays: Number(env.FAKE_ACCOUNT_AGE_DAYS || 7),

    // Default accent colour used across embeds
    accentColor: 0x34c5be,

    // Support / community invite link shown in embeds
    supportInvite: 'https://discord.gg/Yw6sTftAkh',
};

export default config;
