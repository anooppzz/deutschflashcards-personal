import { describe, it, expect } from "vitest";
import { buildLexicon, checkText, pieces, weakOrder, weakLines, ROUNDS } from "./textCheck";
import { ALL_CARDS, VERB_FORMS } from "../data";

const lex = buildLexicon(ALL_CARDS, VERB_FORMS);
const fixes = (text, round) => checkText(text, lex)[round].map((m) => m.fix || m.de);
const kinds = (text, round) => checkText(text, lex)[round].map((m) => m.kind);

describe("Fehler-Check", () => {
  it("five rounds, as in the book", () => {
    expect(ROUNDS.map((r) => r.key)).toEqual(["nomen-gross", "verb-konjugiert", "verb-position2", "verb-ende", "artikel"]);
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
