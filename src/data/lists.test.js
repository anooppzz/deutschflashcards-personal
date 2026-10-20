import { describe, it, expect } from "vitest";
import { WORD_LISTS, LIST_BY_KEY, ALL_CARDS, DECK_SOURCE, EXTRA_KEYS, sourcesOf } from "./index";
import { idOf } from "../engine";

// 📋 word lists (lists/lists.json): rows point at existing cards - never copies
const ids = new Set(ALL_CARDS.map((c) => idOf(c.deck, c.front)));

describe("word lists", () => {
  it("have a unique key that is no deck key, a label and a source", () => {
    const keys = WORD_LISTS.map((l) => l.key);
    expect(new Set(keys).size).toBe(keys.length);
    keys.forEach((k) => {
      expect(k in DECK_SOURCE || EXTRA_KEYS.includes(k)).toBe(false);
      expect(LIST_BY_KEY[k].label && LIST_BY_KEY[k].source && LIST_BY_KEY[k].icon).toBeTruthy();
    });
  });

  it("name only cards that exist (renamed a card? update its id here too)", () => {
    const missing = WORD_LISTS.flatMap((l) => l.rows.flatMap((r) => r.cards.filter((id) => !ids.has(id)).map((id) => `${l.key}: ${id}`)));
    expect(missing).toEqual([]);
  });

  it("rows are complete: the book's forms, or an example with its English", () => {
    const bad = WORD_LISTS.flatMap((l) => l.rows.filter((r) => !r.inf || !r.cards.length
      || !((r.praes && r.praet && r.perf) || (r.example && r.en && /[.!?]$/.test(r.example))))
      .map((r) => `${l.key}: ${r.inf}`));
    expect(bad).toEqual([]);
  });

  it("no word twice in one list, and rows of one group sit together", () => {
    WORD_LISTS.forEach((l) => {
      const infs = l.rows.map((r) => r.inf);
      expect(new Set(infs).size).toBe(infs.length);
      const groups = l.rows.map((r) => r.group).filter((g, i, all) => i === 0 || g !== all[i - 1]);
      expect(new Set(groups).size).toBe(groups.length);
    });
  });

  it("every card from the list's book is in one of its lists", () => {
    const listed = new Set(WORD_LISTS.flatMap((l) => l.rows.flatMap((r) => r.cards)));
    const books = new Set(WORD_LISTS.map((l) => l.source));
    const loose = ALL_CARDS.filter((c) => books.has(c.source) && !listed.has(idOf(c.deck, c.front))).map((c) => idOf(c.deck, c.front));
    expect(loose).toEqual([]);
  });
});

describe("sourcesOf", () => {
  it("adds the list's book to a chapter card, keeping its own source first", () => {
    expect(sourcesOf("gesundheit-fitness", "empfehlen", "Menschen A2 · Einheit 7")).toEqual(["Menschen A2 · Einheit 7", "Grammatik aktiv"]);
    expect(sourcesOf("reisen", "abfahren", undefined)).toEqual(["Grammatik aktiv"]);
  });
  it("leaves cards outside any list alone", () => {
    expect(sourcesOf("kleidung", "die Hose", undefined)).toEqual([]);
    expect(sourcesOf("x", "y", "Menschen A2 · Einheit 3")).toEqual(["Menschen A2 · Einheit 3"]);
  });
  it("tags both copies when a word sits in two decks", () => {
    expect(sourcesOf("irregular", "finden")).toContain("Grammatik aktiv");
    expect(sourcesOf("moebel", "finden")).toContain("Grammatik aktiv");
  });
});
