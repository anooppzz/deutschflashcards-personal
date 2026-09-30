import { describe, it, expect } from "vitest";
import { grammarLinksFor, grammarHintFor, buildGrammarIndex } from "./grammarLinks";
import { idOf } from "./fsrs";
import GRAMMAR_TOPICS from "../data/grammar/topics.json";
import EXTRA_TOPICS from "../data/decks/extra-topics.json";
import { ALL_CARDS } from "../data";

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

describe("grammarLinksFor - Perfekt rule", () => {
  const verb = (front, sub, deck = "restaurant") => ({ type: "v", front, sub, deck });

  it("links verbs whose sub line shows a Perfekt form", () => {
    expect(keysFor(verb("reservieren", "hat reserviert"))).toEqual(["perfekt"]);
    expect(keysFor(verb("sinken", "ist gesunken"))).toEqual(["perfekt"]);
    expect(keysFor(verb("laufen", "du läufst, ist gelaufen"))).toEqual(["perfekt"]);
    expect(keysFor(verb("beraten", "du berätst, er berät · hat beraten"))).toEqual(["perfekt"]);
  });

  it("links every verb in the irregular and inseparable decks", () => {
    expect(keysFor(verb("fangen", "fing · gefangen", "irregular"))).toEqual(["perfekt"]);
    expect(keysFor(verb("bekommen", "hat bekommen", "inseparable"))).toEqual(["perfekt"]);
  });

  it("uses the short topic title as the chip label", () => {
    expect(grammarLinksFor(verb("reservieren", "hat reserviert"), GRAMMAR_TOPICS))
      .toEqual([{ key: "perfekt", label: "Perfekt" }]);
  });

  it("does not link verbs without a Perfekt form, or non-verbs", () => {
    expect(keysFor(verb("stimmen", "Stimmt so!"))).toEqual([]);
    expect(keysFor(verb("mögen", "du magst, er mag"))).toEqual([]);
    expect(keysFor(verb("kochen", ""))).toEqual([]);
    expect(keysFor({ type: "sonst", front: "hat", sub: "hat recht" })).toEqual([]);
  });
});

describe("grammarLinksFor - hand-tagged cards", () => {
  it("links a card to the topics listed in its grammar field", () => {
    expect(grammarLinksFor({ type: "v", front: "können", grammar: ["modalverben"] }, GRAMMAR_TOPICS))
      .toEqual([{ key: "modalverben", label: "Modalverben" }]);
    expect(keysFor({ type: "sonst", front: "neben", grammar: ["wechselpraepositionen"] }))
      .toEqual(["wechselpraepositionen"]);
  });

  it("ignores tags for topics that do not exist", () => {
    expect(keysFor({ type: "v", front: "können", grammar: ["nope"] })).toEqual([]);
  });

  it("lists a topic once when both a rule and a tag link it", () => {
    expect(keysFor({ type: "v", front: "reservieren", sub: "hat reserviert", grammar: ["perfekt"] }))
      .toEqual(["perfekt"]);
  });

  it("links a card to several topics", () => {
    expect(keysFor({ type: "v", front: "müssen", sub: "hat gemusst", grammar: ["modalverben"] }))
      .toEqual(["perfekt", "modalverben"]);
  });
});

describe("real data", () => {
  it("every grammar tag on a card names an existing topic", () => {
    const keys = new Set(GRAMMAR_TOPICS.map((t) => t.key));
    const bad = ALL_CARDS.flatMap((c) => (c.grammar || []).filter((k) => !keys.has(k)).map((k) => `${c.deck}/${c.front}: ${k}`));
    expect(bad).toEqual([]);
  });

  it("every subPattern in the grammar data is a valid regex", () => {
    const rules = GRAMMAR_TOPICS.flatMap((t) => (Array.isArray(t.match) ? t.match : t.match ? [t.match] : []));
    for (const r of rules) if (r.subPattern) expect(() => new RegExp(r.subPattern)).not.toThrow();
  });

  it("every verb card shows its Perfekt (modal verbs: the Modalverben topic instead)", () => {
    const missing = ALL_CARDS.filter((c) => c.type === "v")
      .filter((c) => !keysFor(c).some((k) => k === "perfekt" || k === "modalverben"))
      .map((c) => `${c.deck}/${c.front}`);
    expect(missing).toEqual([]);
  });

  it("irregular verbs show hat or ist before the Partizip II", () => {
    const bad = ALL_CARDS.filter((c) => c.deck === "irregular" && !/ · (hat|ist) ge\S+$/.test(c.sub)).map((c) => c.sub);
    expect(bad).toEqual([]);
  });
});

describe("buildGrammarIndex", () => {
  const { linksById, wordsByTopic } = buildGrammarIndex(ALL_CARDS, GRAMMAR_TOPICS);

  it("maps card ids to their links", () => {
    expect(linksById[idOf("persoenlich", "die Zeichnung")].map((l) => l.key)).toEqual(["genus-endungen"]);
    expect(linksById[idOf("freizeit", "können")].map((l) => l.key)).toEqual(["modalverben"]);
    expect(linksById[idOf("persoenlich", "gemeinsam")]).toBeUndefined();
  });

  it("lists each topic's words once, with every deck they appear in", () => {
    const rechnung = wordsByTopic["genus-endungen"].filter((w) => w.front === "die Rechnung");
    expect(rechnung).toHaveLength(1);
    expect(rechnung[0].decks).toEqual(expect.arrayContaining(["buero", "restaurant"]));
  });

  it("sorts words alphabetically, ignoring the article", () => {
    const fronts = wordsByTopic.modalverben.map((w) => w.front);
    expect(fronts).toEqual(["dürfen", "können", "möchten", "mögen", "müssen", "wollen"]);
  });

  it("has no entry for topics nothing links to", () => {
    expect(wordsByTopic["wortstellung-hauptsatz"]).toBeUndefined();
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
