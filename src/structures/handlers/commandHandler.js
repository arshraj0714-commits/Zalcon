// Zalcon — command loader & slash registration
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from '#config';
import { logger } from '#utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = path.resolve(__dirname, '../../commands');

export class CommandHandler {
    constructor(client) {
        this.client = client;
    }

    async loadCommands() {
        const files = this._walk(COMMANDS_DIR);
        let loaded = 0;
        for (const file of files) {
            try {
                const mod = await import(`file://${file}`);
                const command = mod.default;
                if (!command || !command.name) {
                    logger.warn('Commands', `Skipping ${path.basename(file)} — no default export with a name`);
                    continue;
                }
                this._register(command);
                loaded++;
            } catch (e) {
                logger.error('Commands', `Failed to load ${path.basename(file)}:`, e?.message || e);
            }
        }
        logger.success('Commands', `Loaded ${loaded} commands (${files.length} files scanned)`);

        // Build lookups
        this._buildLookups();
    }

    _register(command) {
        const fullName = command.fullName;
        this.client.commands.set(fullName, command);
    }

    _buildLookups() {
        const byPrimary = new Map();
        const aliasMap = new Map();

        for (const cmd of this.client.commands.values()) {
            const primary = cmd.primaryName?.toLowerCase();
            if (!primary) continue;
            if (!byPrimary.has(primary)) byPrimary.set(primary, []);
            byPrimary.get(primary).push(cmd);

            for (const alias of cmd.aliases || []) {
                aliasMap.set(String(alias).toLowerCase(), cmd);
            }
        }

        this.client.commandsByPrimary = byPrimary;
        this.client.aliasMap = aliasMap;
    }

    _walk(dir) {
        const out = [];
        let entries = [];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) out.push(...this._walk(full));
            else if (entry.name.endsWith('.js')) out.push(full);
        }
        return out;
    }

    // -----------------------------------------------------------------------
    // Slash command registration
    // -----------------------------------------------------------------------
    async registerSlash() {
        const topLevel = [];       // SlashCommandBuilder
        const subcommandGroups = new Map(); // primaryName -> { builder, subs: [] }

        for (const cmd of this.client.commands.values()) {
            if (!cmd.enabledSlash || !cmd.slashData) continue;

            if (cmd.isSubcommand) {
                const primary = cmd.primaryName.toLowerCase();
                if (!subcommandGroups.has(primary)) {
                    subcommandGroups.set(primary, {
                        builder: new SlashCommandBuilder()
                            .setName(primary)
                            .setDescription(cmd.slashData.description || `${primary} subcommands`),
                        subs: [],
                    });
                }
                subcommandGroups.get(primary).subs.push(cmd);
            } else {
                topLevel.push(this._buildTopLevel(cmd));
            }
        }

        for (const { builder, subs } of subcommandGroups.values()) {
            for (const sub of subs) {
                builder.addSubcommand((s) => {
                    s.setName(sub.name[1].toLowerCase())
                     .setDescription(sub.slashData.description || sub.description || 'Subcommand');
                    this._applyOptions(s, sub.slashData.options);
                    if (sub.slashData.defaultMemberPermissions !== undefined) {
                        s.setDefaultMemberPermissions(sub.slashData.defaultMemberPermissions);
                    }
                    return s;
                });
            }
            topLevel.push(builder);
        }

        const payload = topLevel.map((b) => (typeof b.toJSON === 'function' ? b.toJSON() : b));

        const rest = new REST({ version: '10' }).setToken(config.token);

        try {
            if (config.globalSlash) {
                await rest.put(Routes.applicationCommands(config.clientId), { body: payload });
                logger.success('Slash', `Registered ${payload.length} global slash command(s)`);
            } else {
                // register to the first guild for fast testing
                const guild = this.client.guilds.cache.first();
                if (guild) {
                    await rest.put(Routes.applicationGuildCommands(config.clientId, guild.id), { body: payload });
                    logger.success('Slash', `Registered ${payload.length} guild slash command(s) in ${guild.name}`);
                } else {
                    logger.warn('Slash', 'No guild available for guild-scoped slash registration; skipping');
                }
            }

            // Build slash lookup map for interaction handling
            for (const cmd of this.client.commands.values()) {
                if (!cmd.enabledSlash) continue;
                const key = cmd.isSubcommand ? `${cmd.primaryName.toLowerCase()}:${cmd.name[1].toLowerCase()}` : cmd.primaryName.toLowerCase();
                this.client.slashCommands.set(key, cmd);
            }
        } catch (e) {
            logger.error('Slash', 'Failed to register slash commands:', e?.message || e);
        }
    }

    _buildTopLevel(cmd) {
        const data = cmd.slashData;
        const builder = new SlashCommandBuilder()
            .setName(String(cmd.primaryName).toLowerCase())
            .setDescription(data.description || cmd.description || 'No description');
        this._applyOptions(builder, data.options);
        if (data.defaultMemberPermissions !== undefined) {
            builder.setDefaultMemberPermissions(data.defaultMemberPermissions);
        }
        return builder;
    }

    _applyOptions(builder, options) {
        if (!options || !options.length) return builder;
        for (const opt of options) {
            const type = opt.type;
            const { name, description, required, choices, min_value, max_value, channel_types } = opt;
            switch (type) {
                case 3: // STRING
                    builder.addStringOption((o) => {
                        o.setName(name).setDescription(description || 'string').setRequired(!!required);
                        if (choices) o.addChoices(...choices);
                        if (min_value !== undefined) o.setMinLength(min_value);
                        if (max_value !== undefined) o.setMaxLength(max_value);
                        return o;
                    });
                    break;
                case 4: // INTEGER
                    builder.addIntegerOption((o) => {
                        o.setName(name).setDescription(description || 'integer').setRequired(!!required);
                        if (min_value !== undefined) o.setMinValue(min_value);
                        if (max_value !== undefined) o.setMaxValue(max_value);
                        if (choices) o.addChoices(...choices);
                        return o;
                    });
                    break;
                case 5: // BOOLEAN
                    builder.addBooleanOption((o) => o.setName(name).setDescription(description || 'boolean').setRequired(!!required));
                    break;
                case 6: // USER
                    builder.addUserOption((o) => o.setName(name).setDescription(description || 'user').setRequired(!!required));
                    break;
                case 7: // CHANNEL
                    builder.addChannelOption((o) => {
                        o.setName(name).setDescription(description || 'channel').setRequired(!!required);
                        if (channel_types) o.addChannelTypes(...channel_types);
                        return o;
                    });
                    break;
                case 8: // ROLE
                    builder.addRoleOption((o) => o.setName(name).setDescription(description || 'role').setRequired(!!required));
                    break;
                case 9: // MENTIONABLE
                    builder.addMentionableOption((o) => o.setName(name).setDescription(description || 'mentionable').setRequired(!!required));
                    break;
                case 10: // NUMBER
                    builder.addNumberOption((o) => {
                        o.setName(name).setDescription(description || 'number').setRequired(!!required);
                        if (min_value !== undefined) o.setMinValue(min_value);
                        if (max_value !== undefined) o.setMaxValue(max_value);
                        return o;
                    });
                    break;
                case 11: // ATTACHMENT
                    builder.addAttachmentOption((o) => o.setName(name).setDescription(description || 'attachment').setRequired(!!required));
                    break;
                default:
                    break;
            }
        }
        return builder;
    }
}

export default CommandHandler;
