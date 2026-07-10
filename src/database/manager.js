// Zalcon — database manager
// Provides a local JSON-file backed database that exposes the exact API the
// command layer expects: db.guild, db.userInviteCounter, db.userMessageCounter,
// db.memberInviter, db.blacklist.
//
// Data is persisted under ./data/*.json so the bot runs with zero external
// dependencies. If a MongoDB URI is supplied in config, the same API can be
// swapped for a Mongo-backed implementation without touching command code.

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Local minimal logger to avoid a circular dependency with #utils.
const logger = {
    info: (...a) => console.log('[db]', ...a),
    error: (...a) => console.error('[db]', ...a),
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

await fs.ensureDir(DATA_DIR);

// ---------------------------------------------------------------------------
// Generic JSON store
// ---------------------------------------------------------------------------
class JsonStore {
    constructor(fileName, defaultValue) {
        this.filePath = path.join(DATA_DIR, fileName);
        this.defaultValue = defaultValue;
        this.data = this._load();
    }
    _load() {
        try {
            const raw = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(raw);
        } catch {
            return typeof this.defaultValue === 'function' ? this.defaultValue() : this.defaultValue;
        }
    }
    _save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
        } catch (e) {
            logger.error('Database', `Failed to persist ${path.basename(this.filePath)}`, e);
        }
    }
    save() { this._save(); }
    all() { return this.data; }
}

// Guild settings store: { [guildId]: { prefix, joinChannel, leaveChannel, joinMessage, leaveMessage, messageBlacklist: [], greetConfigs: [] } }
const guildStore = new JsonStore('guilds.json', () => ({}));
// Invite counters: { [`${guildId}:${userId}`]: { guildId, userId, total, joins, left, fake, rejoins } }
const inviteStore = new JsonStore('inviteCounters.json', () => ({}));
// Message counters: { [`${guildId}:${userId}`]: { guildId, userId, total, todayCount, lastResetDate } }
const messageStore = new JsonStore('messageCounters.json', () => ({}));
// Member inviter map: { [`${guildId}:${memberId}`]: { guildId, memberId, inviterId, joinedAt } }
const inviterStore = new JsonStore('memberInviters.json', () => ({}));
// Blacklist: array of { id, type, reason, blacklistedBy, created_at }
const blacklistStore = new JsonStore('blacklist.json', () => []);

// Save periodically (debounced) to avoid writing on every mutation.
let saveTimer = null;
function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        guildStore.save();
        inviteStore.save();
        messageStore.save();
        inviterStore.save();
        blacklistStore.save();
    }, 1500);
}

