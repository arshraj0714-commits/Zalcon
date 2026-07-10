import { Command } from '#command';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { emoji } from '#emoji';

const pollStore = new Map(); // messageId -> poll data

class CreatePollCommand extends Command {
    constructor() {
        super({
            name: 'createpoll',
            description: 'Create a poll',
            usage: 'createpoll <question> | <option1> | <option2> [| option3...]',
            aliases: ["cpoll"],
            cooldown: 5,
            minArgs: 1,
            enabledSlash: true,
            slashData: {
                name: 'createpoll',
                description: 'Create a poll',
                options: [
                    { type: ApplicationCommandOptionType.String, name: 'question', description: 'The poll question', required: true },
                    { type: ApplicationCommandOptionType.String, name: 'option1', description: 'First option', required: true },
                    { type: ApplicationCommandOptionType.String, name: 'option2', description: 'Second option', required: true },
                    { type: ApplicationCommandOptionType.String, name: 'option3', description: 'Third option (optional)', required: false },
                    { type: ApplicationCommandOptionType.String, name: 'option4', description: 'Fourth option (optional)', required: false },
                    { type: ApplicationCommandOptionType.String, name: 'option5', description: 'Fifth option (optional)', required: false },
                ],
            },
        });
    }

    async execute({ ctx }) {
        let question, options;
        if (ctx.isSlash) {
            question = ctx.options.getString('question');
            options = [];
            for (let i = 1; i <= 5; i++) {
                const opt = ctx.options.getString(`option${i}`);
                if (opt) options.push(opt);
            }
        } else {
            const parts = ctx.args.join(' ').split('|').map(s => s.trim()).filter(Boolean);
            if (parts.length < 3) return ctx.reply({ content: 'Usage: `createpoll <question> | <option1> | <option2> [| option3...]`' });
            question = parts[0];
            options = parts.slice(1);
        }

        if (options.length < 2 || options.length > 5) {
            return ctx.reply({ content: 'Please provide between 2 and 5 options.' });
        }

        const letters = ['🇦', '🇧', '🇨', '🇩', '🇪'];
        const description = options.map((opt, i) => `${letters[i]} **${opt}**`).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x34c5be)
            
            .setTitle(`${emoji.poll} ${question}`)
            .setDescription(description)
            .setFooter({ text: `Poll by ${ctx.author.username}` });

        const reply = await ctx.reply({ embeds: [embed], fetchReply: true });
        for (let i = 0; i < options.length; i++) {
            try { await reply.react(letters[i]); } catch {}
        }

        pollStore.set(reply.id, { question, options, letters, authorId: ctx.author.id });
    }
}

export { pollStore };
export default new CreatePollCommand();
