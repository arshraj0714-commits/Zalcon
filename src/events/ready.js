// Zalcon — ready event
import { ActivityType } from 'discord.js';
import { config } from '#config';
import { logger } from '#utils';
import { integrityCheck } from '#utils/integrity';
import { syncEmojis } from '#utils/emojiSync';

export const name = 'clientReady';
export const once = true;

async function syncInviteCache(client) {
    let synced = 0;
    let failed = 0;
    for (const guild of client.guilds.cache.values()) {
        try {
            const invites = await guild.invites.fetch();
            client.inviteCache.set(guild.id, invites);
            synced++;
        } catch (e) {
            failed++;
            logger.warn('InviteCache', `Failed to sync invites for ${guild.name} — bot needs Manage Guild permission`);
        }
    }
    logger.info('InviteCache', `Synced invites for ${synced} guild(s)${failed > 0 ? `, ${failed} failed (missing permissions)` : ''}`);
}

// Explicitly fetch all guild emojis to ensure the cache is fully populated
async function syncEmojiCache(client) {
    let totalEmojis = 0;
    for (const guild of client.guilds.cache.values()) {
        try {
            // This forces a fetch of all emojis from each guild
            await guild.emojis.fetch();
            totalEmojis += guild.emojis.cache.size;
        } catch (e) {
            // Some guilds may not allow emoji fetch
        }
    }
    logger.info('Emoji', `Emoji cache synced — ${totalEmojis} emoji(s) across all servers`);
}

export async function execute(client) {
    const activityType = ActivityType[config.activityType] ?? ActivityType.Watching;
    client.user.setPresence({
        status: config.status,
        activities: [{ name: config.activityName, type: activityType }],
    });

    logger.success('Client', `Logged in as ${client.user.tag}`);
    logger.info('Client', `Serving ${client.guilds.cache.size} guild(s) · ${client.users.cache.size} cached user(s)`);

    // Auto-upload any missing emojis from the assets folder
    logger.info('Emoji', 'Syncing emojis...');
    await syncEmojis(client);

    // Log which custom emojis the bot found (for debugging)
    const REQUIRED_EMOJIS = [
        'falcon_arrow', 'falcon_invite', 'falcon_invites', 'falcon_msg', 'falcon_giveaway',
        'falcon_greet', 'falcon_timer', 'falcon_moderation', 'Falcon_poll',
        'falcon_utility', 'falcon_contact', 'falcon_news', 'falcon_home',
        'falcon_tick', 'falcon_cross', 'falcon_info', 'falcon_trophy',
    ];
    const found = [];
    const missing = [];
    for (const name of REQUIRED_EMOJIS) {
        const emoji = client.emojis.cache.find((e) => e.name === name);
        if (emoji) found.push(name);
        else missing.push(name);
    }
    if (found.length > 0) {
        logger.success('Emoji', `Found ${found.length}/${REQUIRED_EMOJIS.length} custom emojis: ${found.join(', ')}`);
    }
    if (missing.length > 0) {
        logger.warn('Emoji', `Missing ${missing.length} emojis: ${missing.join(', ')}`);
    }

    await integrityCheck(client);

    // Register slash commands
    if (config.clientId && config.clientId !== 'PUT_YOUR_CLIENT_ID_HERE') {
        await client.commandHandler.registerSlash();
    } else {
        logger.warn('Slash', 'No clientId configured — slash commands were NOT registered. Set CLIENT_ID in your config.');
    }

    // Sync invite cache for invite tracking
    await syncInviteCache(client);
}

export default { name, once, execute };
