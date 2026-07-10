// Zalcon — Command base class
import { config } from '#config';
import { logger } from '#utils';

export class Command {
    constructor(options = {}) {
        this.name = options.name ?? null;
        this.description = options.description ?? 'No description provided';
        this.aliases = options.aliases ?? [];
        this.category = options.category ?? 'general';
        this.usage = options.usage ?? null;
        this.examples = options.examples ?? [];
        this.cooldown = options.cooldown ?? 0;
        this.enabledSlash = options.enabledSlash ?? false;
        this.slashData = options.slashData ?? null;
        this.ownerOnly = options.ownerOnly ?? false;
        this.userPermissions = options.userPermissions ?? [];
        this.permissions = options.permissions ?? [];
        this.minArgs = options.minArgs ?? 0;
        this.shouldNotDefer = options.shouldNotDefer ?? false;
        this.disabled = options.disabled ?? false;
        this.guildOnly = options.guildOnly ?? true;
    }

    // The "primary" name — first element if name is an array (subcommand).
    get primaryName() {
        return Array.isArray(this.name) ? this.name[0] : this.name;
    }

    // Full name path joined by space (for subcommands).
    get fullName() {
        return Array.isArray(this.name) ? this.name.join(' ') : this.name;
    }

    // Whether this command is a subcommand (name is an array with >1 element).
    get isSubcommand() {
        return Array.isArray(this.name) && this.name.length > 1;
    }

    async execute({ ctx }) {
        return ctx.reply({ content: `The command \`${this.fullName}\` has not been implemented yet.`, flags: 1 << 6 });
    }

    // Cooldown check helper (returns remaining ms, or 0 if okay).
    checkCooldown(userId, cooldowns) {
        if (!this.cooldown || this.cooldown <= 0) return 0;
        const key = `${this.fullName}:${userId}`;
        const now = Date.now();
        const expires = cooldowns.get(key);
        if (expires && expires > now) return Math.ceil((expires - now) / 1000);
        cooldowns.set(key, now + this.cooldown * 1000);
        return 0;
    }
}

export default Command;
