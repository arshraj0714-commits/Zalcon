import { Command } from '#command';
import { EmbedBuilder, PermissionFlagsBits, ApplicationCommandOptionType } from 'discord.js';
import { emoji } from '#emoji';

class KickCommand extends Command {
    constructor() {
        super({
            name: 'kick',
            description: 'Kicks a user from a guild',
            usage: 'kick <@user | userID> [reason]',
            aliases: [],
            cooldown: 3,
            minArgs: 1,
            userPermissions: [PermissionFlagsBits.KickMembers],
            enabledSlash: true,
            slashData: {
                name: 'kick',
                description: 'Kicks a user from a guild',
                defaultMemberPermissions: PermissionFlagsBits.KickMembers,
                options: [
                    { type: ApplicationCommandOptionType.User, name: 'user', description: 'The user to kick', required: true },
                    { type: ApplicationCommandOptionType.String, name: 'reason', description: 'Reason for kicking', required: false },
                ],
            },
        });
    }

    async execute({ ctx }) {
        let target, reason;
        if (ctx.isSlash) {
            const user = ctx.options.getUser('user');
            target = user ? await ctx.guild.members.fetch(user.id).catch(() => null) : null;
            reason = ctx.options.getString('reason') || 'No reason provided';
        } else {
            const idMatch = ctx.args[0]?.match(/^<@!?(\d+)>$/) || ctx.args[0]?.match(/^(\d{17,20})$/);
            const userId = idMatch ? idMatch[1] : null;
            target = userId ? await ctx.guild.members.fetch(userId).catch(() => null) : null;
            reason = ctx.args.slice(1).join(' ') || 'No reason provided';
        }

        if (!target) return ctx.reply({ content: 'Please mention a valid user.' });
        if (!target.kickable) return ctx.reply({ content: 'I cannot kick that member.' });

        try {
            await target.kick(reason);
            const embed = new EmbedBuilder()
                .setColor(0x34c5be)
                
                .setTitle('Member Kicked')
                .setDescription(`${emoji.tick} **${target.user.tag}** has been kicked.\n**Reason:** ${reason}`)
                .setFooter({ text: `Requested by ${ctx.author.username}` });
            await ctx.reply({ embeds: [embed] });
        } catch (e) {
            await ctx.reply({ content: `${emoji.cross} Failed to kick that member: ${e.message}` });
        }
    }
}

export default new KickCommand();
