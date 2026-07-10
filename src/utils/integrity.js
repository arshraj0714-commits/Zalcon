// Zalcon — integrity check (lightweight self-test of the command registry)
import { logger } from '#utils';

export async function integrityCheck(client) {
    const issues = [];
    const seen = new Map();

    for (const cmd of client.commands.values()) {
        const names = Array.isArray(cmd.name) ? cmd.name : [cmd.name];
        for (const n of names) {
            if (!n) continue;
            if (seen.has(n)) issues.push(`Duplicate command name: ${n}`);
            seen.set(n, true);
        }
        if (typeof cmd.execute !== 'function') {
            issues.push(`Command "${names.join(' ')}" has no execute() method`);
        }
    }

    if (issues.length) {
        logger.warn('Integrity', `${issues.length} issue(s) found:`);
        for (const i of issues) logger.warn('Integrity', `  - ${i}`);
    } else {
        logger.success('Integrity', `${client.commands.size} commands registered, no issues`);
    }
    return issues;
}
