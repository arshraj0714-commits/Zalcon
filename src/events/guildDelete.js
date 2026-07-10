// Zalcon — guildDelete (clear invite cache when leaving a guild)
import { logger } from '#utils';

export const name = 'guildDelete';

export async function execute(guild, client) {
    logger.info('Guilds', `Left guild: ${guild.name} (${guild.id})`);
    client.inviteCache.delete(guild.id);
}

export default { name, execute };
