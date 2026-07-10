// Zalcon — timer utilities (server-side named timers that persist across restarts)
import { logger } from '#utils';

// In-memory timer store keyed by `${guildId}:${name}`.
export const timerStore = new Map();

export function parseDuration(str) {
    if (!str) return null;
    const match = String(str).match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[unit];
}

export function startTimer(id, durationMs, onEnd) {
    clearTimer(id);
    const timerId = setTimeout(() => {
        timerStore.delete(id);
        try { onEnd?.(); } catch (e) { logger.error('Timer', `onEnd failed for ${id}`, e); }
    }, durationMs);
    timerStore.set(id, { timerId, endsAt: Date.now() + durationMs });
    return timerId;
}

export function clearTimer(id) {
    const entry = timerStore.get(id);
    if (entry) {
        clearTimeout(entry.timerId);
        timerStore.delete(id);
        return true;
    }
    return false;
}

export function getTimer(id) {
    return timerStore.get(id) || null;
}

export function clearAllTimers() {
    for (const { timerId } of timerStore.values()) clearTimeout(timerId);
    timerStore.clear();
}
