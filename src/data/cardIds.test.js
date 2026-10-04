import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { ALL_CARDS } from "./index";
import { idOf } from "../engine/fsrs";
import RENAMES from "./renames.json";

// Guards the learner's progress, which is stored per card id. card-ids.json
// is the list of ids as of the last update. A card that disappears (front
// changed, card moved or deleted) must be listed in renames.json - old id →
// new id, or → null when removed on purpose - so its progress isn't lost.
// After adding, renaming or removing cards: npm run ids:update
const SNAPSHOT = new URL("./card-ids.json", import.meta.url);
const current = [...new Set(ALL_CARDS.map((c) => idOf(c.deck, c.front)))].sort();

describe("card ids (progress safety)", () => {
  if (process.env.UPDATE_CARD_IDS) {
    it("writes the snapshot", () => { writeFileSync(SNAPSHOT, JSON.stringify(current, null, 1) + "\n"); });
    return;
  }
  const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8"));

  it("no card disappeared without an entry in renames.json", () => {
    const now = new Set(current);
    expect(snapshot.filter((id) => !now.has(id) && !(id in RENAMES))).toEqual([]);
  });

  it("renames point at cards that exist", () => {
    const now = new Set(current);
    expect(Object.entries(RENAMES).filter(([, to]) => to !== null && !now.has(to))).toEqual([]);
  });

  it("the snapshot is up to date (run: npm run ids:update)", () => {
    expect(current.filter((id) => !snapshot.includes(id))).toEqual([]);
  });
});
