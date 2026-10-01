// Backup of the learner's own data as a JSON file - the only copy otherwise
// lives in this browser's localStorage, which clearing site data, a new
// phone or (on iPhones) weeks without a visit can wipe.
//
// What is saved: every key in STORAGE_KEYS (progress, streak, settings) and
// the learner's own translation corrections (corr_*). Not saved: caches the
// app can rebuild (tr_* live translations, aiex_* examples). The app shares
// its origin (anooppzz.github.io) with any other GitHub Pages project of the
// same account, so only these keys are read or written - never all of
// localStorage.
import { STORAGE_KEYS } from "../constants";
import { localDateStr } from "./streak";

export const BACKUP_APP = "deutschflashcards";
export const BACKUP_VERSION = 1;

const APP_KEYS = new Set(Object.values(STORAGE_KEYS));
export const isBackupKey = (key) => APP_KEYS.has(key) || key.startsWith("corr_");

const keysOf = (store) => {
  const keys = [];
  for (let i = 0; i < store.length; i++) keys.push(store.key(i));
  return keys;
};

export const collectBackup = (store, now = new Date()) => {
  const data = {};
  keysOf(store).filter(isBackupKey).sort().forEach((k) => { data[k] = store.getItem(k); });
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
};

export const backupFileName = (now = new Date()) => `deutsch-flashcards-backup-${localDateStr(now)}.json`;

// how many cards have progress in a backup's data (or the live store)
export const progressCountOf = (data) => {
  try { return Object.keys(JSON.parse(data[STORAGE_KEYS.PROGRESS] || "{}")).length; } catch { return 0; }
};

// Reads a backup file's text. Throws an Error with a message for the learner
// when it isn't one of this app's backups.
export const parseBackup = (text) => {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error("Die Datei ist keine gültige Sicherung (kein JSON)."); }
  if (!obj || obj.app !== BACKUP_APP || typeof obj.data !== "object" || obj.data === null) {
    throw new Error("Das ist keine Sicherung dieser App.");
  }
  if (typeof obj.version !== "number" || obj.version > BACKUP_VERSION) {
    throw new Error("Diese Sicherung stammt aus einer neueren Version der App.");
  }
  const data = {};
  Object.entries(obj.data).forEach(([k, v]) => { if (isBackupKey(k) && typeof v === "string") data[k] = v; });
  if (data[STORAGE_KEYS.PROGRESS] !== undefined) {
    try { JSON.parse(data[STORAGE_KEYS.PROGRESS]); } catch { throw new Error("Der Lernfortschritt in der Sicherung ist beschädigt."); }
  }
  return { exportedAt: obj.exportedAt, data };
};

// Replaces this app's data with the backup's: app keys missing from the
// backup are removed, so the result is exactly the backed-up state.
export const restoreBackup = (backup, store) => {
  keysOf(store).filter(isBackupKey).forEach((k) => store.removeItem(k));
  Object.entries(backup.data).forEach(([k, v]) => store.setItem(k, v));
};
