// Zalcon — simple TTL/Map cache used for invite snapshots and misc.
export class Cache extends Map {
    constructor(options = {}) {
        super();
        this.defaultTtl = options.defaultTtl ?? 0; // 0 = no expiry
        this._timers = new Map();
    }
    set(key, value, ttl = this.defaultTtl) {
        if (this._timers.has(key)) {
            clearTimeout(this._timers.get(key));
            this._timers.delete(key);
        }
        super.set(key, value);
        if (ttl > 0) {
            const t = setTimeout(() => {
                this.delete(key);
            }, ttl);
            this._timers.set(key, t);
        }
        return this;
    }
    delete(key) {
        if (this._timers.has(key)) {
            clearTimeout(this._timers.get(key));
            this._timers.delete(key);
        }
        return super.delete(key);
    }
    clear() {
        for (const t of this._timers.values()) clearTimeout(t);
        this._timers.clear();
        super.clear();
    }
}

export default Cache;
