import { Command } from '#command';
import { EmbedBuilder, PermissionFlagsBits, ApplicationCommandOptionType } from 'discord.js';
import { emoji } from '#emoji';

class BanCommand extends Command {
    constructor() {
        super({
            name: 'ban',
            description: 'Bans a user from a guild',
            usage: 'ban <@user | userID> [reason]',
            aliases: [],
            cooldown: 3,
            minArgs: 1,
            userPermissions: [PermissionFlagsBits.BanMembers],
            enabledSlash: true,
            slashData: {
                name: 'ban',
                description: 'Bans a user from a guild',
                defaultMemberPermissions: PermissionFlagsBits.BanMembers,
                options: [
                    { type: ApplicationCommandOptionType.User, name: 'user', description: 'The user to ban', required: true },
                    { type: ApplicationCommandOptionType.String, name: 'reason', description: 'Reason for banning', required: false },
                    { type: ApplicationCommandOptionType.Integer, name: 'days', description: 'Days of messages to delete (0-7)', required: false, min_value: 0, max_value: 7 },
                ],
            },
        });
    }

    async execute({ ctx }) {
        let target, reason, days;
        if (ctx.isSlash) {
            const user = ctx.options.getUser('user');
            target = user ? await ctx.guild.members.fetch(user.id).catch(() => null) : null;
            if (!target) target = user; // allow banning users not in the guild
            reason = ctx.options.getString('reason') || 'No reason provided';
            days = ctx.options.getInteger('days') || 0;
        } else {
            const idMatch = ctx.args[0]?.match(/^<@!?(\d+)>$/) || ctx.args[0]?.match(/^(\d{17,20})$/);
            const userId = idMatch ? idMatch[1] : null;
            if (!userId) return ctx.reply({ content: 'Please mention a valid user.' });
            target = await ctx.guild.members.fetch(userId).catch(() => userId);
            reason = ctx.args.slice(1).join(' ') || 'No reason provided';
            days = 0;
        }

        if (!target) return ctx.reply({ content: 'Please mention a valid user.' });

        try {
            const userId = typeof target === 'string' ? target : target.id;
            const banOptions = { deleteMessageSeconds: days * 86400 };
            if (reason) banOptions.reason = reason;
            await ctx.guild.bans.create(userId, banOptions);
            const tag = typeof target === 'string' ? userId : target.user.tag;
            const embed = new EmbedBuilder()
                .setColor(0x34c5be)
                
                .setTitle('Member Banned')
                .setDescription(`${emoji.tick} **${tag}** has been banned.\n**Reason:** ${reason}`)
                .setFooter({ text: `Requested by ${ctx.author.username}` });
            await ctx.reply({ embeds: [embed] });
        } catch (e) {
            await ctx.reply({ content: `${emoji.cross} Failed to ban that user: ${e.message}` });
        }
    }
}

export default new BanCommand();
