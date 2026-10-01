import { describe, it, expect } from "vitest";
import { fold, matchRanges, searchCards, buildGrammarSearchIndex, searchGrammar } from "./globalSearch";
import { ALL_CARDS, GRAMMAR_TOPICS } from "../data";

const fronts = (q) => searchCards(ALL_CARDS, q).map((c) => c.front);
const GRAMMAR = buildGrammarSearchIndex(GRAMMAR_TOPICS);
const topicKeys = (q, lang) => searchGrammar(GRAMMAR, q, lang).map((r) => r.topic.key);

describe("fold", () => {
  it("ignores case, umlauts, ß and the ae/oe/ue spellings", () => {
    expect(fold("Frühstück")).toBe("fruhstuck");
    expect(fold("fruehstueck")).toBe("fruhstuck");
    expect(fold("Straße")).toBe("strasse");
    expect(fold("Öl")).toBe(fold("oel"));
    expect(fold("Café")).toBe("cafe");
  });
});

describe("matchRanges", () => {
  it("finds the match in the original text, umlauts included", () => {
    expect(matchRanges("Ich frühstücke gern.", "fruhstuck")).toEqual([[4, 13]]);
    expect(matchRanges("die Straße", "strasse")).toEqual([[4, 10]]);
    expect(matchRanges("aus dem Haus, mit dem Bus", "dem")).toEqual([[4, 7], [18, 21]]);
    expect(matchRanges("anything", " ")).toEqual([]);
  });
});

describe("searchCards", () => {
  it("searches every deck, whatever is selected", () => {
    expect(fronts("Kunde")).toContain("der Kunde");
    expect(fronts("Kunde")[0]).toBe("der Kunde");
  });

  it("finds words typed without umlauts", () => {
    expect(fronts("fruhstucken")).toContain("frühstücken");
    expect(fronts("fruehstuecken")).toContain("frühstücken");
  });

  it("finds English meanings and verb forms", () => {
    expect(fronts("customer")).toContain("der Kunde");
    expect(fronts("ging")).toContain("gehen");
    expect(fronts("gegangen")).toContain("gehen");
  });

  it("puts the word itself before cards that only mention it", () => {
    const r = fronts("Glas");
    expect(r[0]).toBe("das Glas");
  });

  it("matches several words anywhere on the card", () => {
    expect(fronts("Kinder streiten")).toContain("streiten (sich)");
  });

  it("needs at least two letters", () => {
    expect(fronts("k")).toEqual([]);
  });
});

describe("searchGrammar", () => {
  it("finds topics by title in either language", () => {
    expect(topicKeys("Perfekt")[0]).toBe("perfekt");
    expect(topicKeys("reflexive")[0]).toBe("reflexive-verben");
    expect(topicKeys("Dativ")).toContain("praep-dativ");
  });

  it("finds topics by what is inside them", () => {
    expect(topicKeys("weil")).toContain("nebensatz");
    expect(topicKeys("konnte")).toContain("modalverben");
  });

  it("returns a snippet that contains the match", () => {
    const [hit] = searchGrammar(GRAMMAR, "konnte", "en");
    expect(fold(hit.snippet)).toContain("konnte");
  });
});
