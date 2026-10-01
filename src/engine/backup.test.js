import { describe, it, expect } from "vitest";
import { collectBackup, parseBackup, restoreBackup, backupFileName, progressCountOf, isBackupKey } from "./backup";
import { STORAGE_KEYS } from "../constants";

// a minimal in-memory Storage (same API as localStorage)
const memStore = (init = {}) => {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    dump: () => Object.fromEntries(m),
  };
};

const PROGRESS = JSON.stringify({ "x::a": { due: 1 }, "x::b": { due: 2 } });

describe("collectBackup", () => {
  it("saves the app's keys and corrections, not caches or other apps' data", () => {
    const store = memStore({
      [STORAGE_KEYS.PROGRESS]: PROGRESS,
      [STORAGE_KEYS.STREAK]: "{}",
      corr_abc: "korrigiert",
      tr_abc: "cached translation",
      aiex_abc: "cached example",
      "other-app": "not ours",
    });
    const b = collectBackup(store, new Date("2026-10-01T08:00:00Z"));
    expect(b.app).toBe("deutschflashcards");
    expect(b.exportedAt).toBe("2026-10-01T08:00:00.000Z");
    expect(Object.keys(b.data).sort()).toEqual(["corr_abc", STORAGE_KEYS.PROGRESS, STORAGE_KEYS.STREAK].sort());
  });
});

describe("parseBackup + restoreBackup", () => {
  it("round-trips: restore gives exactly the backed-up state", () => {
    const source = memStore({ [STORAGE_KEYS.PROGRESS]: PROGRESS, corr_x: "y" });
    const text = JSON.stringify(collectBackup(source));
    const target = memStore({ [STORAGE_KEYS.PROGRESS]: "{}", [STORAGE_KEYS.LANG]: '"ar"', "other-app": "keep me" });
    const parsed = parseBackup(text);
    expect(progressCountOf(parsed.data)).toBe(2);
    restoreBackup(parsed, target);
    expect(target.dump()).toEqual({ [STORAGE_KEYS.PROGRESS]: PROGRESS, corr_x: "y", "other-app": "keep me" });
  });

  it("rejects files that aren't this app's backups", () => {
    expect(() => parseBackup("not json")).toThrow(/kein JSON/);
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow(/keine Sicherung/);
    expect(() => parseBackup(JSON.stringify({ app: "deutschflashcards", version: 99, data: {} }))).toThrow(/neueren Version/);
    expect(() => parseBackup(JSON.stringify({ app: "deutschflashcards", version: 1, data: { [STORAGE_KEYS.PROGRESS]: "{broken" } }))).toThrow(/beschädigt/);
  });

  it("ignores unknown keys inside a backup", () => {
    const parsed = parseBackup(JSON.stringify({ app: "deutschflashcards", version: 1, data: { evil: "x", corr_1: "ok", [STORAGE_KEYS.STREAK]: 5 } }));
    expect(parsed.data).toEqual({ corr_1: "ok" });
  });
});

describe("helpers", () => {
  it("names the file by date", () => {
    expect(backupFileName(new Date(2026, 9, 1))).toBe("deutsch-flashcards-backup-2026-10-01.json");
  });
  it("knows which keys belong to the backup", () => {
    expect(isBackupKey(STORAGE_KEYS.PROGRESS)).toBe(true);
    expect(isBackupKey("tr_1")).toBe(false);
  });
});
