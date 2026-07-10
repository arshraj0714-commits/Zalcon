import { Command } from '#command';
import { EmbedBuilder } from 'discord.js';
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

class InviterCommand extends Command {
    constructor() {
        super({
            name: 'inviter',
            description: 'Shows who invited a member to this server',
            aliases: [],
            cooldown: 5,
            enabledSlash: false,
        });
    }

    async execute({ ctx }) {
        const target = await resolveTarget(ctx);
        if (!target) return ctx.reply({ content: 'Could not find that user.' });

        const record = await db.memberInviter?.get(ctx.guild.id, target.id);
        if (!record || !record.inviterId) {
            return ctx.reply({ content: `Couldn't find the inviter of member ${target.displayName}` });
        }

        const joinedTs = Math.floor(record.joinedAt / 1000);
        const now = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

        const embed = new EmbedBuilder()
            .setColor(0x34c5be)
            .setTitle('Inviter information')
            .setDescription(
                `${target.displayName} was invited by <@${record.inviterId}>\n` +
                `${target.displayName} Joined : <t:${joinedTs}:R>`
            )
            .setFooter({ text: `Today at ${now}` });

        await ctx.reply({ embeds: [embed] });
    }
}

export default new InviterCommand();
