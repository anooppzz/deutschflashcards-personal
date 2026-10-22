import { describe, it, expect } from "vitest";
import { buildLexicon, checkText, pieces, weakOrder, weakLines, ROUNDS } from "./textCheck";
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
