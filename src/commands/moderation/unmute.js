import { Command } from '#command';
import { EmbedBuilder, PermissionFlagsBits, ApplicationCommandOptionType } from 'discord.js';
import { emoji } from '#emoji';

class UnmuteCommand extends Command {
    constructor() {
        super({
            name: 'unmute',
            description: 'Unmutes a server member',
            usage: 'unmute <@user | userID> [reason]',
            aliases: [],
            cooldown: 3,
            minArgs: 1,
            userPermissions: [PermissionFlagsBits.ModerateMembers],
            enabledSlash: true,
            slashData: {
                name: 'unmute',
                description: 'Unmutes a server member',
                defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
                options: [
                    { type: ApplicationCommandOptionType.User, name: 'user', description: 'The user to unmute', required: true },
                    { type: ApplicationCommandOptionType.String, name: 'reason', description: 'Reason for unmuting', required: false },
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

        try {
            if (target.isCommunicationDisabled() || target.moderatable) {
                await target.timeout(null, reason);
            }
            // Also remove Muted role if it exists
            const muteRole = ctx.guild.roles.cache.find(r => r.name === 'Muted');
            if (muteRole && target.roles.cache.has(muteRole.id)) {
                await target.roles.remove(muteRole, reason);
            }

            const embed = new EmbedBuilder()
                .setColor(0x34c5be)
                
                .setTitle('Member Unmuted')
                .setDescription(`${emoji.tick} **${target.user.tag}** has been unmuted.\n**Reason:** ${reason}`)
                .setFooter({ text: `Requested by ${ctx.author.username}` });
            await ctx.reply({ embeds: [embed] });
        } catch (e) {
            await ctx.reply({ content: `${emoji.cross} Failed to unmute that member: ${e.message}` });
        }
    }
}

export default new UnmuteCommand();
