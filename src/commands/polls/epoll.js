import { Command } from '#command';
import { EmbedBuilder, ApplicationCommandOptionType } from 'discord.js';
import { emoji } from '#emoji';
import { pollStore } from './createpoll.js';

class EPollCommand extends Command {
    constructor() {
        super({
            name: 'epoll',
            description: 'Ends an active poll',
            usage: 'epoll <messageID>',
            aliases: ["endpoll"],
            cooldown: 3,
            minArgs: 1,
            enabledSlash: true,
            slashData: {
                name: 'epoll',
                description: 'Ends an active poll',
                options: [
                    { type: ApplicationCommandOptionType.String, name: 'messageid', description: 'The poll message ID', required: true },
                ],
            },
        });
    }

    async execute({ ctx }) {
        const messageId = ctx.isSlash ? ctx.options.getString('messageid') : ctx.args[0];
        const poll = pollStore.get(messageId);
        if (!poll) return ctx.reply({ content: `${emoji.cross} No poll found with that message ID.` });

        try {
            const msg = await ctx.channel.messages.fetch(messageId);
            if (!msg) return ctx.reply({ content: `${emoji.cross} Could not find that message.` });

            const counts = [];
            for (let i = 0; i < poll.options.length; i++) {
                const reaction = msg.reactions.cache.get(poll.letters[i]);
                counts.push({ option: poll.options[i], letter: poll.letters[i], count: (reaction?.count || 1) - 1 });
            }
            counts.sort((a, b) => b.count - a.count);

            const winner = counts[0];
            const totalVotes = counts.reduce((sum, c) => sum + c.count, 0);
            const results = counts.map((c, i) => `${c.letter} **${c.option}** — ${c.count} vote${c.count !== 1 ? 's' : ''}${i === 0 && winner.count > 0 ? ' 🏆' : ''}`).join('\n');

            const embed = new EmbedBuilder()
                .setColor(0x34c5be)
                
                .setTitle(`${emoji.poll} Poll Ended: ${poll.question}`)
                .setDescription(`**Results** (${totalVotes} total votes):\n\n${results}`)
                .setFooter({ text: `Ended by ${ctx.author.username}` });

            pollStore.delete(messageId);
            await ctx.reply({ embeds: [embed] });
        } catch (e) {
            await ctx.reply({ content: `${emoji.cross} Failed to end poll: ${e.message}` });
        }
    }
}

export default new EPollCommand();
