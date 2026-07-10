// Zalcon — guildMemberRemove (leave message + invite counter decrement)
import { config } from '#config';
import { db } from '#dbManager';
import { logger } from '#utils';
import { resolveInviteVariables, getUserInviteCount } from '#utils';

export const name = 'guildMemberRemove';

export async function execute(member, client) {
    if (!member.guild) return;
    const guild = member.guild;

    // Decrement the inviter's invite counter (a leave counts against their total)
    try {
        const record = db.memberInviter.get(guild.id, member.id);
        if (record && record.inviterId) {
            db.userInviteCounter.incrementLeave(guild.id, record.inviterId);
        }
    } catch (e) {
        logger.error('Invites', `Leave counter failed in ${guild.id}`, e?.message || e);
    }

    // Resolve inviter for variable resolution
    let inviterMember = null;
    let inviterUser = null;
    try {
        const record = db.memberInviter.get(guild.id, member.id);
        if (record && record.inviterId) {
            inviterUser = await client.users.fetch(record.inviterId).catch(() => null);
            inviterMember = await guild.members.fetch(record.inviterId).catch(() => null);
        }
    } catch {}

    const inviteData = inviterUser ? await getUserInviteCount(guild.id, inviterUser.id) : { total: 0, joins: 0, left: 0, fake: 0, rejoins: 0 };

    // ---- Leave message ----
    try {
        const leaveChannelId = db.guild.getLeaveChannel(guild.id);
        const leaveMessage = db.guild.getLeaveMessage(guild.id);
        if (leaveChannelId && leaveMessage) {
            const channel = guild.channels.cache.get(leaveChannelId);
            if (channel?.isTextBased?.()) {
                const content = resolveInviteVariables(leaveMessage, {
                    member, inviter: inviterMember || inviterUser, inviteData, guild,
                });
                channel.send({ content: content.slice(0, 2000) }).catch(() => null);
            }
        }
    } catch (e) {
        logger.error('Greet', `Leave message failed in ${guild.id}`, e?.message || e);
    }

    // We keep the memberInviter record so that a rejoin is detected correctly.
}

export default { name, execute };
