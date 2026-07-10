import { Command } from '#command';
import { EmbedBuilder, PermissionFlagsBits, ApplicationCommandOptionType } from 'discord.js';
import { emoji } from '#emoji';
import { db } from '#dbManager';

const MUTE_ROLE_NAME = 'Muted';

async function getOrCreateMuteRole(guild) {
    let role = guild.roles.cache.find(r => r.name === MUTE_ROLE_NAME);
    if (!role) {
        try {
            role = await guild.roles.create({ name: MUTE_ROLE_NAME, permissions: [], reason: 'Zalcon mute role' });
            for (const channel of guild.channels.cache.values()) {
                try {
                    await channel.permissionOverwrites.edit(role, { SendMessages: false, AddReactions: false, Speak: false, Connect: false });
                } catch {}
            }
        } catch (e) {
            return null;
        }
    }
    return role;
}

function parseTime(str) {
    if (!str) return null;
    const match = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;
    const val = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    return val * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
}

class MuteCommand extends Command {
    constructor() {
        super({
            name: 'mute',
            description: 'Mutes a server member for a specified amount of time',
            usage: 'mute <@user | userID> <duration> [reason]',
            aliases: ["stfu","timeout"],
            cooldown: 3,
            minArgs: 2,
            userPermissions: [PermissionFlagsBits.ModerateMembers],
            enabledSlash: true,
            slashData: {
                name: 'mute',
                description: 'Mutes a server member for a specified amount of time',
                defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
                options: [
                    { type: ApplicationCommandOptionType.User, name: 'user', description: 'The user to mute', required: true },
                    { type: ApplicationCommandOptionType.String, name: 'duration', description: 'Duration (e.g. 10m, 1h, 2d)', required: true },
                    { type: ApplicationCommandOptionType.String, name: 'reason', description: 'Reason for muting', required: false },
                ],
            },
        });
    }

    async execute({ ctx }) {
        let target, durationStr, reason;
        if (ctx.isSlash) {
            const user = ctx.options.getUser('user');
            target = user ? await ctx.guild.members.fetch(user.id).catch(() => null) : null;
            durationStr = ctx.options.getString('duration');
            reason = ctx.options.getString('reason') || 'No reason provided';
        } else {
            const idMatch = ctx.args[0]?.match(/^<@!?(\d+)>$/) || ctx.args[0]?.match(/^(\d{17,20})$/);
            const userId = idMatch ? idMatch[1] : null;
            target = userId ? await ctx.guild.members.fetch(userId).catch(() => null) : null;
            durationStr = ctx.args[1];
            reason = ctx.args.slice(2).join(' ') || 'No reason provided';
        }

        if (!target) return ctx.reply({ content: 'Please mention a valid user.' });

        const duration = parseTime(durationStr);
        if (!duration) return ctx.reply({ content: 'Invalid duration. Use format like `10m`, `1h`, `2d`.' });

        try {
            if (target.moderatable) {
                await target.timeout(duration, reason);
            } else {
                const role = await getOrCreateMuteRole(ctx.guild);
                if (!role) return ctx.reply({ content: `${emoji.cross} Could not create a mute role.` });
                await target.roles.add(role, reason);
                db.guild._doc(ctx.guild.id)._tempMuteExpires = Date.now() + duration;
            }

            const expiresAt = Math.floor((Date.now() + duration) / 1000);
            const embed = new EmbedBuilder()
                .setColor(0x34c5be)
                
                .setTitle('Member Muted')
                .setDescription(
                    `${emoji.tick} **${target.user.tag}** has been muted.\n` +
                    `**Duration:** ${durationStr}\n**Reason:** ${reason}\n**Expires:** <t:${expiresAt}:R>`
                )
                .setFooter({ text: `Requested by ${ctx.author.username}` });
            await ctx.reply({ embeds: [embed] });
        } catch (e) {
            await ctx.reply({ content: `${emoji.cross} Failed to mute that member: ${e.message}` });
        }
    }
}

export default new MuteCommand();
