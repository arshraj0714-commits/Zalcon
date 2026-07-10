// Zalcon — inviteCreate (keep invite cache fresh)
export const name = 'inviteCreate';

export async function execute(invite, client) {
    if (!invite.guild) return;
    try {
        const cached = client.inviteCache.get(invite.guild.id);
        if (cached) cached.set(invite.code, invite);
    } catch {}
}

export default { name, execute };
