// 🎙 The learner's own recordings (🧱 Sätze), kept on this device in
// IndexedDB: { id, blob, date }. One recording per line – a new one replaces
// the old. Not part of the backup file (audio is too big for it).
// Without IndexedDB (private mode, very old browsers) the recordings live in
// memory only and `persistent` is false, so the view can say so.

const DB = "dfc-recordings";
const STORE = "clips";
const memory = new Map();
let dbPromise = null;

const idb = () => (typeof indexedDB === "undefined" ? null : indexedDB);

const open = () => {
  if (!idb()) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = idb().open(DB, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: "id" }); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch { resolve(null); }
    });
  }
  return dbPromise;
};

const run = async (mode, fn, fallback) => {
  const db = await open();
  if (!db) return fallback();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => resolve(fallback());
      tx.onabort = () => resolve(fallback());
    } catch { resolve(fallback()); }
  });
};

export const recordingsPersistent = async () => Boolean(await open());

export const saveRecording = (id, blob) => {
  const rec = { id, blob, date: Date.now() };
  memory.set(id, rec);
  return run("readwrite", (s) => s.put(rec), () => undefined);
};

export const loadRecording = (id) =>
  run("readonly", (s) => s.get(id), () => memory.get(id)).then((r) => r || memory.get(id) || null);

export const deleteRecording = (id) => {
  memory.delete(id);
  return run("readwrite", (s) => s.delete(id), () => undefined);
};

// ids of every saved recording
export const recordingIds = () =>
  run("readonly", (s) => s.getAllKeys(), () => [...memory.keys()]).then((ids) => new Set([...(ids || []), ...memory.keys()]));
