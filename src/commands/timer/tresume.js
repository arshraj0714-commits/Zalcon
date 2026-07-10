import { Command } from '#command';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { emoji } from '#emoji';
import { timerStore, startTimer } from '#timerUtils';

class TResumeCommand extends Command {
    constructor() {
        super({
            name: 'tresume',
            description: 'Resumes a paused timer',
            usage: 'tresume <name>',
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
        if (!entry || !entry.paused) return ctx.reply({ content: `${emoji.cross} No paused timer named \`${name}\`.` });

        const remaining = entry.remaining;
        const endsAt = Math.floor((Date.now() + remaining) / 1000);
        startTimer(timerId, remaining, async () => {
            try {
                const embed = new EmbedBuilder()
                    .setColor(0x34c5be)
                    
                    .setTitle(`${emoji.timer} Timer Ended`)
                    .setDescription(`Timer **${name}** has ended!`);
                await ctx.channel.send({ content: `${ctx.author}`, embeds: [embed] });
            } catch {}
        });

        const embed = new EmbedBuilder()
            .setColor(0x34c5be)
            
            .setTitle(`${emoji.timer} Timer Resumed`)
            .setDescription(`Timer **${name}** has been resumed.\n**Ends:** <t:${endsAt}:R>`)
            .setFooter({ text: `Requested by ${ctx.author.username}` });
        await ctx.reply({ embeds: [embed] });
    }
}

export default new TResumeCommand();
