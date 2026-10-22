import { describe, it, expect } from "vitest";
import { buildLexicon, checkText, pieces, weakOrder, weakLines, ROUNDS, unknownWords, extendLexicon, lookUpUnknown } from "./textCheck";
import { parseWikitext } from "./wiktionary";
import { ALL_CARDS, VERB_FORMS, LIST_BY_KEY } from "../data";
import { pluralOf } from "../modes/forms/buildForms";

const dativeIds = new Set(LIST_BY_KEY["ga-verben-dativ"].rows.filter((r) => r.group === "Dativ").flatMap((r) => r.cards));
const lex = buildLexicon(ALL_CARDS, VERB_FORMS, { pluralOf, dativeIds });
const fixes = (text, round) => checkText(text, lex)[round].map((m) => m.fix || m.de);
const kinds = (text, round) => checkText(text, lex)[round].map((m) => m.kind);

describe("Fehler-Check", () => {
  it("the book's five rounds, then the extra ones", () => {
    expect(ROUNDS.map((r) => r.key)).toEqual(["nomen-gross", "verb-konjugiert", "verb-position2", "verb-ende", "artikel", "kasus", "adj-endung"]);
    expect(ROUNDS.filter((r) => r.extra).length).toBe(2);
  });

  it("1 Nomen groß: a known noun in lower case", () => {
    expect(fixes("Ich trinke gern kaffee.", "nomen-gross")).toEqual(["Kaffee"]);
    expect(fixes("Wir essen um acht. Ich liebe dich.", "nomen-gross")).toEqual([]);
  });

  it("2 Verben konjugiert: the form fits the pronoun", () => {
    expect(fixes("Ich gehen nach Hause.", "verb-konjugiert")).toEqual(["Ich gehe"]);
    expect(fixes("Morgen fahren ich nach Berlin.", "verb-konjugiert")).toEqual(["fahre ich"]);
    expect(fixes("Du kommst. Er liest. Wir gehen. Kommst du? Sabine und ich gehen.", "verb-konjugiert")).toEqual([]);
    expect(fixes("Ich kann es machen. Ich finde es gut. Ich helfe ihr.", "verb-konjugiert")).toEqual([]);
  });

  it("3 Verb an Position 2", () => {
    expect(fixes("Heute ich gehe ins Kino.", "verb-position2")).toEqual(["Heute gehe ich"]);
    expect(fixes("Am Wochenende wir haben gegrillt.", "verb-position2")).toEqual(["Am Wochenende haben wir"]);
    expect(fixes("Weil ich krank bin, ich bleibe zu Hause.", "verb-position2")).toEqual(["bleibe ich"]);
    expect(fixes("Heute gehe ich ins Kino. Ich glaube, du hast recht. Ich und du gehen.", "verb-position2")).toEqual([]);
  });

  it("4 Verb am Ende im Nebensatz", () => {
    expect(fixes("Ich komme nicht, weil ich habe keine Zeit.", "verb-ende")).toEqual(["weil ich keine Zeit habe"]);
    expect(fixes("Ich bleibe hier, weil ich muss arbeiten.", "verb-ende")).toEqual(["weil ich arbeiten muss"]);
    expect(fixes("Ich komme nicht, weil ich keine Zeit habe. Ich hoffe, dass es dir gefällt.", "verb-ende")).toEqual([]);
  });

  it("5 Artikel: only a hint to check", () => {
    expect(kinds("Ich habe Stuhl gekauft.", "artikel")).toEqual(["check"]);
    expect(kinds("Ich habe einen neuen Stuhl gekauft.", "artikel")).toEqual([]);
  });

  it("pieces cut the text around the marks", () => {
    const text = "Ich gehen.";
    const p = pieces(text, checkText(text, lex)["verb-konjugiert"]);
    expect(p.map((x) => x.t).join("")).toBe(text);
    expect(p.find((x) => x.mark).t).toBe("Ich gehen");
  });

  it("the learner's own list comes first and goes to the AI", () => {
    const weak = { ticked: ["verb-ende"], own: ["Komma vor dass"] };
    expect(weakOrder(weak)[0].key).toBe("verb-ende");
    expect(weakLines(weak)).toEqual([ROUNDS[3].en, "Komma vor dass"]);
  });
});

