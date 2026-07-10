import { Command } from '#command';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { emoji } from '#emoji';
import { parseDuration, startTimer, getTimer, clearTimer } from '#timerUtils';

class TStartCommand extends Command {
    constructor() {
        super({
            name: 'tstart',
            description: 'Starts the timer',
            usage: 'tstart <name> <duration> [message]',
            aliases: [],
            cooldown: 3,
            minArgs: 2,
            userPermissions: [PermissionFlagsBits.ManageGuild],
            enabledSlash: false,
        });
    }

    async execute({ ctx }) {
        const name = ctx.args[0];
        const durationStr = ctx.args[1];
        const message = ctx.args.slice(2).join(' ') || '';
        if (!name) return ctx.reply({ content: 'Please provide a timer name.' });

        const duration = parseDuration(durationStr);
        if (!duration) return ctx.reply({ content: 'Invalid duration. Use format like `50s`, `2m`, `1h`, `1d`.' });

        const timerId = `${ctx.guild.id}:${name}`;
        if (getTimer(timerId)) return ctx.reply({ content: `${emoji.cross} A timer named \`${name}\` is already running.` });

        const endsAt = Math.floor((Date.now() + duration) / 1000);
        startTimer(timerId, duration, async () => {
            try {
                const embed = new EmbedBuilder()
                    .setColor(0x34c5be)
                    
                    .setTitle(`${emoji.timer} Timer Ended`)
                    .setDescription(`Timer **${name}** has ended!${message ? `\n\n${message}` : ''}`);
                await ctx.channel.send({ content: `${ctx.author}`, embeds: [embed] });
            } catch {}
        });

        const embed = new EmbedBuilder()
            .setColor(0x34c5be)
            
            .setTitle(`${emoji.timer} Timer Started`)
            .setDescription(`Timer **${name}** started.\n**Duration:** ${durationStr}\n**Ends:** <t:${endsAt}:R>${message ? `\n**Message:** ${message}` : ''}`)
            .setFooter({ text: `Requested by ${ctx.author.username}` });
        await ctx.reply({ embeds: [embed] });
    }
}

export default new TStartCommand();
