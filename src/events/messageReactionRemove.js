// Zalcon — messageReactionRemove (giveaway entry withdrawal)
import { giveawayStore, GWAY_EMOJI_ID } from '#giveawayUtils';

export const name = 'messageReactionRemove';

export async function execute(reaction, user, client) {
    try {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch().catch(() => null);
        if (reaction.message?.partial) await reaction.message.fetch().catch(() => null);
        if (!reaction.message) return;

        const entry = giveawayStore.get(reaction.message.id);
        if (!entry || entry.status !== 'active') return;

        const reactedEmoji = reaction.emoji.name;
        const isMatch = reactedEmoji === GWAY_EMOJI_ID ||
            reaction.emoji.identifier === GWAY_EMOJI_ID ||
            reactedEmoji === '🎁';
        if (!isMatch) return;

        entry.participants = entry.participants || new Set();
        entry.participants.delete(user.id);
        giveawayStore.set(reaction.message.id, entry);
    } catch {}
}

export default { name, execute };
