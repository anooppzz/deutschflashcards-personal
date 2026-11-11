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

describe("separable verbs", () => {
  it("finds an·kreuzen when typed without the dot", () => {
    expect(fold("an·kreuzen")).toBe("ankreuzen");
    expect(fronts("ankreuzen")).toContain("an·kreuzen");
    expect(fronts("anbieten")).toContain("an·bieten");
    expect(fronts("einleben")).toContain("ein·leben (sich)");
  });

  it("highlights the whole word, dot included", () => {
    expect(matchRanges("an·kreuzen", "ankreuzen")).toEqual([[0, 10]]);
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

describe("searchGrammar: the matching section", () => {
  const sectionOf = (q, key) => {
    const hit = searchGrammar(GRAMMAR, q, "de").find((r) => r.topic.key === key);
    const topic = GRAMMAR_TOPICS.find((t) => t.key === key);
    return hit && hit.section != null ? topic.sections[hit.section].id : hit && hit.section;
  };

  it("names the section a result should open at", () => {
    expect(sectionOf("Konferenzräume", "praep-ort")).toBe("im-haus");
    expect(sectionOf("lokale Präpositionen", "praep-ort")).toBe("im-haus");
    expect(sectionOf("Treppe nach unten", "praep-ort")).toBe("weg-beschreiben");
  });

  it("finds the book's sections by unit", () => {
    expect(topicKeys("Einheit 16", "de")).toEqual(expect.arrayContaining(["praep-ort", "indirekte-fragen"]));
  });

  it("a title match opens the topic at its top", () => {
    const [hit] = searchGrammar(GRAMMAR, "Indirekte Fragen", "de");
    expect(hit.topic.key).toBe("indirekte-fragen");
    expect(hit.section).toBeNull();
  });
});