function nowISO() { return new Date().toISOString(); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

// ---------------------------------------------------------------------------
// Guild repository
// ---------------------------------------------------------------------------
const guildRepo = {
    _doc(guildId) {
        if (!guildStore.data[guildId]) {
            guildStore.data[guildId] = {
                prefix: null,
                joinChannel: null,
                leaveChannel: null,
                joinMessage: null,
                leaveMessage: null,
                messageBlacklist: [],
                greetConfigs: [],
            };
        }
        return guildStore.data[guildId];
    },
    getGuild(guildId) { return this._doc(guildId); },

    getPrefix(guildId) { return this._doc(guildId).prefix; },
    setPrefix(guildId, prefix) { this._doc(guildId).prefix = prefix; scheduleSave(); },
    deletePrefix(guildId) { this._doc(guildId).prefix = null; scheduleSave(); },

    getJoinChannel(guildId) { return this._doc(guildId).joinChannel; },
    setJoinChannel(guildId, channelId) { this._doc(guildId).joinChannel = channelId; scheduleSave(); },
    getLeaveChannel(guildId) { return this._doc(guildId).leaveChannel; },
    setLeaveChannel(guildId, channelId) { this._doc(guildId).leaveChannel = channelId; scheduleSave(); },

    getJoinMessage(guildId) { return this._doc(guildId).joinMessage; },
    setJoinMessage(guildId, message) { this._doc(guildId).joinMessage = message; scheduleSave(); },
    getLeaveMessage(guildId) { return this._doc(guildId).leaveMessage; },
    setLeaveMessage(guildId, message) { this._doc(guildId).leaveMessage = message; scheduleSave(); },

    getMessageBlacklistedChannels(guildId) { return this._doc(guildId).messageBlacklist || []; },
    addMessageBlacklistedChannel(guildId, channelId) {
        const doc = this._doc(guildId);
        doc.messageBlacklist = doc.messageBlacklist || [];
        if (doc.messageBlacklist.includes(channelId)) return false;
        doc.messageBlacklist.push(channelId);
        scheduleSave();
        return true;
    },
    removeMessageBlacklistedChannel(guildId, channelId) {
        const doc = this._doc(guildId);
        doc.messageBlacklist = doc.messageBlacklist || [];
        const i = doc.messageBlacklist.indexOf(channelId);
        if (i === -1) return false;
        doc.messageBlacklist.splice(i, 1);
        scheduleSave();
        return true;
    },

    getGreetConfigs(guildId) { return this._doc(guildId).greetConfigs || []; },
    addGreetConfig(guildId, cfg) {
        const doc = this._doc(guildId);
        doc.greetConfigs = doc.greetConfigs || [];
        doc.greetConfigs.push(cfg);
        scheduleSave();
    },
    updateGreetConfig(guildId, channelId, partial) {
        const doc = this._doc(guildId);
        doc.greetConfigs = doc.greetConfigs || [];
        const idx = doc.greetConfigs.findIndex((c) => c.channelId === channelId);
        if (idx === -1) return false;
        doc.greetConfigs[idx] = { ...doc.greetConfigs[idx], ...partial };
        scheduleSave();
        return true;
    },
    removeGreetConfigByChannel(guildId, channelId) {
        const doc = this._doc(guildId);
        doc.greetConfigs = doc.greetConfigs || [];
        const before = doc.greetConfigs.length;
        doc.greetConfigs = doc.greetConfigs.filter((c) => c.channelId !== channelId);
        const removed = doc.greetConfigs.length < before;
        scheduleSave();
        return removed;
    },
    clearGreetConfig(guildId) {
        this._doc(guildId).greetConfigs = [];
        scheduleSave();
    },
};

// ---------------------------------------------------------------------------
// Invite counter repository
// ---------------------------------------------------------------------------
const inviteKey = (g, u) => `${g}:${u}`;
const inviteCounterRepo = {
    _doc(guildId, userId) {
        const k = inviteKey(guildId, userId);
        if (!inviteStore.data[k]) {
            inviteStore.data[k] = { guildId, userId, total: 0, joins: 0, left: 0, fake: 0, rejoins: 0 };
        }
        return inviteStore.data[k];
    },
    get(guildId, userId) {
        return inviteStore.data[inviteKey(guildId, userId)] || null;
    },
    getCount(guildId, userId) {
        const d = inviteStore.data[inviteKey(guildId, userId)];
        if (!d) return { total: 0, joins: 0, left: 0, fake: 0, rejoins: 0 };
        return { total: d.total, joins: d.joins, left: d.left, fake: d.fake, rejoins: d.rejoins };
    },
    getAllByGuild(guildId) {
        return Object.values(inviteStore.data).filter((d) => d.guildId === guildId);
    },
    addCount(guildId, userId, amount) {
        const d = this._doc(guildId, userId);
        d.total = Math.max(0, (d.total || 0) + amount);
        scheduleSave();
    },
    removeCount(guildId, userId, amount) {
        const d = this._doc(guildId, userId);
        d.total = Math.max(0, (d.total || 0) - amount);
        scheduleSave();
    },
    addFakeCount(guildId, userId, amount) {
        const d = this._doc(guildId, userId);
        d.fake = Math.max(0, (d.fake || 0) + amount);
        scheduleSave();
    },
    removeFakeCount(guildId, userId, amount) {
        const d = this._doc(guildId, userId);
        d.fake = Math.max(0, (d.fake || 0) - amount);
        scheduleSave();
    },
    incrementJoin(guildId, userId) {
        const d = this._doc(guildId, userId);
        d.joins = (d.joins || 0) + 1;
        d.total = (d.total || 0) + 1;
        scheduleSave();
    },
    incrementLeave(guildId, userId) {
        const d = this._doc(guildId, userId);
        d.left = (d.left || 0) + 1;
        d.total = Math.max(0, (d.total || 0) - 1);
        scheduleSave();
    },
    incrementRejoin(guildId, userId) {
        const d = this._doc(guildId, userId);
        d.rejoins = (d.rejoins || 0) + 1;
        d.total = (d.total || 0) + 1;
        scheduleSave();
    },
    incrementFake(guildId, userId) {
        const d = this._doc(guildId, userId);
        d.fake = (d.fake || 0) + 1;
        scheduleSave();
    },
    resetAll(guildId, userId) {
        const k = inviteKey(guildId, userId);
        inviteStore.data[k] = { guildId, userId, total: 0, joins: 0, left: 0, fake: 0, rejoins: 0 };
        scheduleSave();
    },
    resetCount(guildId, userId) { this.resetAll(guildId, userId); },
};

// ---------------------------------------------------------------------------
// Message counter repository
// ---------------------------------------------------------------------------
const messageCounterRepo = {
    _doc(guildId, userId) {
        const k = inviteKey(guildId, userId);
        if (!messageStore.data[k]) {
            messageStore.data[k] = { guildId, userId, total: 0, todayCount: 0, lastResetDate: todayStr() };
        }
        return messageStore.data[k];
    },
    get(guildId, userId) {
        return messageStore.data[inviteKey(guildId, userId)] || null;
    },
    getCount(guildId, userId) {
        const d = messageStore.data[inviteKey(guildId, userId)];
        if (!d) return { total: 0, todayCount: 0, lastResetDate: null };
        const today = todayStr();
        const todayCount = d.lastResetDate === today ? (d.todayCount || 0) : 0;
        return { total: d.total || 0, todayCount, lastResetDate: d.lastResetDate };
    },
    getAllByGuild(guildId) {
        const today = todayStr();
        return Object.values(messageStore.data)
            .filter((d) => d.guildId === guildId)
            .map((d) => ({
                ...d,
                todayCount: d.lastResetDate === today ? (d.todayCount || 0) : 0,
            }));
    },
    addCount(guildId, userId, amount) {
        const d = this._doc(guildId, userId);
        d.total = Math.max(0, (d.total || 0) + amount);
        scheduleSave();
    },
    removeCount(guildId, userId, amount) {
        const d = this._doc(guildId, userId);
        d.total = Math.max(0, (d.total || 0) - amount);
        scheduleSave();
    },
    incrementMessage(guildId, userId) {
        const d = this._doc(guildId, userId);
        const today = todayStr();
        if (d.lastResetDate !== today) {
            d.lastResetDate = today;
            d.todayCount = 0;
        }
        d.total = (d.total || 0) + 1;
        d.todayCount = (d.todayCount || 0) + 1;
        scheduleSave();
    },
    resetCount(guildId, userId) {
        const k = inviteKey(guildId, userId);
        messageStore.data[k] = { guildId, userId, total: 0, todayCount: 0, lastResetDate: todayStr() };
        scheduleSave();
    },
};

// ---------------------------------------------------------------------------
// Member inviter repository
// ---------------------------------------------------------------------------
const memberInviterRepo = {
    get(guildId, memberId) {
        return inviterStore.data[inviteKey(guildId, memberId)] || null;
    },
    set(guildId, memberId, inviterId, joinedAt) {
        inviterStore.data[inviteKey(guildId, memberId)] = {
            guildId, memberId, inviterId, joinedAt: joinedAt || Date.now(),
        };
        scheduleSave();
    },
    getAllByInviter(guildId, inviterId) {
        return Object.values(inviterStore.data).filter(
            (d) => d.guildId === guildId && d.inviterId === inviterId,
        );
    },
    remove(guildId, memberId) {
        const k = inviteKey(guildId, memberId);
        delete inviterStore.data[k];
        scheduleSave();
    },
};

// ---------------------------------------------------------------------------
// Blacklist repository
// ---------------------------------------------------------------------------
const blacklistRepo = {
    checkBlacklist(id) {
        return blacklistStore.data.some((e) => e.id === id);
    },
    getBlacklist(id) {
        return blacklistStore.data.find((e) => e.id === id) || null;
    },
    blacklistUser(id, blacklistedBy, reason) {
        if (this.checkBlacklist(id)) return;
        blacklistStore.data.push({ id, type: 'user', reason: reason || 'No reason provided', blacklistedBy, created_at: nowISO() });
        scheduleSave();
    },
    blacklistGuild(id, blacklistedBy, reason) {
        if (this.checkBlacklist(id)) return;
        blacklistStore.data.push({ id, type: 'guild', reason: reason || 'No reason provided', blacklistedBy, created_at: nowISO() });
        scheduleSave();
    },
    unblacklist(id) {
        const before = blacklistStore.data.length;
        blacklistStore.data = blacklistStore.data.filter((e) => e.id !== id);
        scheduleSave();
        return blacklistStore.data.length < before;
    },
    getAllBlacklist(type) {
        if (type && type !== 'all') return blacklistStore.data.filter((e) => e.type === type);
        return [...blacklistStore.data];
    },
};

// ---------------------------------------------------------------------------
// Public db object
// ---------------------------------------------------------------------------
export const db = {
    guild: guildRepo,
    userInviteCounter: inviteCounterRepo,
    userMessageCounter: messageCounterRepo,
    memberInviter: memberInviterRepo,
    blacklist: blacklistRepo,
    async init() {
        // ensure files exist on disk
        guildStore.save(); inviteStore.save(); messageStore.save(); inviterStore.save(); blacklistStore.save();
        logger.info('Database', 'Local JSON database ready');
    },
    async disconnect() {
        guildStore.save(); inviteStore.save(); messageStore.save(); inviterStore.save(); blacklistStore.save();
    },
};

export default db;
