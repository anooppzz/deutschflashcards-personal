import { describe, it, expect, beforeEach } from "vitest";
import { parseWikitext, lookupWiktionary, candidates, wiktionaryTerm, plain, entrySummary, wiktionaryUrl, clearWiktionaryCache } from "./wiktionary";

// samples in de.wiktionary's format
const GEWOHNHEIT = `== Gewohnheit ({{Sprache|Deutsch}}) ==
=== {{Wortart|Substantiv|Deutsch}}, {{f}} ===

{{Deutsch Substantiv Übersicht
|Genus=f
|Nominativ Singular=Gewohnheit
|Nominativ Plural=Gewohnheiten
|Genitiv Singular=Gewohnheit
|Genitiv Plural=Gewohnheiten
}}

{{Worttrennung}}
:Ge·wohn·heit, {{Pl.}} Ge·wohn·hei·ten

{{Bedeutungen}}
:[1] {{K|Psychologie}} durch häufige [[Wiederholung]] selbstverständlich gewordene ''Handlung''<ref>Quelle</ref>
:[2] [[Brauch|Bräuche]] einer Gruppe

{{Beispiele}}
:[1] Es ist eine alte ''Gewohnheit'' von mir, morgens Kaffee zu trinken.
:[2] Andere Länder, andere ''Gewohnheiten''.

==== {{Übersetzungen}} ====
{{Ü-Tabelle|1|G=Verhalten|Ü-Liste=
*{{en}}: [1] {{Ü|en|habit}}, {{Ü|en|custom}}; [2] {{Ü|en|custom}}
*{{fr}}: [1] {{Ü|fr|habitude}}
}}
`;

const ESSEN_VERB = `== essen ({{Sprache|Deutsch}}) ==
=== {{Wortart|Verb|Deutsch}} ===

{{Deutsch Verb Übersicht
|Präsens_ich=esse
|Präsens_du=isst
|Präsens_er, sie, es=isst
|Präteritum_ich=aß
|Partizip II=gegessen
|Konjunktiv II_ich=äße
|Imperativ Singular=iss
|Imperativ Plural=esst
|Hilfsverb=haben
}}

{{Bedeutungen}}
:[1] [[Nahrung]] zu sich nehmen

==== {{Übersetzungen}} ====
{{Ü-Tabelle|1|G=Nahrung aufnehmen|Ü-Liste=
*{{en}}: [1] {{Ü|en|eat}}
}}

== essen ({{Sprache|Englisch}}) ==
=== {{Wortart|Substantiv|Englisch}} ===
{{Bedeutungen}}
:[1] nicht deutsch
`;

const ESSEN_NOUN = `== Essen ({{Sprache|Deutsch}}) ==
=== {{Wortart|Substantiv|Deutsch}}, {{n}} ===

{{Deutsch Substantiv Übersicht
|Genus=n
|Nominativ Singular=Essen
|Nominativ Plural=Essen
}}

{{Bedeutungen}}
:[1] [[Mahlzeit]]

=== {{Wortart|Toponym|Deutsch}} ===
{{Bedeutungen}}
:[1] Stadt im Ruhrgebiet
`;

const GESUND = `== gesund ({{Sprache|Deutsch}}) ==
=== {{Wortart|Adjektiv|Deutsch}} ===

{{Deutsch Adjektiv Übersicht
|Positiv=gesund
|Komparativ=gesünder
|Komparativ*=gesunder
|Superlativ=gesündesten
}}

==== {{Übersetzungen}} ====
{{Ü-Tabelle|1|Ü-Liste=
*{{en}}: [1] {{Ü|en|healthy}}, {{Ü|en|well|well (adj.)}}
}}
`;

const FERNWEH = `== Fernweh ({{Sprache|Deutsch}}) ==
=== {{Wortart|Substantiv|Deutsch}}, {{n}} ===

{{Deutsch Substantiv Übersicht
|Genus=n
|Nominativ Singular=Fernweh
|Nominativ Plural=—
}}

{{Bedeutungen}}
:[1] Sehnsucht nach der Ferne
`;

const BREAKFAST = `== breakfast ({{Sprache|Englisch}}) ==
=== {{Wortart|Substantiv|Englisch}} ===
{{Bedeutungen}}
:[1] Frühstück
`;

