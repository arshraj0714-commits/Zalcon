import { Command } from '#command';
import {
    EmbedBuilder,
    ApplicationCommandOptionType,
} from 'discord.js';
import { emoji } from '#emoji';
import { getUserMessageCounts } from '#utils';

const SERVER_LINK = 'https://discord.gg/Yw6sTftAkh';

const resolveTarget = async (ctx) => {
    if (ctx.isSlash) {
        const user = ctx.options.getUser('user');
        if (!user) return ctx.member;
        return ctx.guild.members.fetch(user.id).catch(() => null);
    }
    const arg = ctx.args[0];
    if (arg) {
        const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d{17,20})$/);
        const userId = idMatch ? idMatch[1] : null;
        if (userId) return ctx.guild.members.fetch(userId).catch(() => null);
    }
    return ctx.member;
};

class MessagesCommand extends Command {
    constructor() {
        super({
            name: 'messages',
            description: 'Displays the message count for a user in this server',
            aliases: ["message","msg","msgs","m"],
            cooldown: 5,
            enabledSlash: true,
            slashData: {
                name: 'messages',
                description: 'Displays the message count for a user in this server',
                options: [
                    { type: ApplicationCommandOptionType.User, name: 'user', description: 'User to check (defaults to yourself)', required: false },
                ],
            },
        });
    }

    async execute({ ctx }) {
        const target = await resolveTarget(ctx);
        if (!target) return ctx.reply({ content: 'Could not find that user.' });

        const { total, todayCount } = await getUserMessageCounts(ctx.guild.id, target.id);
        const totalFormatted = total.toLocaleString('en-US');
        const todayFormatted = todayCount.toLocaleString('en-US');

        const embed = new EmbedBuilder()
            .setColor(0x34c5be)
            .setTitle(`${target.displayName}'s Messages`)
            .setDescription(
                `**All time** • **${totalFormatted}** messages in this server !\n` +
                `**Today** • **${todayFormatted}** messages in this server\n\n` +
                `${emoji.arrow} Discover new events [here](${SERVER_LINK})!`
            )
            .setFooter({ text: `Messages are being updated in real-time` });

        await ctx.reply({ embeds: [embed] });
    }
}

export default new MessagesCommand();
