// Zalcon — inviteDelete (keep invite cache fresh)
export const name = 'inviteDelete';

export async function execute(invite, client) {
    if (!invite.guild) return;
    try {
        const cached = client.inviteCache.get(invite.guild.id);
        if (cached) cached.delete(invite.code);
    } catch {}
}

export default { name, execute };