beforeEach(() => clearWiktionaryCache());

describe("parsing de.wiktionary entries", () => {
  it("reads a noun: article, plural, meanings, examples, English", () => {
    const [e] = parseWikitext("Gewohnheit", GEWOHNHEIT);
    expect(e).toMatchObject({ title: "Gewohnheit", pos: "Substantiv", genders: ["f"], articles: ["die"], plural: "Gewohnheiten", en: ["habit", "custom"] });
    expect(e.meanings).toEqual(["durch häufige Wiederholung selbstverständlich gewordene Handlung", "Bräuche einer Gruppe"]);
    expect(e.examples[0]).toBe("Es ist eine alte Gewohnheit von mir, morgens Kaffee zu trinken.");
    expect(entrySummary(e)).toBe("die Gewohnheit, Pl. Gewohnheiten (Substantiv) – habit, custom");
  });

  it("reads a verb and skips the non-German section", () => {
    const entries = parseWikitext("essen", ESSEN_VERB);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ pos: "Verb", verb: { er: "isst", praeteritum: "aß", partizip: "gegessen", hilfsverb: "haben" }, en: ["eat"] });
    expect(entrySummary(entries[0])).toBe("essen, isst, aß, hat gegessen (Verb) – eat");
  });

  it("reads several parts of speech on one page", () => {
    const entries = parseWikitext("Essen", ESSEN_NOUN);
    expect(entries.map((e) => e.pos)).toEqual(["Substantiv", "Toponym"]);
    expect(entries[0]).toMatchObject({ articles: ["das"], plural: "Essen" });
  });

  it("reads an adjective's comparison (with „am“) and English display words", () => {
    const [e] = parseWikitext("gesund", GESUND);
    expect(e.adjective).toEqual({ komparativ: "gesünder", superlativ: "am gesündesten" });
    expect(e.en).toEqual(["healthy", "well (adj.)"]);
  });

  it("knows „kein Plural“ and English-only pages", () => {
    const [e] = parseWikitext("Fernweh", FERNWEH);
    expect(e.plural).toBe("");
    expect(entrySummary(e)).toBe("das Fernweh, kein Plural (Substantiv)");
    expect(parseWikitext("breakfast", BREAKFAST)).toEqual([]);
    expect(parseWikitext("x", "")).toEqual([]);
  });

  it("cleans wiki markup", () => {
    expect(plain("{{K|ugs.}} ''sehr'' [[gut]] und [[Haus|Häuser]]<ref>x</ref> ,")).toBe("sehr gut und Häuser,");
  });
});

describe("looking up", () => {
  it("asks for the word as typed, capitalised and lower case in one request", async () => {
    expect(wiktionaryTerm(" die Gewohnheit! ")).toBe("Gewohnheit");
    expect(candidates("essen")).toEqual(["essen", "Essen"]);
    expect(candidates("a")).toEqual([]);
    const urls = [];
    const fetchFn = async (url) => {
      urls.push(url);
      return { json: async () => ({ query: { pages: [
        { title: "Essen", revisions: [{ slots: { main: { content: ESSEN_NOUN } } }] },
        { title: "essen", revisions: [{ slots: { main: { content: ESSEN_VERB } } }] },
      ] } }) };
    };
    const entries = await lookupWiktionary("essen", fetchFn);
    expect(decodeURIComponent(urls[0])).toContain("titles=essen|Essen");
    expect(urls[0]).toContain("origin=*");
    expect(entries.map((e) => `${e.title}:${e.pos}`)).toEqual(["essen:Verb", "Essen:Substantiv", "Essen:Toponym"]);
    await lookupWiktionary("essen", fetchFn);
    expect(urls).toHaveLength(1); // remembered
  });

  it("returns nothing for missing pages and throws when offline", async () => {
    const missing = async () => ({ json: async () => ({ query: { pages: [{ title: "Xyz", missing: true }] } }) });
    expect(await lookupWiktionary("Xyz", missing)).toEqual([]);
    await expect(lookupWiktionary("Haus", async () => { throw new TypeError("Failed to fetch"); })).rejects.toThrow();
  });

  it("links to the page", () => {
    expect(wiktionaryUrl("belegte Brötchen")).toBe("https://de.wiktionary.org/wiki/belegte_Br%C3%B6tchen");
  });
});
