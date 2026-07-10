import { Command } from '#command';
import { EmbedBuilder, PermissionFlagsBits, ApplicationCommandOptionType } from 'discord.js';
import { emoji } from '#emoji';

class UnbanCommand extends Command {
    constructor() {
        super({
            name: 'unban',
            description: 'Unbans a banned user from a Discord server',
            usage: 'unban <userID> [reason]',
            aliases: ["ub"],
            cooldown: 3,
            minArgs: 1,
            userPermissions: [PermissionFlagsBits.BanMembers],
            enabledSlash: true,
            slashData: {
                name: 'unban',
                description: 'Unbans a banned user from a Discord server',
                defaultMemberPermissions: PermissionFlagsBits.BanMembers,
                options: [
                    { type: ApplicationCommandOptionType.String, name: 'userid', description: 'The user ID to unban', required: true },
                    { type: ApplicationCommandOptionType.String, name: 'reason', description: 'Reason for unbanning', required: false },
                ],
            },
        });
    }

    async execute({ ctx }) {
        let userId, reason;
        if (ctx.isSlash) {
            userId = ctx.options.getString('userid');
            reason = ctx.options.getString('reason') || 'No reason provided';
        } else {
            userId = ctx.args[0];
            reason = ctx.args.slice(1).join(' ') || 'No reason provided';
        }

        if (!userId || !/^\d{17,20}$/.test(userId)) {
            return ctx.reply({ content: 'Please provide a valid user ID.' });
        }

        try {
            await ctx.guild.bans.remove(userId, reason);
            const embed = new EmbedBuilder()
                .setColor(0x34c5be)
                
                .setTitle('Member Unbanned')
                .setDescription(`${emoji.tick} **<@${userId}>** (${userId}) has been unbanned.\n**Reason:** ${reason}`)
                .setFooter({ text: `Requested by ${ctx.author.username}` });
            await ctx.reply({ embeds: [embed] });
        } catch (e) {
            await ctx.reply({ content: `${emoji.cross} Failed to unban that user: ${e.message}` });
        }
    }
}

export default new UnbanCommand();
