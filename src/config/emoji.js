// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ZALCON — EMOJI CONFIGURATION                                             ║
// ║                                                                           ║
// ║  The bot uses Discord's emoji name syntax (:falcon_news:) which Discord  ║
// ║  automatically renders as the custom emoji IF the emoji is uploaded to   ║
// ║  a server the bot is in.                                                  ║
// ║                                                                           ║
// ║  Required emoji names (upload these .webp files to your server):          ║
// ║    falcon_arrow, falcon_contact, falcon_giveaway, falcon_greet,           ║
// ║    falcon_invites, falcon_moderation, falcon_msg, falcon_news,            ║
// ║    Falcon_poll (capital F!), falcon_timer, falcon_utility                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─── Discord client reference (set automatically on startup) ───────────────
let _client = null;

export function setClient(client) {
    _client = client;
}

// ─── Emoji name → Discord name format mapping ───────────────────────────────
// These map short names to the full falcon emoji names.
// When resolved, they return :falcon_news: format which Discord renders
// as the custom emoji if it's uploaded to a server the bot is in.
const EMOJI_NAMES = {
    arrow:        'falcon_arrow',
    invites:      'falcon_invite',       // used in -help panel
    invitesLog:   'falcon_invites',      // used in -invites command log
    messages:     'falcon_msg',
    giveaway:    'falcon_giveaway',
    greet:       'falcon_greet',
    timer:       'falcon_timer',
    moderation:  'falcon_moderation',
    poll:        'Falcon_poll',
    utility:     'falcon_utility',
    contact:     'falcon_contact',
    news:        'falcon_news',
    tick:        'falcon_tick',
    cross:       'falcon_cross',
    info:        'falcon_info',
    home:        'falcon_home',
    users:       'falcon_users',
    server:      'falcon_server',
    clock:       'falcon_clock',
    star:        'falcon_star',
    trophy:      'falcon_trophy',
    link:        'falcon_link',
    trash:       'falcon_trash',
    settings:    'falcon_settings',
    warn:        'falcon_warn',
};

// ─── Look up a custom emoji by name ─────────────────────────────────────────
// Returns the full <:name:id> format if the emoji is in the bot's cache.
// Falls back to :name: format (which Discord renders if the emoji exists).
function resolveEmoji(name) {
    // First, try to find the emoji in the bot's cache (for full <:name:id> format)
    if (_client?.emojis?.cache) {
        const found = _client.emojis.cache.find((e) => e.name === name);
        if (found) {
            return found.animated ? `<a:${found.name}:${found.id}>` : `<:${found.name}:${found.id}>`;
        }
    }
    // Fallback: return :name: format — Discord renders this as the custom emoji
    // if it's uploaded to a server the bot is in. If not, it shows as :name: text.
    return `:${name}:`;
}

// Resolve an emoji to a raw object for use in select menus and buttons.
// Discord's select menu option `emoji` field requires either a unicode string
// or an object { id, name, animated } — NOT a :name: text string.
// Returns null if the emoji isn't found in the bot's cache.
export function resolveEmojiObject(name) {
    if (_client?.emojis?.cache) {
        const found = _client.emojis.cache.find((e) => e.name === name);
        if (found) {
            return { id: found.id, name: found.name, animated: found.animated };
        }
    }
    return null;
}

// ─── Exported emoji object ───────────────────────────────────────────────────
export const emoji = {
    get arrow()      { return resolveEmoji(EMOJI_NAMES.arrow); },
    get invites()    { return resolveEmoji(EMOJI_NAMES.invites); },
    get invitesLog() { return resolveEmoji(EMOJI_NAMES.invitesLog); },
    get messages()   { return resolveEmoji(EMOJI_NAMES.messages); },
    get giveaway()   { return resolveEmoji(EMOJI_NAMES.giveaway); },
    get greet()      { return resolveEmoji(EMOJI_NAMES.greet); },
    get timer()      { return resolveEmoji(EMOJI_NAMES.timer); },
    get moderation() { return resolveEmoji(EMOJI_NAMES.moderation); },
    get poll()       { return resolveEmoji(EMOJI_NAMES.poll); },
    get utility()    { return resolveEmoji(EMOJI_NAMES.utility); },
    get contact()    { return resolveEmoji(EMOJI_NAMES.contact); },
    get news()       { return resolveEmoji(EMOJI_NAMES.news); },
    get tick()       { return resolveEmoji(EMOJI_NAMES.tick); },
    get cross()      { return resolveEmoji(EMOJI_NAMES.cross); },
    get info()       { return resolveEmoji(EMOJI_NAMES.info); },
    get home()       { return resolveEmoji(EMOJI_NAMES.home); },
    get users()      { return resolveEmoji(EMOJI_NAMES.users); },
    get server()     { return resolveEmoji(EMOJI_NAMES.server); },
    get clock()      { return resolveEmoji(EMOJI_NAMES.clock); },
    get star()       { return resolveEmoji(EMOJI_NAMES.star); },
    get trophy()     { return resolveEmoji(EMOJI_NAMES.trophy); },
    get link()       { return resolveEmoji(EMOJI_NAMES.link); },
    get trash()      { return resolveEmoji(EMOJI_NAMES.trash); },
    get settings()   { return resolveEmoji(EMOJI_NAMES.settings); },
    get warn()       { return resolveEmoji(EMOJI_NAMES.warn); },

    // Category emojis for help panel
    get categories() {
        return {
            index:      resolveEmoji(EMOJI_NAMES.home),
            invites:    resolveEmoji(EMOJI_NAMES.invites),
            messages:   resolveEmoji(EMOJI_NAMES.messages),
            giveaways:  resolveEmoji(EMOJI_NAMES.giveaway),
            greet:      resolveEmoji(EMOJI_NAMES.greet),
            timer:      resolveEmoji(EMOJI_NAMES.timer),
            moderation: resolveEmoji(EMOJI_NAMES.moderation),
            polls:      resolveEmoji(EMOJI_NAMES.poll),
            utility:    resolveEmoji(EMOJI_NAMES.utility),
            contact:    resolveEmoji(EMOJI_NAMES.contact),
        };
    },

    // Pagination (keep unicode for these — they're standard Discord emoji)
    pageFirst: '⏪',
    pagePrev:  '◀️',
    pageNext:  '▶️',
    pageLast:  '⏩',

    // Dynamic getter: emoji.get('falcon_arrow') or emoji.get('arrow')
    get(name) {
        if (typeof name !== 'string') return '';
        // Direct falcon emoji name lookup (e.g. 'falcon_news')
        if (name.startsWith('falcon_') || name.startsWith('Falcon_')) {
            return resolveEmoji(name);
        }
        // Short name lookup (e.g. 'arrow' → resolveEmoji('falcon_arrow'))
        if (EMOJI_NAMES[name]) {
            return resolveEmoji(EMOJI_NAMES[name]);
        }
        return `:${name}:`;
    },
};

export default emoji;
