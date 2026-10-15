import { describe, it, expect } from "vitest";
import { setsForDecks, lineId, linesOf } from "./chunks";
import { CHUNK_SETS, EXTRA_TOPICS } from "../data";

describe("setsForDecks", () => {
  const sets = [{ key: "x", deck: "b" }, { key: "all", deck: null }, { key: "y", deck: "a" }];
  it("puts the everyday sets first, then the chosen chapters", () => {
    expect(setsForDecks(sets, ["a"]).map((s) => s.key)).toEqual(["all", "y"]);
    expect(setsForDecks(sets, []).map((s) => s.key)).toEqual(["all"]);
  });
});

describe("lineId", () => {
  it("depends on the set and the German text, not the position", () => {
    expect(lineId("p", "Hallo!")).toBe(lineId("p", "Hallo!"));
    expect(lineId("p", "Hallo!")).not.toBe(lineId("q", "Hallo!"));
    expect(lineId("p", "Hallo!")).not.toBe(lineId("p", "Hallo?"));
  });
});

describe("real sets (src/data/speaking/chunks.json)", () => {
  const chapters = new Set(EXTRA_TOPICS.map((t) => t.key));
  const text = (s) => typeof s === "string" && s.trim() === s && s.length > 1;

  it("have unique keys and a known chapter (or none for everyday sets)", () => {
    const keys = CHUNK_SETS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of CHUNK_SETS) {
      expect(text(s.title), s.key).toBe(true);
      if (s.deck != null) expect(chapters.has(s.deck), `${s.key}: ${s.deck}`).toBe(true);
    }
  });

  it("every line has German and English, sentences and dialogue lines don't repeat", () => {
    for (const s of CHUNK_SETS) {
      expect(s.sentences.length, s.key).toBeGreaterThanOrEqual(6);
      const all = [s.sentences, ...s.dialogues.map((d) => d.lines)];
      for (const lines of all) {
        const de = lines.map((l) => l.de);
        expect(new Set(de).size, `${s.key}: repeated line`).toBe(de.length);
        for (const l of lines) {
          expect(text(l.de) && text(l.en), `${s.key}: ${l.de}`).toBe(true);
          expect(/[.!?…]$/.test(l.de), `${s.key}: no end punctuation: ${l.de}`).toBe(true);
          expect(/\[\[|\*\*/.test(l.de), `${s.key}: markup in ${l.de}`).toBe(false);
        }
      }
      for (const d of s.dialogues) {
        expect(text(d.title), s.key).toBe(true);
        expect(d.lines.length, s.key).toBeGreaterThanOrEqual(4);
        for (const l of d.lines) expect(["A", "B"], `${s.key}: ${l.de}`).toContain(l.who);
      }
    }
  });

  it("linesOf gives every line an id", () => {
    for (const s of CHUNK_SETS) {
      const lines = linesOf(s);
      expect(lines.length).toBe(s.sentences.length + s.dialogues.reduce((n, d) => n + d.lines.length, 0));
      for (const l of lines) expect(l.id.startsWith(`chunk::${s.key}::`)).toBe(true);
    }
  });
});
