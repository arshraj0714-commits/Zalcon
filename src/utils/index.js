// Zalcon — shared utilities
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { db } from '#dbManager';
import { config } from '#config';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------
const c = (r, g, b) => (t) => `\x1b[38;2;${r};${g};${b}m${t}\x1b[39m`;
const dim = (t) => `\x1b[2m${t}\x1b[22m`;
const bold = (t) => `\x1b[1m${t}\x1b[22m`;

export const logger = {
    info: (tag, ...msg) => console.log(`${c(99, 179, 237)('info')}  ${dim(`[${tag}]`)} ${msg.join(' ')}`),
    success: (tag, ...msg) => console.log(`${c(52, 199, 190)('ok')}    ${dim(`[${tag}]`)} ${msg.join(' ')}`),
    warn: (tag, ...msg) => console.log(`${c(250, 204, 21)('warn')}  ${dim(`[${tag}]`)} ${msg.join(' ')}`),
    error: (tag, ...msg) => console.error(`${c(239, 68, 68)('err')}   ${dim(`[${tag}]`)} ${msg.join(' ')}`),
    debug: (tag, ...msg) => {
        if (process.env.DEBUG) console.log(`${dim('debug')} ${dim(`[${tag}]`)} ${msg.join(' ')}`);
    },
};

// ---------------------------------------------------------------------------
// Invite helpers
// ---------------------------------------------------------------------------
export async function getUserInviteCount(guildId, userId) {
    const data = await db.userInviteCounter?.getCount(guildId, userId);
    return {
        total: data?.total ?? 0,
        joins: data?.joins ?? 0,
        left: data?.left ?? 0,
        fake: data?.fake ?? 0,
        rejoins: data?.rejoins ?? 0,
    };
}

export async function getUserMessageCounts(guildId, userId) {
    const data = await db.userMessageCounter?.getCount(guildId, userId);
    return {
        total: data?.total ?? 0,
        todayCount: data?.todayCount ?? 0,
    };
}

export async function addUserMessageCount(guildId, userId, amount) {
    await db.userMessageCounter?.addCount(guildId, userId, amount);
}

export async function removeUserMessageCount(guildId, userId, amount) {
    await db.userMessageCounter?.removeCount(guildId, userId, amount);
}

// ---------------------------------------------------------------------------
// Variable resolver for invite / welcome / leave messages
// ---------------------------------------------------------------------------
function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

export function resolveInviteVariables(template, { member, inviter, inviteData, guild } = {}) {
    if (typeof template !== 'string') return '';
    const m = member;
    const u = inviter;
    const data = inviteData || {};
    const g = guild;
    const memberCount = g?.memberCount ?? 0;

    const replacements = {
        $member_count: String(memberCount),
        $ordinal_member_count: ordinal(memberCount),
        $inviter_name: u ? (u.displayName || u.username) : 'Unknown',
        $inviter_mention: u ? `<@${u.id}>` : 'Unknown',
        $member_name: m ? (m.displayName || m.user?.username) : 'Unknown',
        $member: m ? `${m.user?.username ?? m.displayName}` : 'Unknown',
        $member_mention: m ? `<@${m.id}>` : 'Unknown',
        $invites: String(data.total ?? 0),
        $inviter_reg_invites: String((data.joins ?? 0) - (data.left ?? 0)),
        $fake_invites: String(data.fake ?? 0),
        $left_invites: String(data.left ?? 0),
        $rejoins: String(data.rejoins ?? 0),
        $guild_name: g?.name ?? 'this server',
        $join_time: m?.joinedAt ? `<t:${Math.floor(m.joinedAt.getTime() / 1000)}:R>` : 'unknown',
        $member_created_at: m?.user?.createdAt ? m.user.createdAt.toUTCString() : 'unknown',
        $member_created_ago: m?.user?.createdAt ? timeAgo(m.user.createdAt) : 'unknown',
        $inviter_created_at: u?.createdAt ? u.createdAt.toUTCString() : 'unknown',
        $inviter_created_ago: u?.createdAt ? timeAgo(u.createdAt) : 'unknown',
        // common aliases used by welcome messages
        $user: m ? `<@${m.id}>` : 'Unknown',
        $username: m ? (m.user?.username ?? m.displayName) : 'Unknown',
        $server: g?.name ?? 'this server',
    };

    let out = template;
    for (const [key, value] of Object.entries(replacements)) {
        out = out.split(key).join(value);
    }
    return out;
}

// ---------------------------------------------------------------------------
// Pagination constants
// ---------------------------------------------------------------------------
export const PER_PAGE = 10;
export const SL_PER_PAGE = 10;

