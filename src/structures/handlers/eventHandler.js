// Zalcon — event loader
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '#utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_DIR = path.resolve(__dirname, '../../events');

export class EventHandler {
    constructor(client) {
        this.client = client;
    }

    async loadEvents() {
        const files = this._walk(EVENTS_DIR);
        let loaded = 0;
        for (const file of files) {
            try {
                const mod = await import(`file://${file}`);
                const event = mod.default;
                if (!event || !event.name) {
                    logger.warn('Events', `Skipping ${path.basename(file)} — no default export with a name`);
                    continue;
                }
                const handler = (...args) => event.execute(...args, this.client).catch((e) => {
                    logger.error('Events', `Error in ${event.name}:`, e?.message || e);
                });
                if (event.once) {
                    this.client.once(event.name, handler);
                } else {
                    this.client.on(event.name, handler);
                }
                loaded++;
            } catch (e) {
                logger.error('Events', `Failed to load ${path.basename(file)}:`, e?.message || e);
            }
        }
        logger.success('Events', `Loaded ${loaded} events`);
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
}

export default EventHandler;
