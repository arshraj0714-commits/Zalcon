// Zalcon — guildCreate (sync invite cache when joining a new guild)
import { logger } from '#utils';

export const name = 'guildCreate';

export async function execute(guild, client) {
    logger.info('Guilds', `Joined guild: ${guild.name} (${guild.id}) — ${guild.memberCount} members`);
    try {
        const invites = await guild.invites.fetch();
        client.inviteCache.set(guild.id, invites);
    } catch {
        // missing permissions — skip
    }
}

export default { name, execute };