// ---------------------------------------------------------------------------
// Leaderboard / list builders (return { components })
// ---------------------------------------------------------------------------
function pageButtons(prefix, page, totalPages, userId, extra = {}) {
    const row = new ActionRowBuilder();
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`${prefix}_first_${page}_${totalPages}_${userId}`)
            .setLabel('First')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
        new ButtonBuilder()
            .setCustomId(`${prefix}_prev_${page}_${totalPages}_${userId}`)
            .setLabel('Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
        new ButtonBuilder()
            .setCustomId(`${prefix}_next_${page}_${totalPages}_${userId}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages),
        new ButtonBuilder()
            .setCustomId(`${prefix}_last_${page}_${totalPages}_${userId}`)
            .setLabel('Last')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages),
    );
    return row;
}

export function buildLeaderboard(counts, page, totalPages, guildId, userId, botName, type) {
    const slice = counts.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const typeLabel = type === 'daily' ? 'Daily Messages' : 'All-Time Messages';

    const container = new ContainerBuilder().setAccentColor(config.accentColor);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${typeLabel} Leaderboard`),
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    if (slice.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('No data to display yet.'),
        );
    } else {
        const lines = slice.map((entry, i) => {
            const rank = (page - 1) * PER_PAGE + i + 1;
            const value = type === 'daily' ? (entry.todayCount || 0) : (entry.total || 0);
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `\`#${rank}\``;
            return `${medal} <@${entry.userId}> — **${value.toLocaleString('en-US')}** messages`;
        });
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(lines.join('\n')),
        );
    }

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `-# Page ${page}/${totalPages} • Updates in real-time`,
        ),
    );

    container.addActionRowComponents(pageButtons('lb_msg', page, totalPages, userId));

    return { components: [container] };
}

export function buildInviteLeaderboard(counts, page, totalPages, guildId, userId) {
    const slice = counts.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const container = new ContainerBuilder().setAccentColor(config.accentColor);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Invites Leaderboard'),
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    if (slice.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('No data to display yet.'),
        );
    } else {
        const lines = slice.map((entry, i) => {
            const rank = (page - 1) * PER_PAGE + i + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `\`#${rank}\``;
            return `${medal} <@${entry.userId}> — **${(entry.total || 0).toLocaleString('en-US')}** invites`;
        });
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(lines.join('\n')),
        );
    }

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `-# Page ${page}/${totalPages} • Updates in real-time`,
        ),
    );

    container.addActionRowComponents(pageButtons('lb_inv', page, totalPages, userId));

    return { components: [container] };
}

export function buildInvitedList(invited, page, totalPages, guildId, targetId, targetName, userId) {
    const slice = invited.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const container = new ContainerBuilder().setAccentColor(config.accentColor);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Members invited by ${targetName}`),
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    if (slice.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('No members to display.'),
        );
    } else {
        const lines = slice.map((entry) => {
            const ts = Math.floor((entry.joinedAt || Date.now()) / 1000);
            return `<@${entry.memberId}> — joined <t:${ts}:R>`;
        });
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(lines.join('\n')),
        );
    }

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# Page ${page}/${totalPages}`),
    );

    const row = new ActionRowBuilder();
    const mk = (action) => `lb_invd_${action}_${page}_${totalPages}_${targetId}_${userId}`;
    row.addComponents(
        new ButtonBuilder().setCustomId(mk('first')).setLabel('First').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
        new ButtonBuilder().setCustomId(mk('prev')).setLabel('Prev').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
        new ButtonBuilder().setCustomId(mk('next')).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages),
        new ButtonBuilder().setCustomId(mk('last')).setLabel('Last').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages),
    );
    container.addActionRowComponents(row);

    return { components: [container] };
}

export function buildServerList(guilds, page, totalPages, userId, sortMode) {
    const slice = guilds.slice((page - 1) * SL_PER_PAGE, page * SL_PER_PAGE);
    const mode = sortMode === 'lth' ? 'lth' : 'htl';
    const modeLabel = mode === 'lth' ? 'Low → High' : 'High → Low';

    const container = new ContainerBuilder().setAccentColor(config.accentColor);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Server List (${guilds.length})`),
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    if (slice.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('No servers to display.'),
        );
    } else {
        const lines = slice.map((g, i) => {
            const rank = (page - 1) * SL_PER_PAGE + i + 1;
            return `**#${rank}** ${g.name} — \`${g.memberCount ?? 0}\` members`;
        });
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(lines.join('\n')),
        );
    }

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# Page ${page}/${totalPages} • Sorted: ${modeLabel}`),
    );

    const nav = new ActionRowBuilder();
    const mk = (action) => `sl_${action}_${page}_${totalPages}_${userId}_${mode}`;
    nav.addComponents(
        new ButtonBuilder().setCustomId(mk('first')).setLabel('First').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
        new ButtonBuilder().setCustomId(mk('prev')).setLabel('Prev').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
        new ButtonBuilder().setCustomId(mk('next')).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages),
        new ButtonBuilder().setCustomId(mk('last')).setLabel('Last').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages),
        new ButtonBuilder().setCustomId(mk('toggle')).setLabel(mode === 'lth' ? '↑ Low→High' : '↓ High→Low').setStyle(ButtonStyle.Primary),
    );
    container.addActionRowComponents(nav);

    return { components: [container] };
}

export { timeAgo, ordinal };
