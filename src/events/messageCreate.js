// Zalcon — messageCreate (prefix command handling + message tracking)
import { config } from '#config';
import { db } from '#dbManager';
import { logger } from '#utils';
import { Context } from '#context';

// Resolve a command from prefix tokens: tries subcommand (2-token) path first,
// then primary name, then aliases.
function resolveCommand(client, tokens) {
    if (!tokens.length) return null;
    const lower = tokens.map((t) => t.toLowerCase());

    // 1) Two-token subcommand match
    if (lower.length >= 2) {
        const parent = client.commandsByPrimary.get(lower[0]);
        if (parent) {
            const sub = parent.find((c) => c.isSubcommand && c.name[1].toLowerCase() === lower[1]);
            if (sub) return { command: sub, args: tokens.slice(2) };
        }
    }

    // 2) One-token primary match (prefer the non-subcommand command)
    if (lower.length >= 1) {
        const parent = client.commandsByPrimary.get(lower[0]);
        if (parent) {
            const top = parent.find((c) => !c.isSubcommand) || parent[0];
            if (top) return { command: top, args: tokens.slice(1) };
        }
    }

    // 3) Alias match
    if (lower.length >= 1) {
        const cmd = client.aliasMap.get(lower[0]);
        if (cmd) return { command: cmd, args: tokens.slice(1) };
    }

    return null;
}

export const name = 'messageCreate';

export async function execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // ---- Message tracking (all non-bot messages in non-blacklisted channels) ----
    try {
        const blacklisted = db.guild.getMessageBlacklistedChannels(message.guild.id);
        if (!blacklisted.includes(message.channel.id)) {
            db.userMessageCounter.incrementMessage(message.guild.id, message.author.id);
        }
    } catch (e) {
        logger.error('MsgTrack', `Failed to track message in ${message.guild.id}`, e?.message || e);
    }

    // ---- Determine prefix ----
    const guildPrefix = db.guild.getPrefix(message.guild.id) ?? config.prefix;
    const mentionPrefixes = [`<@${client.user.id}>`, `<@!${client.user.id}>`];

    let usedPrefix = null;
    if (guildPrefix && message.content.startsWith(guildPrefix)) usedPrefix = guildPrefix;
    else {
        for (const m of mentionPrefixes) {
            if (message.content.startsWith(m)) { usedPrefix = m; break; }
        }
    }

    if (!usedPrefix) return;

    const content = message.content.slice(usedPrefix.length).trim();
    if (!content) return;

    const tokens = content.split(/\s+/);
    const resolved = resolveCommand(client, tokens);
    if (!resolved) return;

    const { command, args } = resolved;

    if (command.disabled) return;

    // ---- Checks ----
    if (command.ownerOnly) {
        if (!config.ownerIds.includes(message.author.id)) {
            return message.reply({ content: 'This command is restricted to the bot owner.' }).catch(() => null);
        }
    }

    if (command.userPermissions?.length) {
        if (!message.member?.permissions?.has(command.userPermissions)) {
            return message.reply({ content: 'You do not have permission to use this command.' }).catch(() => null);
        }
    }

    if (command.minArgs && args.length < command.minArgs) {
        return message.reply({ content: `**Usage:** \`${command.usage || command.fullName}\`` }).catch(() => null);
    }

    const remaining = command.checkCooldown(message.author.id, client.cooldowns);
    if (remaining > 0) {
        return message.reply({ content: `Please wait **${remaining}s** before using \`${command.fullName}\` again.` }).catch(() => null);
    }

    // ---- Execute ----
    const ctx = new Context({
        client,
        message,
        args,
        prefix: usedPrefix,
        guild: message.guild,
        channel: message.channel,
        member: message.member,
    });

    try {
        await command.execute({ ctx, client });
    } catch (e) {
        logger.error('Command', `Error in prefix command "${command.fullName}":`, e?.stack || e?.message || e);
        message.reply({ content: `An error occurred: \`${e?.message || 'Unknown error'}\`` }).catch(() => null);
    }
}

export default { name, execute };
