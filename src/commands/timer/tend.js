import { Command } from '#command';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { emoji } from '#emoji';
import { clearTimer } from '#timerUtils';

class TEndCommand extends Command {
    constructor() {
        super({
            name: 'tend',
            description: 'Ends an active timer',
            usage: 'tend <name>',
            aliases: [],
            cooldown: 3,
            minArgs: 1,
            userPermissions: [PermissionFlagsBits.ManageGuild],
            enabledSlash: false,
        });
    }

    async execute({ ctx }) {
        const name = ctx.args[0];
        const timerId = `${ctx.guild.id}:${name}`;
        const removed = clearTimer(timerId);
        if (!removed) return ctx.reply({ content: `${emoji.cross} No active timer named \`${name}\`.` });

        const embed = new EmbedBuilder()
            .setColor(0x34c5be)
            
            .setTitle(`${emoji.timer} Timer Ended`)
            .setDescription(`Timer **${name}** has been ended.`)
            .setFooter({ text: `Requested by ${ctx.author.username}` });
        await ctx.reply({ embeds: [embed] });
    }
}

export default new TEndCommand();
