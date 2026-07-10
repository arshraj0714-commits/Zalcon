import { Command } from '#command';
import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { emoji } from '#emoji';
import { db } from '#dbManager';

// Voice state tracking repository (reuses the same JSON store pattern)
// We store voice state counts in the guild document under voiceCounters
function getVoiceDoc(guildId, userId) {
    const doc = db.guild._doc(guildId);
    doc.voiceCounters = doc.voiceCounters || {};
    const key = userId;
    if (!doc.voiceCounters[key]) {
        doc.voiceCounters[key] = { total: 0, todayCount: 0, lastResetDate: new Date().toISOString().slice(0, 10) };
    }
    return doc.voiceCounters[key];
}

export function incrementVoiceTime(guildId, userId) {
    const doc = getVoiceDoc(guildId, userId);
    const today = new Date().toISOString().slice(0, 10);
    if (doc.lastResetDate !== today) {
        doc.lastResetDate = today;
        doc.todayCount = 0;
    }
    doc.total = (doc.total || 0) + 1;
    doc.todayCount = (doc.todayCount || 0) + 1;
    db.guild.save();
}

export function getVoiceCount(guildId, userId) {
    const doc = db.guild._doc(guildId);
    doc.voiceCounters = doc.voiceCounters || {};
    const entry = doc.voiceCounters[userId];
    if (!entry) return { total: 0, todayCount: 0 };
    const today = new Date().toISOString().slice(0, 10);
    return {
        total: entry.total || 0,
        todayCount: entry.lastResetDate === today ? (entry.todayCount || 0) : 0,
    };
}

export function getAllVoiceByGuild(guildId) {
    const doc = db.guild._doc(guildId);
    doc.voiceCounters = doc.voiceCounters || {};
    const today = new Date().toISOString().slice(0, 10);
    return Object.entries(doc.voiceCounters).map(([userId, entry]) => ({
        userId,
        total: entry.total || 0,
        todayCount: entry.lastResetDate === today ? (entry.todayCount || 0) : 0,
    }));
}

export function resetVoiceCount(guildId, userId) {
    const doc = db.guild._doc(guildId);
    doc.voiceCounters = doc.voiceCounters || {};
    if (doc.voiceCounters[userId]) {
        doc.voiceCounters[userId] = { total: 0, todayCount: 0, lastResetDate: new Date().toISOString().slice(0, 10) };
        db.guild.save();
    }
}

// ---------------------------------------------------------------------------
// vc — Displays the voice state stats of a user
// ---------------------------------------------------------------------------
class VcCommand extends Command {
    constructor() {
        super({
            name: 'vc',
            description: 'Displays the voice state stats of a user',
            usage: 'vc [member]',
            cooldown: 5,
            enabledSlash: true,
            slashData: {
                name: 'vc',
                description: 'Displays the voice state stats of a user',
                options: [
                    { type: ApplicationCommandOptionType.User, name: 'user', description: 'User to check (defaults to yourself)', required: false },
                ],
            },
        });
    }

    async execute({ ctx }) {
        let target = ctx.member;
        if (ctx.isSlash) {
            const user = ctx.options.getUser('user');
            if (user) target = await ctx.guild.members.fetch(user.id).catch(() => ctx.member) || ctx.member;
        } else if (ctx.args[0]) {
            const idMatch = ctx.args[0].match(/^<@!?(\d+)>$/) || ctx.args[0].match(/^(\d{17,20})$/);
            if (idMatch) target = await ctx.guild.members.fetch(idMatch[1]).catch(() => ctx.member) || ctx.member;
        }

        const { total, todayCount } = getVoiceCount(ctx.guild.id, target.id);
        const vs = target.voice;
        const inVoice = vs?.channelId ? true : false;

        const embed = new EmbedBuilder()
            .setColor(0x34c5be)
            
            .setTitle(`${target.displayName}'s Voice Stats`)
            .setDescription(
                `**All time** • **${total.toLocaleString('en-US')}** minutes in voice\n` +
                `**Today** • **${todayCount.toLocaleString('en-US')}** minutes in voice\n\n` +
                `**Currently in voice:** ${inVoice ? `Yes (<#${vs.channelId}>)` : 'No'}\n` +
                `**Muted:** ${vs?.mute ? 'Yes' : 'No'}\n` +
                `**Deafened:** ${vs?.deaf ? 'Yes' : 'No'}\n` +
                `**Streaming:** ${vs?.streaming ? 'Yes' : 'No'}\n` +
                `**Video:** ${vs?.selfVideo ? 'Yes' : 'No'}`
            )
            .setFooter({ text: `Requested by ${ctx.author.username}` });

        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// clearvoice — Resets everyone's or a user's voice state stats
// ---------------------------------------------------------------------------
class ClearVoiceCommand extends Command {
    constructor() {
        super({
            name: 'clearvoice',
            description: "Resets everyone's voice state stats or a user's voice state stats in this guild",
            usage: 'clearvoice <all | @member>',
            aliases: ['resetvoice'],
            cooldown: 5,
            minArgs: 1,
            userPermissions: [PermissionFlagsBits.Administrator],
            enabledSlash: true,
            slashData: {
                name: 'clearvoice',
                description: "Resets everyone's or a user's voice state stats",
                options: [
                    { type: ApplicationCommandOptionType.String, name: 'target', description: '"all" or a user mention', required: true },
                ],
            },
        });
    }

    async execute({ ctx }) {
        const targetArg = ctx.isSlash ? ctx.options.getString('target') : ctx.args[0];

        if (targetArg === 'all') {
            const doc = db.guild._doc(ctx.guild.id);
            doc.voiceCounters = {};
            db.guild.save();
            return ctx.reply({ content: `${emoji.tick} All voice state stats have been reset.` });
        }

        const idMatch = targetArg?.match(/^<@!?(\d+)>$/) || targetArg?.match(/^(\d{17,20})$/);
        if (!idMatch) return ctx.reply({ content: 'Please provide `all` or a valid user mention.' });
        const userId = idMatch[1];

        resetVoiceCount(ctx.guild.id, userId);
        return ctx.reply({ content: `${emoji.tick} Voice stats for <@${userId}> have been reset.` });
    }
}

// ---------------------------------------------------------------------------
// resetmyvoice — Resets your own voice state record
// ---------------------------------------------------------------------------
class ResetMyVoiceCommand extends Command {
    constructor() {
        super({
            name: 'resetmyvoice',
            description: "Resets your own voice state record in this guild",
            usage: 'resetmyvoice',
            aliases: ['rmv', 'clearmyvoice'],
            cooldown: 10,
            enabledSlash: true,
            slashData: {
                name: 'resetmyvoice',
                description: "Resets your own voice state record",
            },
        });
    }

    async execute({ ctx }) {
        resetVoiceCount(ctx.guild.id, ctx.author.id);
        return ctx.reply({ content: `${emoji.tick} Your voice state stats have been reset.` });
    }
}

export { VcCommand, ClearVoiceCommand, ResetMyVoiceCommand };