describe("no false alarms in a model letter", () => {
  it("a subordinate clause ending on a verb, nouns used without article", () => {
    expect(fixes("Ich muss Ihnen mitteilen, dass Leon bis Freitag zu Hause bleiben soll.", "verb-ende")).toEqual([]);
    expect(kinds("Sehr geehrte Frau Krüger, ich komme am Montag um 8 Uhr. Letzte Woche hatte ich keine Zeit.", "artikel")).toEqual([]);
  });
});

describe("noun subjects, Perfekt, articles, cases, endings", () => {
  it("the learner's postcard: Die Blumen hat mich sehr gefällt", () => {
    const r = checkText("Die Blumen hat mich sehr gefällt.", lex);
    expect(r["verb-konjugiert"].map((m) => m.fix)).toEqual(["haben", "gefallen"]);
    expect(r.kasus.map((m) => m.fix)).toEqual(["mir"]);
  });
  it("noun subject agreement, both ways; object first is fine", () => {
    expect(fixes("Der Tisch sind neu.", "verb-konjugiert")).toEqual(["ist"]);
    expect(fixes("Meine Kinder spielt im Garten.", "verb-konjugiert")).toEqual(["spielen"]);
    expect(fixes("Die Blumen kaufe ich morgen. Der Tisch ist neu. Die Blumen sind schön.", "verb-konjugiert")).toEqual([]);
  });
  it("Perfekt needs the Partizip; zu + infinitive is fine", () => {
    expect(fixes("Ich bin gestern nach Hause gehen.", "verb-konjugiert")).toEqual(["gegangen"]);
    expect(fixes("Ich habe heute viel zu tun. Das hat mir gefallen.", "verb-konjugiert")).toEqual([]);
  });
  it("article gender", () => {
    expect(fixes("Die Tisch ist neu.", "artikel")).toEqual(["Der Tisch"]);
    expect(fixes("Ich kaufe einen Lampe.", "artikel")).toEqual(["eine Lampe"]);
    expect(fixes("Der Tisch ist neu. Ich helfe der Frau, die Kaffee trinkt.", "artikel").filter(Boolean)).toEqual([]);
  });
  it("prepositions and dative verbs", () => {
    expect(fixes("Ich fahre mit das Auto.", "kasus")).toEqual(["mit dem Auto"]);
    expect(fixes("Das ist für dem Chef.", "kasus")).toEqual(["für den Chef"]);
    expect(fixes("Ich gehe zur Bahnhof.", "kasus")).toEqual(["zum Bahnhof"]);
    expect(fixes("Kannst du mich helfen?", "kasus")).toEqual(["mir"]);
    expect(fixes("Ich fahre mit dem Auto. Das ist für mich. Ich gehe zum Bahnhof. Er hilft mir.", "kasus")).toEqual([]);
  });
  it("adjective endings", () => {
    expect(fixes("Ich fahre mit dem neu Auto.", "adj-endung")).toEqual(["neuen"]);
    expect(fixes("Das ist ein schöne Tisch.", "adj-endung")).toEqual(["schöner"]);
    expect(fixes("Der neue Tisch ist teuer. Ich habe ein neues Auto. Mit dem neuen Auto.", "adj-endung")).toEqual([]);
  });
});

describe("two-way prepositions and endings without an article", () => {
  it("Wo? → Dativ, Wohin? → Akkusativ (from the verb)", () => {
    expect(fixes("Ich wohne in die Stadt.", "kasus")).toEqual(["in der Stadt"]);
    expect(fixes("Ich gehe in der Schule.", "kasus")).toEqual(["in die Schule"]);
    expect(kinds("Ich gehe in der Schule.", "kasus")).toEqual(["check"]); // im Park laufen is fine
    expect(fixes("Ich bin ins Kino.", "kasus")).toEqual(["im Kino"]);
    expect(fixes("Ich fahre im Kino.", "kasus")).toEqual(["ins Kino"]);
    expect(fixes("Ich wohne in der Stadt. Ich gehe in die Schule. Ich warte auf den Bus. In der Woche arbeite ich.", "kasus")).toEqual([]);
  });
  it("adjective endings without an article", () => {
    expect(fixes("Heute ist schön Wetter.", "adj-endung")).toEqual(["schönes"]);
    expect(fixes("Ich wasche mit kalte Wasser.", "adj-endung")).toEqual(["kaltem"]);
    expect(fixes("Heute ist schönes Wetter. Ich trinke kalten Kaffee. Liebe Grüße. Er spricht gut Deutsch.", "adj-endung")).toEqual([]);
  });
});

