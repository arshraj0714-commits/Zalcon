import { Command } from '#command';
import { EmbedBuilder, PermissionFlagsBits, ApplicationCommandOptionType } from 'discord.js';
import { emoji } from '#emoji';

class EraseCommand extends Command {
    constructor() {
        super({
            name: 'erase',
            description: 'Delete a number of messages from a channel',
            usage: 'erase <amount>',
            aliases: ["purge","clear"],
            cooldown: 3,
            minArgs: 1,
            userPermissions: [PermissionFlagsBits.ManageMessages],
            enabledSlash: true,
            slashData: {
                name: 'erase',
                description: 'Delete a number of messages from a channel',
                defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
                options: [
                    { type: ApplicationCommandOptionType.Integer, name: 'amount', description: 'Number of messages to delete (1-100)', required: true, min_value: 1, max_value: 100 },
                ],
            },
        });
    }

    async execute({ ctx }) {
        let amount;
        if (ctx.isSlash) {
            amount = ctx.options.getInteger('amount');
        } else {
            amount = parseInt(ctx.args[0]);
        }

        if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
            return ctx.reply({ content: 'Please provide a number between 1 and 100.' });
        }

        try {
            const messages = await ctx.channel.bulkDelete(amount, true);
            const embed = new EmbedBuilder()
                .setColor(0x34c5be)
                
                .setTitle('Messages Erased')
                .setDescription(`${emoji.tick} Successfully deleted **${messages.size}** message${messages.size !== 1 ? 's' : ''}.`)
                .setFooter({ text: `Requested by ${ctx.author.username}` });
            const reply = await ctx.reply({ embeds: [embed] });
            if (reply?.delete) setTimeout(() => reply.delete().catch(() => null), 5000);
        } catch (e) {
            await ctx.reply({ content: `${emoji.cross} Failed to delete messages: ${e.message}` });
        }
    }
}

export default new EraseCommand();
