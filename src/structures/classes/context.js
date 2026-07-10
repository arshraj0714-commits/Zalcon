// Zalcon — Command execution context
// Wraps either a Message (prefix invocation) or a ChatInputCommandInteraction
// (slash invocation) behind a single API so commands work identically.
import { MessageFlags } from 'discord.js';

export class Context {
    constructor({ client, message = null, interaction = null, args = [], prefix = '', guild = null, channel = null, member = null }) {
        this.client = client;
        this.message = message;
        this.interaction = interaction;
        this.args = args;
        this.prefix = prefix;
        this.isSlash = !!interaction;

        if (interaction) {
            this.options = interaction.options;
            this.user = interaction.user;
            this.author = interaction.user;
            this.member = interaction.member ?? null;
            this.guild = interaction.guild ?? guild;
            this.channel = interaction.channel ?? channel;
        } else {
            this.options = null;
            this.message = message;
            this.user = message.author;
            this.author = message.author;
            this.member = message.member ?? member;
            this.guild = message.guild ?? guild;
            this.channel = message.channel ?? channel;
        }
    }

    async reply(payload) {
        if (this.isSlash) {
            if (this.interaction.deferred && !this.interaction.replied) {
                return this.interaction.editReply(payload);
            }
            return this.interaction.reply(payload);
        }
        // Prefix path: send to the channel.
        if (payload && typeof payload === 'object') {
            const clean = { ...payload };
            // Remove fetchReply (only valid for interactions, not channel.send)
            delete clean.fetchReply;
            // Strip ephemeral flag (messages can't be ephemeral)
            if (clean.flags) {
                if (clean.flags & MessageFlags.Ephemeral) {
                    clean.flags = clean.flags & ~MessageFlags.Ephemeral;
                    if (clean.flags === 0) delete clean.flags;
                }
            }
            this._reply = await this.channel.send(clean);
        } else if (payload && typeof payload === 'string') {
            this._reply = await this.channel.send(payload);
        } else {
            this._reply = await this.channel.send(payload);
        }
        return this._reply;
    }

    async fetchReply() {
        if (this.isSlash) {
            return this.interaction.fetchReply();
        }
        return this._reply || null;
    }

    async deferReply(opts = {}) {
        if (this.isSlash) {
            if (!this.interaction.deferred && !this.interaction.replied) {
                await this.interaction.deferReply(opts);
            }
        }
        // prefix path: no-op
    }
}

export default Context;
