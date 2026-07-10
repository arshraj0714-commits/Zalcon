import { Command } from '#command';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { emoji } from '#emoji';

const CHOICES = ['🐍 Snake', '💧 Water', '🔫 Gun'];
const EMOJIS = ['🐍', '💧', '🔫'];
const winMap = { 0: 2, 1: 0, 2: 1 }; // key beats value: snake drinks water(0 beats 1), water rusts gun(1 beats 2), gun shoots snake(2 beats 0)

class SnakeWaterGunCommand extends Command {
    constructor() {
        super({
            name: 'snakewatergun',
            description: 'Play snake water gun game against the bot',
            usage: 'snakewatergun',
            aliases: ['swg'],
            cooldown: 5,
            enabledSlash: true,
            slashData: {
                name: 'snakewatergun',
                description: 'Play snake water gun game against the bot',
            },
        });
    }

    async execute({ ctx }) {
        const embed = new EmbedBuilder()
            .setColor(0x34c5be)
            
            .setTitle(`${emoji.poll} Snake Water Gun`)
            .setDescription('Choose your move! The bot will pick one too.\n\n**Rules:**\n🐍 Snake drinks 💧 Water\n💧 Water rusts 🔫 Gun\n🔫 Gun shoots 🐍 Snake')
            .setFooter({ text: `Requested by ${ctx.author.username}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`swg_0_${ctx.author.id}`).setLabel('Snake').setEmoji('🐍').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`swg_1_${ctx.author.id}`).setLabel('Water').setEmoji('💧').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`swg_2_${ctx.author.id}`).setLabel('Gun').setEmoji('🔫').setStyle(ButtonStyle.Danger),
        );

        await ctx.reply({ embeds: [embed], components: [row] });
    }
}

export function resolveSwg(userChoice, botChoice) {
    if (userChoice === botChoice) return 'tie';
    if (winMap[userChoice] === botChoice) return 'win';
    return 'lose';
}

export default new SnakeWaterGunCommand();
