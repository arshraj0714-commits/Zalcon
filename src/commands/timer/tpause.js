import { Command } from '#command';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { emoji } from '#emoji';
import { timerStore } from '#timerUtils';

class TPauseCommand extends Command {
    constructor() {
        super({
            name: 'tpause',
            description: 'Pauses an active timer',
            usage: 'tpause <name>',
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
        const entry = timerStore.get(timerId);
        if (!entry) return ctx.reply({ content: `${emoji.cross} No active timer named \`${name}\`.` });

        clearTimeout(entry.timerId);
        entry.remaining = entry.endsAt - Date.now();
        entry.paused = true;
        timerStore.set(timerId, entry);

        const embed = new EmbedBuilder()
            .setColor(0x34c5be)
            
            .setTitle(`${emoji.timer} Timer Paused`)
            .setDescription(`Timer **${name}** has been paused.`)
            .setFooter({ text: `Requested by ${ctx.author.username}` });
        await ctx.reply({ embeds: [embed] });
    }
}

export default new TPauseCommand();
