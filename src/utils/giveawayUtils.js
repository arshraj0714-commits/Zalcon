// Zalcon — giveaway utilities
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} from 'discord.js';
import { config } from '#config';
import { logger } from '#utils';

// Reaction emoji used for giveaway entry.
export const GWAY_EMOJI_ID = '🎁';

// In-memory store of active/ended giveaways keyed by message id.
export const giveawayStore = new Map();

function buildEndedComponents(prize, winners, hostId, endTimestamp, winnerIds) {
    const container = new ContainerBuilder().setAccentColor(config.accentColor);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 🎉 GIVEAWAY ENDED`),
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    const winnerText = winnerIds.length
        ? winnerIds.map((id) => `<@${id}>`).join(' ')
        : 'No valid entries';

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            [
                `**Prize:** ${prize}`,
                `**Winners:** ${winnerText}`,
                `**Hosted by:** <@${hostId}>`,
                `**Ended:** <t:${endTimestamp}:R>`,
            ].join('\n'),
        ),
    );

    return [container];
}

export function buildActiveComponents(prize, winners, endTimestamp, hostId) {
    const container = new ContainerBuilder().setAccentColor(config.accentColor);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 🎉 GIVEAWAY`),
    );

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            [
                `**Prize:** ${prize}`,
                `**Winners:** ${winners}`,
                `**Hosted by:** <@${hostId}>`,
                `**Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)`,
                ``,
                `React with ${GWAY_EMOJI_ID} to enter!`,
            ].join('\n'),
        ),
    );

    return [container];
}

export async function endGiveaway(messageId, entry) {
    if (!entry) return;
    const participants = [...(entry.participants || [])];

    const winnerIds = [];
    const pool = [...participants];
    const count = Math.min(entry.winners || 1, pool.length);
    for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        winnerIds.push(pool.splice(idx, 1)[0]);
    }

    entry.status = 'ended';
    entry.lastWinners = winnerIds;
    if (entry.timerId) {
        clearTimeout(entry.timerId);
        entry.timerId = null;
    }
    giveawayStore.set(messageId, entry);

    try {
        if (entry.giveawayMsg) {
            const endedComponents = buildEndedComponents(
                entry.prize,
                entry.winners,
                entry.hostId,
                entry.endTimestamp,
                winnerIds,
            );
            await entry.giveawayMsg.edit({
                components: endedComponents,
                flags: MessageFlags.IsComponentsV2,
            });
        }
    } catch (e) {
        logger.error('Giveaway', `Failed to edit giveaway message ${messageId}`, e?.message || e);
    }

    try {
        if (winnerIds.length && entry.giveawayMsg?.channel) {
            const content = `Congratulations ${winnerIds.map((id) => `<@${id}>`).join(' ')}! You won **${entry.prize}** hosted by <@!${entry.hostId}>`;
            await entry.giveawayMsg.channel.send({ content });
        }
    } catch (e) {
        logger.error('Giveaway', `Failed to announce winners for ${messageId}`, e?.message || e);
    }
}
