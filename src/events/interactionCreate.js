// Zalcon — interactionCreate (slash commands, buttons, modals, dropdowns)
import { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { config } from '#config';
import { db } from '#dbManager';
import { logger } from '#utils';
import { Context } from '#context';
import {
    buildLeaderboard, buildInviteLeaderboard, buildInvitedList, buildServerList,
    PER_PAGE, SL_PER_PAGE,
} from '#utils';
import { buildHelpCategory } from '#commands/utility/help';
import { buildInvitedPage } from '#commands/invites/invited';
import { resolveSwg } from '#commands/game/snakewatergun';
import { emoji } from '#emoji';

export const name = 'interactionCreate';

// ---------------------------------------------------------------------------
// Slash command execution
// ---------------------------------------------------------------------------
async function handleSlash(interaction, client) {
    const commandName = interaction.commandName.toLowerCase();
    const sub = interaction.options.getSubcommand(false);
    const key = sub ? `${commandName}:${sub.toLowerCase()}` : commandName;
    const command = client.slashCommands.get(key);

    if (!command) {
        return interaction.reply({ content: 'This command is not available.', flags: MessageFlags.Ephemeral }).catch(() => null);
    }

    if (command.ownerOnly) {
        if (!config.ownerIds.includes(interaction.user.id)) {
            return interaction.reply({ content: 'This command is restricted to the bot owner.', flags: MessageFlags.Ephemeral });
        }
    }

    if (command.userPermissions?.length) {
        const member = interaction.member;
        if (member && !member.permissions?.has(command.userPermissions)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }
    }

    const remaining = command.checkCooldown(interaction.user.id, client.cooldowns);
    if (remaining > 0) {
        return interaction.reply({ content: `Please wait **${remaining}s** before using \`${command.fullName}\` again.`, flags: MessageFlags.Ephemeral });
    }

    if (!command.shouldNotDefer) {
        await interaction.deferReply().catch(() => null);
    }

    const ctx = new Context({ client, interaction, guild: interaction.guild, channel: interaction.channel, member: interaction.member });

    try {
        await command.execute({ ctx, client });
    } catch (e) {
        logger.error('Command', `Error in slash command "${command.fullName}":`, e?.stack || e?.message || e);
        const payload = { content: `An error occurred: \`${e?.message || 'Unknown error'}\``, flags: MessageFlags.Ephemeral };
        if (interaction.deferred || interaction.replied) {
            interaction.editReply(payload).catch(() => null);
        } else {
            interaction.reply(payload).catch(() => null);
        }
    }
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------
function computePage(action, page, totalPages) {
    switch (action) {
        case 'first': return 1;
        case 'prev': return Math.max(1, page - 1);
        case 'next': return Math.min(totalPages, page + 1);
        case 'last': return totalPages;
        default: return page;
    }
}

// ---------------------------------------------------------------------------
// Handle help category dropdown
// ---------------------------------------------------------------------------
async function handleHelpSelect(interaction, client) {
    const selected = interaction.values[0];
    const result = buildHelpCategory(selected, client);
    if (!result) {
        return interaction.update({ content: 'Category not found.', components: [], embeds: [] });
    }
    return interaction.update({ ...result, embeds: [] });
}

// ---------------------------------------------------------------------------
// Handle pagination buttons
// ---------------------------------------------------------------------------
async function handlePagination(interaction, client) {
    const id = interaction.customId;

    // Invited list pagination: invd_<action>_<page>_<totalPages>_<targetName>_<userId>
    if (id.startsWith('invd_')) {
        const parts = id.split('_');
        const action = parts[1];
        const page = Number(parts[2]);
        const totalPages = Number(parts[3]);
        // targetName is parts[4] but might contain underscores — rejoin
        const userId = parts[parts.length - 1];
        const targetName = parts.slice(4, -1).join('_');

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: 'This menu belongs to someone else.', flags: MessageFlags.Ephemeral });
        }

        // We need to find the target ID from the invited list — but we stored targetName, not ID
        // Let's fetch all invited records and find by inviter
        // Actually, we need the target ID to query. Let's extract it from the message embed title.
        // Better approach: store the target ID in the customId instead of name.
        // For now, use the message's existing embed to get the target name, then fetch all members.
        let targetId = null;
        try {
            const msg = interaction.message;
            if (msg.embeds[0]?.title) {
                const titleMatch = msg.embeds[0].title.match(/Invited list of (.+)/);
                if (titleMatch) {
                    const name = titleMatch[1];
                    const member = await interaction.guild.members.search({ query: name, limit: 1 });
                    if (member.size > 0) targetId = member.first().id;
                }
            }
        } catch {}

        if (!targetId) {
            return interaction.reply({ content: 'Could not resolve the target user.', flags: MessageFlags.Ephemeral });
        }

        const invited = (await db.memberInviter?.getAllByInviter(interaction.guild.id, targetId) ?? []);
        const newTotalPages = Math.max(1, Math.ceil(invited.length / 10));
        const newPage = computePage(action, page, totalPages);
        const { embeds, components } = buildInvitedPage(invited, newPage, newTotalPages, targetName, userId, client);
        return interaction.update({ embeds, components });
    }

    // Leaderboard message: lb_msg_<action>_<page>_<totalPages>_<userId>
    if (id.startsWith('lb_msg_')) {
        const parts = id.split('_');
        const action = parts[2];
        const pageStr = parts[3];
        const totalStr = parts[4];
        const userId = parts[5];
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: 'This menu belongs to someone else.', flags: MessageFlags.Ephemeral });
        }
        const page = computePage(action, Number(pageStr), Number(totalStr));
        const all = (await db.userMessageCounter?.getAllByGuild(interaction.guild.id) ?? []).sort((a, b) => (b.total || 0) - (a.total || 0));
        const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
        const botName = client.user.displayName;
        const { components } = buildLeaderboard(all, page, totalPages, interaction.guild.id, userId, botName, 'alltime');
        return interaction.update({ components, flags: MessageFlags.IsComponentsV2 });
    }

    // Leaderboard invites: lb_inv_<action>_<page>_<totalPages>_<userId>
    if (id.startsWith('lb_inv_')) {
        const parts = id.split('_');
        const action = parts[2];
        const pageStr = parts[3];
        const totalStr = parts[4];
        const userId = parts[5];
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: 'This menu belongs to someone else.', flags: MessageFlags.Ephemeral });
        }
        const page = computePage(action, Number(pageStr), Number(totalStr));
        const all = (await db.userInviteCounter?.getAllByGuild(interaction.guild.id) ?? []).sort((a, b) => (b.total || 0) - (a.total || 0));
        const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
        const { components } = buildInviteLeaderboard(all, page, totalPages, interaction.guild.id, userId);
        return interaction.update({ components, flags: MessageFlags.IsComponentsV2 });
    }

    // Server list: sl_<action>_<page>_<totalPages>_<userId>_<mode>
    if (id.startsWith('sl_')) {
        const parts = id.split('_');
        const action = parts[1];
        const pageStr = parts[2];
        const totalStr = parts[3];
        const userId = parts[4];
        const mode = parts[5];
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: 'This menu belongs to someone else.', flags: MessageFlags.Ephemeral });
        }
        let guilds = [...client.guilds.cache.values()];
        const newMode = action === 'toggle' ? (mode === 'lth' ? 'htl' : 'lth') : mode;
        guilds.sort((a, b) => newMode === 'lth' ? (a.memberCount ?? 0) - (b.memberCount ?? 0) : (b.memberCount ?? 0) - (a.memberCount ?? 0));
        const totalPages = Math.max(1, Math.ceil(guilds.length / SL_PER_PAGE));
        const page = action === 'toggle' ? 1 : computePage(action, Number(pageStr), Number(totalStr));
        const { components } = buildServerList(guilds, page, totalPages, userId, newMode);
        return interaction.update({ components, flags: MessageFlags.IsComponentsV2 });
    }
}

