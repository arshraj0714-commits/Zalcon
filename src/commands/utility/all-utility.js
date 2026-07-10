import { Command } from '#command';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ApplicationCommandOptionType } from 'discord.js';
import { emoji } from '#emoji';
import { db } from '#dbManager';

const SERVER_LINK = 'https://discord.gg/Yw6sTftAkh';

// Helper to build a standard embed
function makeEmbed(ctx, title, description) {
    return new EmbedBuilder()
        .setColor(0x34c5be)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: `Requested by ${ctx.author.username}` });
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------
class FaqCommand extends Command {
    constructor() {
        super({ name: 'faq', description: 'Shows the faq command', cooldown: 5, enabledSlash: true, slashData: { name: 'faq', description: 'Shows the faq command' } });
    }
    async execute({ ctx }) {
        const embed = makeEmbed(ctx, `${emoji.info} FAQ`,
            `**Q: How do I set a custom prefix?**\nA: Use \`-setprefix <new_prefix>\`\n\n` +
            `**Q: How do I track invites?**\nA: Zalcon automatically tracks invites. Make sure the bot has Manage Guild permission to read invite data.\n\n` +
            `**Q: How do I set a welcome message?**\nA: Use \`-greetsetup\` to configure greet messages with a modal.\n\n` +
            `**Q: How do I create a giveaway?**\nA: Use \`-gcreate <duration> <winners> <prize>\` e.g. \`-gcreate 1h 2 Nitro\`\n\n` +
            `**Q: Why are invites showing 0?**\nA: The bot needs the **Manage Guild** permission to view invites. Also, invites are only tracked from when the bot joins — previous joins aren't counted.\n\n`
        );
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// Premium
// ---------------------------------------------------------------------------
class PremiumCommand extends Command {
    constructor() {
        super({ name: 'premium', description: 'Shows information about Zalcon Premium', aliases: ['prem'], cooldown: 5, enabledSlash: true, slashData: { name: 'premium', description: 'Shows information about Zalcon Premium' } });
    }
    async execute({ ctx }) {
        const embed = makeEmbed(ctx, `${emoji.star} Zalcon Premium`,
            `Upgrade your Discord server with **Zalcon Premium**!\n\n` +
            `**Premium Features:**\n` +
            `${emoji.tick} Daily and weekly message tracking\n` +
            `${emoji.tick} Custom embed colours\n` +
            `${emoji.tick} Unlimited greet channels\n` +
            `${emoji.tick} Priority support\n` +
            `${emoji.tick} Access to premium-only commands\n\n` +
            `**Get Premium:** [Click here](${SERVER_LINK})`);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Get Premium').setURL(SERVER_LINK).setStyle(ButtonStyle.Link),
        );
        await ctx.reply({ embeds: [embed], components: [row] });
    }
}

// ---------------------------------------------------------------------------
// Nuke
// ---------------------------------------------------------------------------
class NukeCommand extends Command {
    constructor() {
        super({ name: 'nuke', description: 'Nukes a TextChannel', cooldown: 10, userPermissions: [PermissionFlagsBits.ManageChannels], enabledSlash: true, slashData: { name: 'nuke', description: 'Nukes a TextChannel', defaultMemberPermissions: PermissionFlagsBits.ManageChannels } });
    }
    async execute({ ctx }) {
        try {
            const channel = ctx.channel;
            const position = channel.position;
            const newChannel = await channel.clone();
            await channel.delete().catch(() => null);
            await newChannel.setPosition(position);
            const embed = makeEmbed(ctx, `${emoji.trash} Channel Nuked`, `This channel has been nuked by ${ctx.author}.`);
            await newChannel.send({ embeds: [embed] });
        } catch (e) {
            await ctx.reply({ content: `${emoji.cross} Failed to nuke: ${e.message}` });
        }
    }
}

// ---------------------------------------------------------------------------
// ServerInfo
// ---------------------------------------------------------------------------
class ServerInfoCommand extends Command {
    constructor() {
        super({ name: 'serverinfo', description: 'Displays the information about a server', aliases: ['si', 'guildinfo'], cooldown: 5, enabledSlash: true, slashData: { name: 'serverinfo', description: 'Displays the information about a server' } });
    }
    async execute({ ctx }) {
        const g = ctx.guild;
        const owner = await g.fetchOwner().catch(() => null);
        const createdTs = Math.floor(g.createdTimestamp / 1000);
        const embed = makeEmbed(ctx, `${emoji.server} Server Information`)
            .setThumbnail(g.iconURL({ size: 256 }))
            .setDescription(
                `**Name:** ${g.name}\n**ID:** ${g.id}\n**Owner:** ${owner ? `<@${owner.id}>` : 'Unknown'}\n` +
                `**Members:** ${g.memberCount.toLocaleString('en-US')}\n**Channels:** ${g.channels.cache.size}\n**Roles:** ${g.roles.cache.size}\n` +
                `**Created:** <t:${createdTs}:R> (<t:${createdTs}:f>)\n**Boost Level:** ${g.premiumTier}\n**Boosts:** ${g.premiumSubscriptionCount}`
            );
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// UserInfo
// ---------------------------------------------------------------------------
class UserInfoCommand extends Command {
    constructor() {
        super({ name: 'userinfo', description: 'Displays the information of member', aliases: ['whois', 'ui'], cooldown: 5, enabledSlash: true,
            slashData: { name: 'userinfo', description: 'Displays the information of member', options: [{ type: ApplicationCommandOptionType.User, name: 'user', description: 'User to check', required: false }] } });
    }
    async execute({ ctx }) {
        let target = ctx.isSlash ? (ctx.options.getUser('user') ? await ctx.guild.members.fetch(ctx.options.getUser('user').id).catch(() => ctx.member) : ctx.member) : (ctx.args[0] ? await ctx.guild.members.fetch(ctx.args[0].replace(/[<@!>]/g, '')).catch(() => ctx.member) : ctx.member);
        if (!target) target = ctx.member;
        const u = target.user;
        const createdTs = Math.floor(u.createdTimestamp / 1000);
        const joinedTs = target.joinedTimestamp ? Math.floor(target.joinedTimestamp / 1000) : null;
        const embed = makeEmbed(ctx, `${emoji.users} User Information`)
            .setThumbnail(u.displayAvatarURL({ size: 256 }))
            .setDescription(
                `**Username:** ${u.tag}\n**ID:** ${u.id}\n**Nickname:** ${target.displayName}\n` +
                `**Account Created:** <t:${createdTs}:R>\n**Joined Server:** ${joinedTs ? `<t:${joinedTs}:R>` : 'Unknown'}\n` +
                `**Bot:** ${u.bot ? 'Yes' : 'No'}\n**Roles:** ${target.roles.cache.size > 0 ? target.roles.cache.map(r => r.toString()).slice(0, 10).join(', ') : 'None'}`
            );
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// RoleInfo
// ---------------------------------------------------------------------------
class RoleInfoCommand extends Command {
    constructor() {
        super({ name: 'roleinfo', description: 'Displays the information about a guild\'s role', aliases: ['ri'], cooldown: 5, minArgs: 1, enabledSlash: true,
            slashData: { name: 'roleinfo', description: 'Displays the information about a guild\'s role', options: [{ type: ApplicationCommandOptionType.Role, name: 'role', description: 'The role to check', required: true }] } });
    }
    async execute({ ctx }) {
        let role;
        if (ctx.isSlash) { role = ctx.options.getRole('role'); }
        else {
            const idMatch = ctx.args[0]?.match(/^<@&(\d+)>$/) || ctx.args[0]?.match(/^(\d{17,20})$/);
            role = idMatch ? ctx.guild.roles.cache.get(idMatch[1]) : ctx.guild.roles.cache.find(r => r.name === ctx.args.join(' '));
        }
        if (!role) return ctx.reply({ content: 'Could not find that role.' });
        const createdTs = Math.floor(role.createdTimestamp / 1000);
        const embed = makeEmbed(ctx, `${emoji.info} Role Information`)
            .setDescription(`**Name:** ${role.name}\n**ID:** ${role.id}\n**Color:** ${role.hexColor}\n**Members:** ${role.members.size}\n**Position:** ${role.position}\n**Mentionable:** ${role.mentionable ? 'Yes' : 'No'}\n**Hoisted:** ${role.hoist ? 'Yes' : 'No'}\n**Created:** <t:${createdTs}:R>`);
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// VcInfo
// ---------------------------------------------------------------------------
class VcInfoCommand extends Command {
    constructor() {
        super({ name: 'vcinfo', description: 'Displays the information about a voice channel', aliases: ['voiceinfo'], cooldown: 5, minArgs: 1, enabledSlash: true,
            slashData: { name: 'vcinfo', description: 'Displays the information about a voice channel', options: [{ type: ApplicationCommandOptionType.Channel, name: 'channel', description: 'The voice channel', required: true }] } });
    }
    async execute({ ctx }) {
        let channel;
        if (ctx.isSlash) { channel = ctx.options.getChannel('channel'); }
        else {
            const idMatch = ctx.args[0]?.match(/^<#(\d+)>$/) || ctx.args[0]?.match(/^(\d{17,20})$/);
            channel = idMatch ? ctx.guild.channels.cache.get(idMatch[1]) : null;
        }
        if (!channel || !channel.isVoiceBased()) return ctx.reply({ content: 'Please provide a valid voice channel.' });
        const createdTs = Math.floor(channel.createdTimestamp / 1000);
        const embed = makeEmbed(ctx, `${emoji.info} Voice Channel Information`)
            .setDescription(`**Name:** ${channel.name}\n**ID:** ${channel.id}\n**Type:** ${channel.type}\n**Members Connected:** ${channel.members?.size || 0}\n**User Limit:** ${channel.userLimit || 'Unlimited'}\n**Bitrate:** ${channel.bitrate || 'N/A'} bps\n**Created:** <t:${createdTs}:R>`);
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
class AvatarCommand extends Command {
    constructor() {
        super({ name: 'avatar', description: 'Displays the avatar of a user', aliases: ['av'], cooldown: 5, enabledSlash: true,
            slashData: { name: 'avatar', description: 'Displays the avatar of a user', options: [{ type: ApplicationCommandOptionType.User, name: 'user', description: 'User to check', required: false }] } });
    }
    async execute({ ctx }) {
        let target = ctx.isSlash ? (ctx.options.getUser('user') || ctx.author) : (ctx.args[0] ? await ctx.client.users.fetch(ctx.args[0].replace(/[<@!>]/g, '')).catch(() => ctx.author) : ctx.author);
        const embed = makeEmbed(ctx, `${emoji.users} ${target.username}'s Avatar`).setImage(target.displayAvatarURL({ size: 1024, extension: 'png' }));
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------
class BannerCommand extends Command {
    constructor() {
        super({ name: 'banner', description: 'Displays the banner of a user', cooldown: 5, enabledSlash: true,
            slashData: { name: 'banner', description: 'Displays the banner of a user', options: [{ type: ApplicationCommandOptionType.User, name: 'user', description: 'User to check', required: false }] } });
    }
    async execute({ ctx }) {
        let target = ctx.isSlash ? (ctx.options.getUser('user') || ctx.author) : (ctx.args[0] ? await ctx.client.users.fetch(ctx.args[0].replace(/[<@!>]/g, ''), { force: true }).catch(() => ctx.author) : ctx.author);
        const fullUser = await ctx.client.users.fetch(target.id, { force: true }).catch(() => target);
        const banner = fullUser.bannerURL({ size: 1024, extension: 'png' });
        if (!banner) return ctx.reply({ content: `${emoji.cross} ${target.username} does not have a banner.` });
        const embed = makeEmbed(ctx, `${emoji.users} ${target.username}'s Banner`).setImage(banner);
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// GuildBanner
// ---------------------------------------------------------------------------
class GuildBannerCommand extends Command {
    constructor() {
        super({ name: 'guildbanner', description: 'Displays a guild\'s banner', aliases: ['serverbanner'], cooldown: 5, enabledSlash: true, slashData: { name: 'guildbanner', description: 'Displays a guild\'s banner' } });
    }
    async execute({ ctx }) {
        const banner = ctx.guild.bannerURL({ size: 1024, extension: 'png' });
        if (!banner) return ctx.reply({ content: `${emoji.cross} This server does not have a banner.` });
        const embed = makeEmbed(ctx, `${emoji.server} ${ctx.guild.name}'s Banner`).setImage(banner);
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------
class SupportCommand extends Command {
    constructor() {
        super({ name: 'support', description: 'Displays the invite link of my support server', cooldown: 5, enabledSlash: true, slashData: { name: 'support', description: 'Displays the invite link of my support server' } });
    }
    async execute({ ctx }) {
        const embed = makeEmbed(ctx, `${emoji.contact} Support Server`, `Need help with Zalcon? Join our support server!\n\n[Click here to join](${SERVER_LINK})`);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Join Support Server').setURL(SERVER_LINK).setStyle(ButtonStyle.Link));
        await ctx.reply({ embeds: [embed], components: [row] });
    }
}

// ---------------------------------------------------------------------------
// MemberCount
// ---------------------------------------------------------------------------
class MemberCountCommand extends Command {
    constructor() {
        super({ name: 'membercount', description: 'Displays the member count of the server', aliases: ['mc'], cooldown: 5, enabledSlash: true, slashData: { name: 'membercount', description: 'Displays the member count of the server' } });
    }
    async execute({ ctx }) {
        const g = ctx.guild;
        const total = g.memberCount;
        const embed = makeEmbed(ctx, `${emoji.users} Member Count`, `**Total Members:** ${total.toLocaleString('en-US')}`);
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
class StatsCommand extends Command {
    constructor() {
        super({ name: 'stats', description: 'Displays the stats of the bot and its vps', cooldown: 5, enabledSlash: true, slashData: { name: 'stats', description: 'Displays the stats of the bot and its vps' } });
    }
    async execute({ ctx }) {
        const mem = process.memoryUsage();
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const embed = makeEmbed(ctx, `${emoji.info} Bot Stats`)
            .setDescription(
                `**Servers:** ${ctx.client.guilds.cache.size}\n**Users:** ${ctx.client.users.cache.size}\n**Channels:** ${ctx.client.channels.cache.size}\n` +
                `**Uptime:** ${days}d ${hours}h ${mins}m\n**Memory:** ${(mem.rss / 1024 / 1024).toFixed(1)} MB\n**Node.js:** ${process.version}\n**Discord.js:** v14`
            );
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// Shards
// ---------------------------------------------------------------------------
class ShardsCommand extends Command {
    constructor() {
        super({ name: 'shards', description: 'Displays the information about the shards', cooldown: 5, enabledSlash: true, slashData: { name: 'shards', description: 'Displays the information about the shards' } });
    }
    async execute({ ctx }) {
        const embed = makeEmbed(ctx, `${emoji.info} Shard Information`, `This bot is running on a single shard (no sharding).\n**Shard ID:** 0\n**Guilds on this shard:** ${ctx.client.guilds.cache.size}`);
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------
class PermissionsCommand extends Command {
    constructor() {
        super({ name: 'permissions', description: 'Displays the information about what permissions the bot requires to function properly', aliases: ['perms'], cooldown: 5, enabledSlash: true, slashData: { name: 'permissions', description: 'Displays the information about what permissions the bot requires' } });
    }
    async execute({ ctx }) {
        const embed = makeEmbed(ctx, `${emoji.info} Required Permissions`,
            `**Essential:**\n${emoji.tick} View Channels\n${emoji.tick} Send Messages\n${emoji.tick} Read Message History\n${emoji.tick} Embed Links\n\n` +
            `**For Invite Tracking:**\n${emoji.tick} Manage Guild (to read invites)\n\n` +
            `**For Moderation:**\n${emoji.tick} Kick Members\n${emoji.tick} Ban Members\n${emoji.tick} Manage Messages\n${emoji.tick} Moderate Members (timeout)\n\n` +
            `**For Greet Messages:**\n${emoji.tick} Manage Channels (optional, for nuke)\n\n` +
            `**Privileged Intents (enable in Developer Portal):**\n${emoji.tick} Server Members Intent\n${emoji.tick} Message Content Intent`);
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// AccountAge
// ---------------------------------------------------------------------------
class AccountAgeCommand extends Command {
    constructor() {
        super({ name: 'accountage', description: 'Displays the account age of your account or a user\'s account', aliases: ['accage'], cooldown: 5, enabledSlash: true,
            slashData: { name: 'accountage', description: 'Displays the account age', options: [{ type: ApplicationCommandOptionType.User, name: 'user', description: 'User to check', required: false }] } });
    }
    async execute({ ctx }) {
        let target = ctx.isSlash ? (ctx.options.getUser('user') || ctx.author) : (ctx.args[0] ? await ctx.client.users.fetch(ctx.args[0].replace(/[<@!>]/g, '')).catch(() => ctx.author) : ctx.author);
        const now = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

        // Calculate the duration since account creation
        const createdDate = target.createdAt;
        const diffMs = Date.now() - createdDate.getTime();
        const seconds = Math.floor(diffMs / 1000) % 60;
        const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
        const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) % 7;
        const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));

        const duration = `${weeks} week${weeks !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}, ${seconds} second${seconds !== 1 ? 's' : ''}`;

        const embed = new EmbedBuilder()
            .setColor(0x34c5be)
            .setTitle(`📅 ${target.username}'s Account Age`)
            .setDescription(duration)
            .setFooter({ text: `Requested by ${ctx.author.username} • Today at ${now}` });

        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// Invite (bot invite link)
// ---------------------------------------------------------------------------
class InviteCommand extends Command {
    constructor() {
        super({ name: 'invite', description: 'Displays the invite links of the bot', cooldown: 5, enabledSlash: true, slashData: { name: 'invite', description: 'Displays the invite links of the bot' } });
    }
    async execute({ ctx }) {
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${ctx.client.user.id}&permissions=8&scope=bot+applications.commands`;
        const embed = makeEmbed(ctx, `${emoji.link} Invite Zalcon`, `[Click here to invite Zalcon to your server](${inviteUrl})`);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Invite Me').setURL(inviteUrl).setStyle(ButtonStyle.Link));
        await ctx.reply({ embeds: [embed], components: [row] });
    }
}

// ---------------------------------------------------------------------------
// Sponsor
// ---------------------------------------------------------------------------
class SponsorCommand extends Command {
    constructor() {
        super({ name: 'sponsor', description: 'Displays the information about the sponsors of the bot', cooldown: 5, enabledSlash: true, slashData: { name: 'sponsor', description: 'Displays the information about the sponsors' } });
    }
    async execute({ ctx }) {
        const embed = makeEmbed(ctx, `${emoji.star} Sponsors`, `Zalcon is proudly sponsored by our community partners.\n\n[Become a sponsor](${SERVER_LINK})`);
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// Uptime
// ---------------------------------------------------------------------------
class UptimeCommand extends Command {
    constructor() {
        super({ name: 'uptime', description: 'Displays the uptime of the bot', aliases: ['up'], cooldown: 5, enabledSlash: true, slashData: { name: 'uptime', description: 'Displays the uptime of the bot' } });
    }
    async execute({ ctx }) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const secs = Math.floor(uptime % 60);
        const embed = makeEmbed(ctx, `${emoji.clock} Bot Uptime`, `**Uptime:** ${days}d ${hours}h ${mins}m ${secs}s`);
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// BotInfo
// ---------------------------------------------------------------------------
class BotInfoCommand extends Command {
    constructor() {
        super({ name: 'botinfo', description: 'Displays the information about the bot', aliases: ['about', 'bi'], cooldown: 5, enabledSlash: true, slashData: { name: 'botinfo', description: 'Displays the information about the bot' } });
    }
    async execute({ ctx }) {
        const mem = process.memoryUsage();
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const embed = makeEmbed(ctx, `${emoji.info} Bot Information`)
            .setThumbnail(ctx.client.user.displayAvatarURL())
            .setDescription(
                `**Name:** Zalcon\n**ID:** ${ctx.client.user.id}\n**Servers:** ${ctx.client.guilds.cache.size}\n**Users:** ${ctx.client.users.cache.size}\n` +
                `**Uptime:** ${days}d ${hours}h\n**Memory:** ${(mem.rss / 1024 / 1024).toFixed(1)} MB\n**Node.js:** ${process.version}\n**Prefix:** -`
            );
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// Ping
// ---------------------------------------------------------------------------
class PingCommand extends Command {
    constructor() {
        super({ name: 'ping', description: 'Displays the api latency', cooldown: 5, enabledSlash: true, slashData: { name: 'ping', description: 'Displays the api latency' } });
    }
    async execute({ ctx }) {
        const sent = await ctx.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - (ctx.isSlash ? ctx.interaction.createdTimestamp : ctx.message.createdTimestamp);
        const apiLatency = Math.round(ctx.client.ws.ping);
        const embed = makeEmbed(ctx, `${emoji.clock} Pong!`, `**Bot Latency:** ${latency}ms\n**API Latency:** ${apiLatency}ms`);
        if (ctx.isSlash) {
            await ctx.interaction.editReply({ content: null, embeds: [embed] });
        } else {
            await sent.edit({ content: null, embeds: [embed] });
        }
    }
}

// ---------------------------------------------------------------------------
// SetPrefix
// ---------------------------------------------------------------------------
class SetPrefixCommand extends Command {
    constructor() {
        super({ name: 'setprefix', description: 'Changes a guild\'s prefix', cooldown: 5, minArgs: 1, userPermissions: [PermissionFlagsBits.ManageGuild], enabledSlash: true,
            slashData: { name: 'setprefix', description: 'Changes a guild\'s prefix', defaultMemberPermissions: PermissionFlagsBits.ManageGuild, options: [{ type: ApplicationCommandOptionType.String, name: 'prefix', description: 'The new prefix', required: true }] } });
    }
    async execute({ ctx }) {
        const newPrefix = ctx.isSlash ? ctx.options.getString('prefix') : ctx.args[0];
        if (!newPrefix || newPrefix.length > 5) return ctx.reply({ content: 'Prefix must be between 1 and 5 characters.' });
        db.guild.setPrefix(ctx.guild.id, newPrefix);
        const embed = makeEmbed(ctx, `${emoji.tick} Prefix Changed`, `The prefix for this server has been set to \`${newPrefix}\``);
        await ctx.reply({ embeds: [embed] });
    }
}

// ---------------------------------------------------------------------------
// DeletePrefix
// ---------------------------------------------------------------------------
class DeletePrefixCommand extends Command {
    constructor() {
        super({ name: 'deleteprefix', description: 'Resets a guild\'s prefix to bot\'s default prefix', cooldown: 5, userPermissions: [PermissionFlagsBits.ManageGuild], enabledSlash: true, slashData: { name: 'deleteprefix', description: 'Resets a guild\'s prefix', defaultMemberPermissions: PermissionFlagsBits.ManageGuild } });
    }
    async execute({ ctx }) {
        db.guild.setPrefix(ctx.guild.id, null);
        const embed = makeEmbed(ctx, `${emoji.tick} Prefix Reset`, `The prefix for this server has been reset to \`-\``);
        await ctx.reply({ embeds: [embed] });
    }
}

export {
    FaqCommand, PremiumCommand, NukeCommand, ServerInfoCommand, UserInfoCommand,
    RoleInfoCommand, VcInfoCommand, AvatarCommand, BannerCommand, GuildBannerCommand,
    SupportCommand, MemberCountCommand, StatsCommand, ShardsCommand, PermissionsCommand,
    AccountAgeCommand, InviteCommand, SponsorCommand, UptimeCommand, BotInfoCommand,
    PingCommand, SetPrefixCommand, DeletePrefixCommand,
};
