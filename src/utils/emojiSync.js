// Zalcon — auto emoji uploader
// On startup, checks for any missing falcon emojis and uploads them from the
// assets/emojis folder to a server the bot has Manage Emojis permission in.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '#utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMOJIS_DIR = path.resolve(__dirname, '../assets/emojis');

// Map of emoji names to their image files in assets/emojis/
// Add more entries here as you add more emoji image files.
const EMOJI_FILES = {
    falcon_home: 'falcon_home.webp',
    // To add more, place the .webp/.png file in assets/emojis/ and add an entry:
    // falcon_arrow: 'falcon_arrow.webp',
    // falcon_invite: 'falcon_invite.webp',
    // etc.
};

// Find a guild where the bot can manage emojis
function findUploadGuild(client) {
    for (const guild of client.guilds.cache.values()) {
        if (guild.members.me?.permissions?.has('ManageEmojisAndStickers')) {
            return guild;
        }
    }
    return null;
}

// Upload a single emoji to a guild from a file
async function uploadEmoji(guild, name, filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).slice(1).toLowerCase();
        const mimeType = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
        const base64 = buffer.toString('base64');
        const dataURI = `data:${mimeType};base64,${base64}`;

        const created = await guild.emojis.create({ attachment: dataURI, name });
        logger.success('Emoji', `Uploaded :${name}: to ${guild.name} (id: ${created.id})`);
        return created;
    } catch (e) {
        logger.error('Emoji', `Failed to upload :${name}: to ${guild.name}: ${e.message}`);
        return null;
    }
}

// Check all required emojis and upload any missing ones
export async function syncEmojis(client) {
    // First, fetch all emojis from all guilds to populate the cache
    for (const guild of client.guilds.cache.values()) {
        try {
            await guild.emojis.fetch();
        } catch {}
    }

    const uploadGuild = findUploadGuild(client);
    if (!uploadGuild) {
        logger.warn('Emoji', 'No guild with Manage Emojis permission — cannot auto-upload emojis. Upload them manually.');
        return;
    }

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const [name, file] of Object.entries(EMOJI_FILES)) {
        // Check if emoji already exists in any guild
        const existing = client.emojis.cache.find((e) => e.name === name);
        if (existing) {
            skipped++;
            continue;
        }

        // Try to upload from the assets folder
        const filePath = path.join(EMOJIS_DIR, file);
        if (!fs.existsSync(filePath)) {
            logger.warn('Emoji', `:${name}: missing from assets folder (${file})`);
            failed++;
            continue;
        }

        const created = await uploadEmoji(uploadGuild, name, filePath);
        if (created) uploaded++;
        else failed++;
    }

    if (uploaded > 0) {
        logger.success('Emoji', `Auto-uploaded ${uploaded} emoji(s) to ${uploadGuild.name}`);
    }
    if (skipped > 0) {
        logger.info('Emoji', `${skipped} emoji(s) already exist — skipped`);
    }
    if (failed > 0) {
        logger.warn('Emoji', `${failed} emoji(s) could not be uploaded`);
    }
}

export default syncEmojis;
