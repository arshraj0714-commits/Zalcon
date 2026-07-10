import { Command } from '#command';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db } from '#dbManager';

const resolveTarget = async (ctx) => {
    if (ctx.isSlash) {
        const user = ctx.options.getUser('user');
        if (!user) return ctx.member;
        return ctx.guild.members.fetch(user.id).catch(() => null);
    }
    const arg = ctx.args[0];
    if (arg) {
        const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d{17,20})$/);
        const userId = idMatch ? idMatch[1] : null;
        if (userId) return ctx.guild.members.fetch(userId).catch(() => null);
    }
    return ctx.member;
};

export function buildInvitedPage(invited, page, totalPages, targetName, userId, client) {
    const slice = invited.slice((page - 1) * 10, page * 10);
    const lines = slice.map((entry, i) => {
        const rank = (page - 1) * 10 + i + 1;
        return `**#${rank}** • <@${entry.memberId}>`;
    });

    const embed = new EmbedBuilder()
        .setColor(0x34c5be)
        
        .setTitle(`Invited list of ${targetName}`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Page ${page}/${totalPages}` });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`invd_first_${page}_${totalPages}_${targetName}_${userId}`).setEmoji('⏪').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
        new ButtonBuilder().setCustomId(`invd_prev_${page}_${totalPages}_${targetName}_${userId}`).setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
        new ButtonBuilder().setCustomId(`invd_curr_${page}_${totalPages}_${targetName}_${userId}`).setEmoji('⬜').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId(`invd_next_${page}_${totalPages}_${targetName}_${userId}`).setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages),
        new ButtonBuilder().setCustomId(`invd_last_${page}_${totalPages}_${targetName}_${userId}`).setEmoji('⏩').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages),
    );

    return { embeds: [embed], components: [row] };
}

class InvitedCommand extends Command {
    constructor() {
        super({
            name: 'invited',
            description: 'Shows the list of members invited by a user',
            aliases: [],
            cooldown: 5,
            enabledSlash: false,
        });
    }

    async execute({ ctx }) {
        const target = await resolveTarget(ctx);
        if (!target) return ctx.reply({ content: 'Could not find that user.' });

        const invited = await db.memberInviter?.getAllByInviter(ctx.guild.id, target.id) ?? [];
        if (invited.length === 0) {
            return ctx.reply({ content: `${target.displayName} has no invites` });
        }

        const totalPages = Math.max(1, Math.ceil(invited.length / 10));
        const { embeds, components } = buildInvitedPage(invited, 1, totalPages, target.displayName, ctx.user.id, ctx.client);

        await ctx.reply({ embeds, components });
    }
}

export default new InvitedCommand();
