// Zalcon — guildMemberAdd (invite tracking + join message + greet messages)
import {
    MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    SeparatorSpacingSize, SectionBuilder, ThumbnailBuilder, MediaGalleryBuilder,
} from 'discord.js';
import { config } from '#config';
import { db } from '#dbManager';
import { logger } from '#utils';
import { resolveInviteVariables, getUserInviteCount } from '#utils';

export const name = 'guildMemberAdd';

async function findUsedInvite(guild, client) {
    let newInvites;
    try {
        newInvites = await guild.invites.fetch({ cache: false });
    } catch (e) {
        logger.warn('Invites', `Cannot fetch invites in ${guild.name} — bot needs Manage Guild permission`);
        return { usedInvite: null, vanityUsed: false, permissionError: true };
    }

    const oldInvites = client.inviteCache.get(guild.id);
    let usedInvite = null;

    if (oldInvites && oldInvites.size > 0) {
        // Check each new invite against the old cache
        for (const inv of newInvites.values()) {
            const old = oldInvites.get(inv.code);
            if (old) {
                // If uses increased, this invite was used
                if ((inv.uses ?? 0) > (old.uses ?? 0)) {
                    usedInvite = inv;
                    break;
                }
            }
        }

        // If no uses increase found on existing invites, check for deleted invites
        // (invites that existed before but are gone now — they were used up or deleted)
        if (!usedInvite) {
            for (const [code, oldInv] of oldInvites.entries()) {
                if (!newInvites.has(code)) {
                    // This invite no longer exists — it was either used up or manually deleted
                    // If it had limited uses and was close to max, it was probably used
                    usedInvite = oldInv;
                    break;
                }
            }
        }
    } else {
        logger.warn('Invites', `No cached invites for ${guild.name} — first join after startup may not be tracked. Cache will be built now.`);
    }

    // Update the cache with the fresh invite snapshot
    client.inviteCache.set(guild.id, newInvites);

    // Check vanity URL usage (only if no regular invite was used)
    let vanityUsed = false;
    if (!usedInvite && guild.vanityURLCode) {
        try {
            // If we can't determine the invite, and the guild has a vanity URL,
            // assume the member may have used it
            vanityUsed = true;
        } catch {}
    }

    return { usedInvite, vanityUsed, permissionError: false };
}

function isFake(member) {
    if (member.user.bot) return true;
    const created = member.user.createdAt;
    if (!created) return false;
    const ageDays = (Date.now() - created.getTime()) / 86400000;
    return ageDays < (config.fakeAccountAgeDays ?? 7);
}

export async function execute(member, client) {
    if (!member.guild) return;

    const guild = member.guild;
    const { usedInvite, vanityUsed, permissionError } = await findUsedInvite(guild, client);
    const inviterUser = usedInvite?.inviter ?? null;

    const existing = db.memberInviter.get(guild.id, member.id);
    const rejoin = !!existing;
    const fake = isFake(member);

    // Update inviter counter
    if (inviterUser && !vanityUsed) {
        if (rejoin) {
            db.userInviteCounter.incrementRejoin(guild.id, inviterUser.id);
        } else if (fake) {
            db.userInviteCounter.incrementFake(guild.id, inviterUser.id);
        } else {
            db.userInviteCounter.incrementJoin(guild.id, inviterUser.id);
        }
        logger.info('Invites', `${member.user.tag} joined ${guild.name} — invited by ${inviterUser.tag} (${rejoin ? 'rejoin' : fake ? 'fake' : 'join'})`);
    } else if (vanityUsed) {
        logger.info('Invites', `${member.user.tag} joined ${guild.name} via vanity URL`);
        // Still record the join but with no inviter
        if (!existing) {
            db.memberInviter.set(guild.id, member.id, null, Date.now());
        }
    } else if (permissionError) {
        logger.warn('Invites', `${member.user.tag} joined ${guild.name} but invite tracking is unavailable (missing Manage Guild permission)`);
    } else {
        logger.info('Invites', `${member.user.tag} joined ${guild.name} — could not determine inviter`);
        // Still record the join
        if (!existing) {
            db.memberInviter.set(guild.id, member.id, null, Date.now());
        }
    }

    // Record who invited this member — don't overwrite existing inviter with null
    if (inviterUser) {
        db.memberInviter.set(guild.id, member.id, inviterUser.id, Date.now());
    }

    // Resolve inviter member object for variable resolution
    let inviterMember = null;
    if (inviterUser) {
        try { inviterMember = await guild.members.fetch(inviterUser.id); } catch {}
    }

    const inviteData = inviterUser ? await getUserInviteCount(guild.id, inviterUser.id) : { total: 0, joins: 0, left: 0, fake: 0, rejoins: 0 };

    // ---- Join message (invite logger) ----
    try {
        const joinChannelId = db.guild.getJoinChannel(guild.id);
        const joinMessage = db.guild.getJoinMessage(guild.id);
        if (joinChannelId && joinMessage) {
            const channel = guild.channels.cache.get(joinChannelId);
            if (channel?.isTextBased?.()) {
                const content = resolveInviteVariables(joinMessage, {
                    member, inviter: inviterMember || inviterUser, inviteData, guild,
                });
                channel.send({ content: content.slice(0, 2000) }).catch(() => null);
            }
        }
    } catch (e) {
        logger.error('Greet', `Join message failed in ${guild.id}`, e?.message || e);
    }

    // ---- Greet messages ----
    try {
        const configs = db.guild.getGreetConfigs(guild.id);
        for (const cfg of configs || []) {
            const channel = guild.channels.cache.get(cfg.channelId);
            if (!channel?.isTextBased?.()) continue;

            if (cfg.type === 'container') {
                const container = new ContainerBuilder().setAccentColor(cfg.color || config.accentColor);
                const title = cfg.title ? resolveInviteVariables(cfg.title, { member, inviter: inviterMember || inviterUser, inviteData, guild }) : 'Welcome!';
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}`));
                container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
                const description = resolveInviteVariables(cfg.description || 'Welcome $member_mention!', { member, inviter: inviterMember || inviterUser, inviteData, guild });
                const thumb = cfg.thumbnailUrl || member.user.displayAvatarURL({ size: 256, extension: 'png' });
                try {
                    container.addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb)),
                    );
                } catch {
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
                }
                if (cfg.imageUrl) {
                    try {
                        container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ url: cfg.imageUrl }));
                    } catch {}
                }
                const sent = await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => null);
                if (sent && cfg.deleteAfter) {
                    setTimeout(() => sent.delete().catch(() => null), cfg.deleteAfter * 1000);
                }
            } else {
                // simple
                const content = resolveInviteVariables(cfg.message || 'Welcome $member_mention!', { member, inviter: inviterMember || inviterUser, inviteData, guild });
                const sent = await channel.send({ content: content.slice(0, 2000) }).catch(() => null);
                if (sent && cfg.deleteAfter) {
                    setTimeout(() => sent.delete().catch(() => null), cfg.deleteAfter * 1000);
                }
            }
        }
    } catch (e) {
        logger.error('Greet', `Greet message failed in ${guild.id}`, e?.message || e);
    }
}

export default { name, execute };