// ---------------------------------------------------------------------------
// Greet setup buttons & modals
// ---------------------------------------------------------------------------
async function handleGreetButton(interaction) {
    const id = interaction.customId;
    const m = id.match(/^greet_(setup)_(simple|container|cancel)_(\d+)$/);
    if (!m) return;
    const action = m[2];
    const targetUserId = m[3];

    if (interaction.user.id !== targetUserId) {
        return interaction.reply({ content: 'This greet setup belongs to someone else.', flags: MessageFlags.Ephemeral });
    }

    if (action === 'cancel') {
        return interaction.update({ content: 'Greet setup cancelled.', components: [], flags: MessageFlags.Ephemeral }).catch(() =>
            interaction.reply({ content: 'Greet setup cancelled.', flags: MessageFlags.Ephemeral })
        );
    }

    if (action === 'simple') {
        const modal = new ModalBuilder()
            .setCustomId(`greet_modal_simple_${targetUserId}`)
            .setTitle('Simple Greet Setup');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('channel').setLabel('Channel (ID or #mention)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('message').setLabel('Message (use $variables)').setStyle(TextInputStyle.Paragraph).setRequired(true).setValue('Welcome $member_mention to $guild_name! You are our $ordinal_member_count member.')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('deleteAfter').setLabel('Delete after (seconds, optional)').setStyle(TextInputStyle.Short).setRequired(false)),
        );
        return interaction.showModal(modal);
    }

    if (action === 'container') {
        const modal = new ModalBuilder()
            .setCustomId(`greet_modal_container_${targetUserId}`)
            .setTitle('Container Greet Setup');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('channel').setLabel('Channel (ID or #mention)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short).setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description (use $variables)').setStyle(TextInputStyle.Paragraph).setRequired(true).setValue('Welcome $member_mention to **$guild_name**!')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('thumbnail').setLabel('Thumbnail URL (optional)').setStyle(TextInputStyle.Short).setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('image').setLabel('Banner image URL (optional)').setStyle(TextInputStyle.Short).setRequired(false)),
        );
        return interaction.showModal(modal);
    }
}

