/* ===============================
   globals/storage.js
   Per-page separated localStorage
   - Timer vs Stopwatch vs RTC are isolated by namespace
   - Versioned keys for safe future changes
   - Defaults + migrations + export/import + reset
================================ */

const ROOT_PREFIX = 'clockstuffs';

/* --------------------------------
   Internal helpers
-------------------------------- */
function safeParse(raw, fallback) {
  try { return raw == null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
}
function safeStringify(value) {
  try { return JSON.stringify(value); }
  catch { return null; }
}

/* --------------------------------
   Store factory (namespaced)
-------------------------------- */
export function createStore({
  app = 'site',       // 'timer' | 'stopwatch' | 'rtc' | 'global' | etc
  page = 'default',   // e.g. 'standard', 'smb', 'ggd', 'main'
  version = 1,
  defaults = {},
} = {}) {
  const prefix = `${ROOT_PREFIX}:${app}:${page}:v${version}`;
  const keyOf = (key) => `${prefix}:${key}`;

  /* ---------- listeners (optional) ---------- */
  const listeners = new Map(); // key -> Set(fn)
  function notify(key, value) {
    const set = listeners.get(key);
    if (!set) return;
    for (const fn of set) {
      try { fn(value); } catch {}
    }
  }

  function on(key, fn) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    return () => listeners.get(key)?.delete(fn);
  }

  /* ---------- core ---------- */
  function get(key, fallback = null) {
    const raw = localStorage.getItem(keyOf(key));
    return safeParse(raw, fallback);
  }

  function set(key, value) {
    const raw = safeStringify(value);
    if (raw == null) return false;
    try {
      localStorage.setItem(keyOf(key), raw);
      notify(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(keyOf(key));
      notify(key, undefined);
      return true;
    } catch {
      return false;
    }
  }

  function has(key) {
    try { return localStorage.getItem(keyOf(key)) != null; }
    catch { return false; }
  }

  /* ---------- defaults ---------- */
  function applyDefaults() {
    for (const [k, v] of Object.entries(defaults)) {
      if (!has(k)) set(k, v);
    }
  }

  function getWithDefault(key, fallback = null) {
    if (has(key)) return get(key, fallback);
    if (Object.prototype.hasOwnProperty.call(defaults, key)) return defaults[key];
    return fallback;
  }

  /* ---------- modal position helpers ---------- */
  function getPos(key = 'modalPos', fallback = { x: 0, y: 0 }) {
    const v = get(key, fallback);
    if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y)) return fallback;
    return v;
  }

  function setPos(key = 'modalPos', pos = { x: 0, y: 0 }) {
    return set(key, { x: Number(pos.x) || 0, y: Number(pos.y) || 0 });
  }

  /* ---------- migrations (from older store) ---------- */
  function migrateFrom(oldStore, mapFn) {
    const flagKey = keyOf('__migrated__');
    if (localStorage.getItem(flagKey) === '1') return false;

    try {
      const mapped = mapFn(oldStore);
      if (mapped && typeof mapped === 'object') {
        for (const [k, v] of Object.entries(mapped)) set(k, v);
      }
      localStorage.setItem(flagKey, '1');
      return true;
    } catch {
      return false;
    }
  }

  /* ---------- export/import/reset for this store only ---------- */
  function exportAll() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (!fullKey) continue;
      if (!fullKey.startsWith(prefix + ':')) continue;

      const shortKey = fullKey.slice((prefix + ':').length);
      out[shortKey] = safeParse(localStorage.getItem(fullKey), null);
    }
    return out;
  }

  function importAll(obj, { overwrite = true } = {}) {
    if (!obj || typeof obj !== 'object') return false;
    let ok = true;

    for (const [k, v] of Object.entries(obj)) {
      if (!overwrite && has(k)) continue;
      ok = set(k, v) && ok;
    }
    return ok;
  }

  function resetAll() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (!fullKey) continue;
      if (fullKey.startsWith(prefix + ':')) keysToRemove.push(fullKey);
    }
    for (const k of keysToRemove) {
      try { localStorage.removeItem(k); } catch {}
    }
    return true;
  }

  return {
    app,
    page,
    version,
    prefix,
    keyOf,

    get,
    set,
    remove,
    has,

    applyDefaults,
    getWithDefault,

    getPos,
    setPos,

    migrateFrom,

    exportAll,
    importAll,
    resetAll,

    on,
  };
}

/* --------------------------------
   Convenience constructors
   These guarantee separation by page type.
-------------------------------- */
export const stores = {
  global: (page = 'main', version = 1, defaults = {}) =>
    createStore({ app: 'global', page, version, defaults }),

  rtc: (page = 'main', version = 1, defaults = {}) =>
    createStore({ app: 'rtc', page, version, defaults }),

  stopwatch: (page = 'main', version = 1, defaults = {}) =>
    createStore({ app: 'stopwatch', page, version, defaults }),

  timer: (page = 'standard', version = 1, defaults = {}) =>
    createStore({ app: 'timer', page, version, defaults }),
};