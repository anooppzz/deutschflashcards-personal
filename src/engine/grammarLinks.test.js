import { describe, it, expect } from "vitest";
import { grammarLinksFor, grammarHintFor } from "./grammarLinks";
import GRAMMAR_TOPICS from "../data/grammar/topics.json";
import EXTRA_TOPICS from "../data/decks/extra-topics.json";

const noun = (front, gender) => ({ type: "n", front, gender });
const keysFor = (card) => grammarLinksFor(card, GRAMMAR_TOPICS).map((l) => l.key);

describe("grammarLinksFor", () => {
  it("links nouns with each covered ending to the Genus nach Endung topic", () => {
    expect(grammarLinksFor(noun("die Zeichnung", "die"), GRAMMAR_TOPICS)).toEqual([
      { key: "genus-endungen", ending: "ung", label: "-ung → die" },
    ]);
    expect(grammarLinksFor(noun("die Freiheit", "die"), GRAMMAR_TOPICS)[0].ending).toBe("heit");
    expect(grammarLinksFor(noun("die Möglichkeit", "die"), GRAMMAR_TOPICS)[0].ending).toBe("keit");
    expect(grammarLinksFor(noun("die Information", "die"), GRAMMAR_TOPICS)[0].ending).toBe("ion");
    expect(grammarLinksFor(noun("die Mannschaft", "die"), GRAMMAR_TOPICS)[0].ending).toBe("schaft");
  });

  it("does not link a noun whose gender contradicts the rule", () => {
    // -ung here is part of the stem, not the suffix
    expect(keysFor(noun("der Sprung", "der"))).toEqual([]);
    // loanword
    expect(keysFor(noun("das Stadion", "das"))).toEqual([]);
    expect(keysFor(noun("der/die Angestellte", "der/die"))).toEqual([]);
  });

  it("does not link non-nouns or words that only look similar", () => {
    expect(keysFor({ type: "sonst", front: "Achtung" })).toEqual([]);
    expect(keysFor({ type: "adj", front: "gemeinsam" })).toEqual([]);
    expect(keysFor(noun("die Frau", "die"))).toEqual([]);
    expect(keysFor(noun("die Pommes frites", "die"))).toEqual([]);
  });

  it("matches case-insensitively and ignores the article", () => {
    expect(keysFor(noun("die WOHNUNG", "die"))).toEqual(["genus-endungen"]);
    expect(keysFor(noun("Rechnung", "die"))).toEqual(["genus-endungen"]);
  });

  it("returns nothing for missing input", () => {
    expect(grammarLinksFor(null, GRAMMAR_TOPICS)).toEqual([]);
    expect(grammarLinksFor(noun("die Zeitung", "die"), undefined)).toEqual([]);
  });

  it("links real cards from the decks", () => {
    const personal = EXTRA_TOPICS.find((t) => t.key === "persoenlich");
    const zeichnung = personal.cards.find((c) => c.front === "die Zeichnung");
    expect(keysFor(zeichnung)).toEqual(["genus-endungen"]);
  });
});

describe("grammarHintFor", () => {
  const link = { key: "genus-endungen", ending: "ung" };

  it("fills in the ending in the requested language", () => {
    expect(grammarHintFor(link, GRAMMAR_TOPICS, "de")).toBe("Nomen auf -ung sind immer feminin: die.");
    expect(grammarHintFor(link, GRAMMAR_TOPICS, "en")).toBe("Nouns ending in -ung are always feminine: die.");
  });

  it("falls back to English for languages without a hint", () => {
    expect(grammarHintFor(link, GRAMMAR_TOPICS, "uk")).toBe("Nouns ending in -ung are always feminine: die.");
  });

  it("returns null for an unknown topic", () => {
    expect(grammarHintFor({ key: "nope", ending: "ung" }, GRAMMAR_TOPICS)).toBeNull();
  });
});