// samples in de.wiktionary's format: a noun, an inflected form, a verb
const KOMMODE = `== Kommode ({{Sprache|Deutsch}}) ==
=== {{Wortart|Substantiv|Deutsch}}, {{f}} ===
{{Deutsch Substantiv Übersicht
|Genus=f
|Nominativ Singular=Kommode
|Nominativ Plural=Kommoden
}}
{{Bedeutungen}}
:[1] Möbelstück mit Schubladen
`;
const KOMMODEN = `== Kommoden ({{Sprache|Deutsch}}) ==
=== {{Wortart|Deklinierte Form|Deutsch}} ===
{{Grammatische Merkmale}}
* Nominativ Plural des Substantivs [[Kommode]]
{{Grundformverweis Dekl|Kommode}}
`;
const STREICHEN = `== streichen ({{Sprache|Deutsch}}) ==
=== {{Wortart|Verb|Deutsch}} ===
{{Deutsch Verb Übersicht
|Präsens_er, sie, es=streicht
|Präteritum_ich=strich
|Partizip II=gestrichen
|Hilfsverb=haben
}}
`;
const PAGES = { Kommode: KOMMODE, Kommoden: KOMMODEN, streichen: STREICHEN };
const fakeLookup = async (w) => (PAGES[w] ? parseWikitext(w, PAGES[w]) : []);

describe("words without a card (Wiktionary)", () => {
  it("lists the words the app doesn't know, not names after Liebe/Frau", () => {
    const u = unknownWords("Liebe Mona, ich habe die Kommoden gestern streichen lassen.", lex);
    expect(u).toContain("Kommoden");
    expect(u).not.toContain("Mona");
    expect(u).not.toContain("habe");
  });
  it("an inflected form is followed to its base word", () => {
    const [e] = parseWikitext("Kommoden", KOMMODEN);
    expect(e.lemma).toBe("Kommode");
  });
  it("looked-up words are checked too", async () => {
    expect(fixes("Ich kaufe einen Kommode.", "artikel")).toEqual([]); // unknown: nothing to say
    const r = await lookUpUnknown(["Kommoden", "streichen", "Mona"], lex, fakeLookup);
    expect(r.found).toEqual(["Kommoden", "streichen"]);
    expect(r.missing).toEqual(["Mona"]);
    expect(checkText("Ich kaufe einen Kommode.", r.lex).artikel.map((m) => m.fix)).toEqual(["eine Kommode"]);
    expect(checkText("Ich streichen die Wand.", r.lex)["verb-konjugiert"].map((m) => m.fix)).toEqual(["Ich streiche"]);
  });
  it("offline: the first lookup fails → an error for the UI", async () => {
    await expect(lookUpUnknown(["Kommode"], lex, async () => { throw new Error("offline"); })).rejects.toThrow();
  });
  it("extendLexicon leaves the app's lexicon unchanged", () => {
    const next = extendLexicon(lex, parseWikitext("Kommode", KOMMODE));
    expect(next.nounInfo.has("kommode")).toBe(true);
    expect(lex.nounInfo.has("kommode")).toBe(false);
  });
});

// the app's own sentences are correct German: the check must not mark any of them
describe("no false alarms on the app's own sentences", () => {
  it("📰 Lesen, 🧱 Sätze, DTZ model letters and card examples: 0 errors", async () => {
    const { READING_TEXTS, DTZ_WRITING, CHUNK_SETS } = await import("../data");
    const texts = [];
    for (const t of READING_TEXTS) for (const p of t.paragraphs) texts.push(p.replace(/\[\[([^|\]]+)(\|[^\]]+)?\]\]/g, "$1"));
    const pairs = Array.isArray(DTZ_WRITING) ? DTZ_WRITING : Object.values(DTZ_WRITING);
    for (const p of pairs) for (const t of [p.a, p.b]) texts.push([t.model.anrede, ...t.model.parts, t.model.gruss].join("\n"));
    for (const s of CHUNK_SETS) {
      for (const x of s.sentences) texts.push(x.de);
      for (const d of s.dialogues || []) for (const l of d.lines) texts.push(l.de);
    }
    for (const c of ALL_CARDS) if (c.example) texts.push(c.example);
    expect(texts.length).toBeGreaterThan(1000);
    const wrong = texts.flatMap((t) => Object.entries(checkText(t, lex)).flatMap(([round, ms]) => ms
      .filter((m) => m.kind === "error" || round === "kasus")
      .map((m) => `${round}: ${t.slice(m.start, m.end)} (${t.slice(0, 60)})`)));
    expect(wrong).toEqual([]);
  });
});