function parseChannelId(raw, guild) {
    if (!raw) return null;
    const mention = raw.match(/^<#(\d+)>$/);
    if (mention) return mention[1];
    if (/^\d{17,20}$/.test(raw.trim())) return raw.trim();
    const byName = guild.channels.cache.find((c) => c.name.toLowerCase() === raw.trim().toLowerCase());
    return byName?.id || null;
}

async function handleGreetModal(interaction) {
    const id = interaction.customId;
    const m = id.match(/^greet_modal_(simple|container)_(\d+)$/);
    if (!m) return;
    const type = m[1];
    const channelId = parseChannelId(interaction.fields.getTextInputValue('channel'), interaction.guild);
    if (!channelId) {
        return interaction.reply({ content: 'Could not resolve that channel. Please use a channel ID or #mention.', flags: MessageFlags.Ephemeral });
    }

    const configs = db.guild.getGreetConfigs(interaction.guild.id);
    if (!configs.find((c) => c.channelId === channelId) && configs.length >= 3) {
        return interaction.reply({ content: 'You already have 3 greet channels configured, which is the maximum.', flags: MessageFlags.Ephemeral });
    }

    const deleteAfterRaw = interaction.fields.getTextInputValue('deleteAfter');
    let deleteAfter = null;
    if (deleteAfterRaw && !isNaN(Number(deleteAfterRaw))) deleteAfter = Number(deleteAfterRaw);

    if (type === 'simple') {
        const message = interaction.fields.getTextInputValue('message');
        db.guild.removeGreetConfigByChannel(interaction.guild.id, channelId);
        db.guild.addGreetConfig(interaction.guild.id, {
            channelId, type: 'simple', message, title: null, description: null,
            color: null, thumbnailUrl: null, imageUrl: null, deleteAfter,
        });
    } else {
        const title = interaction.fields.getTextInputValue('title') || null;
        const description = interaction.fields.getTextInputValue('description');
        const thumbnailUrl = interaction.fields.getTextInputValue('thumbnail') || null;
        const imageUrl = interaction.fields.getTextInputValue('image') || null;
        db.guild.removeGreetConfigByChannel(interaction.guild.id, channelId);
        db.guild.addGreetConfig(interaction.guild.id, {
            channelId, type: 'container', message: null, title, description,
            color: config.accentColor, thumbnailUrl, imageUrl, deleteAfter,
        });
    }

    return interaction.reply({ content: `Greet message configured for <#${channelId}>.`, flags: MessageFlags.Ephemeral });
}

// ---------------------------------------------------------------------------
// Snake Water Gun game button handler
// ---------------------------------------------------------------------------
async function handleSwgButton(interaction, client) {
    const parts = interaction.customId.split('_');
    const userChoice = parseInt(parts[1]);
    const ownerId = parts[2];

    if (interaction.user.id !== ownerId) {
        return interaction.reply({ content: 'This game belongs to someone else.', flags: MessageFlags.Ephemeral });
    }

    const EMOJIS = ['🐍', '💧', '🔫'];
    const NAMES = ['Snake', 'Water', 'Gun'];
    const botChoice = Math.floor(Math.random() * 3);
    const result = resolveSwg(userChoice, botChoice);

    let resultText, color;
    if (result === 'tie') {
        resultText = `${emoji.warn} **It's a tie!**`;
        color = 0xfacc15;
    } else if (result === 'win') {
        resultText = `${emoji.tick} **You win!**`;
        color = 0x34c5be;
    } else {
        resultText = `${emoji.cross} **You lose!**`;
        color = 0xef4444;
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(`${emoji.poll} Snake Water Gun`)
        .setDescription(
            `${resultText}\n\n` +
            `**Your choice:** ${EMOJIS[userChoice]} ${NAMES[userChoice]}\n` +
            `**Bot's choice:** ${EMOJIS[botChoice]} ${NAMES[botChoice]}`
        )
        .setFooter({ text: `Played by ${interaction.user.username}` });

    await interaction.update({ embeds: [embed], components: [] });
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------
export async function execute(interaction, client) {
    try {
        if (interaction.isChatInputCommand()) {
            return await handleSlash(interaction, client);
        }
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'help_category_select') {
                return await handleHelpSelect(interaction, client);
            }
        }
        if (interaction.isButton()) {
            const id = interaction.customId;
            if (id.startsWith('invd_') || id.startsWith('lb_') || id.startsWith('sl_')) {
                return await handlePagination(interaction, client);
            }
            if (id.startsWith('greet_')) {
                return await handleGreetButton(interaction);
            }
            if (id.startsWith('swg_')) {
                return await handleSwgButton(interaction, client);
            }
        }
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('greet_modal_')) {
                return await handleGreetModal(interaction);
            }
        }
    } catch (e) {
        logger.error('Interaction', `Error handling ${interaction.customId || interaction.commandName}:`, e?.message || e);
        if (interaction.isRepliable() && !interaction.replied) {
            interaction.reply({ content: 'Something went wrong handling that interaction.', flags: MessageFlags.Ephemeral }).catch(() => null);
        }
    }
}

export default { name, execute };
