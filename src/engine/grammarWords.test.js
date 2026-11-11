import { describe, it, expect } from "vitest";
import { GRAMMAR_WORDS, grammarWordOf, splitGrammarWords } from "./grammarWords";
import { GRAMMAR_TOPICS } from "../data";

const linked = (text, opts) => splitGrammarWords(text, opts).filter((p) => p.entry).map((p) => p.text);

describe("grammar words (tap for the meaning)", () => {
  it("every entry has meanings with a German example and its English", () => {
    const bad = GRAMMAR_WORDS.filter((e) => !(e.w && e.group && e.meanings?.length
      && e.meanings.every((m) => m.en && m.ex && m.exEn && /[.!?]$/.test(m.ex) && /[.!?]$/.test(m.exEn)))).map((e) => e.w);
    expect(bad).toEqual([]);
  });

  it("no word is listed twice", () => {
    const all = GRAMMAR_WORDS.flatMap((e) => [e.w, ...(e.forms || [])].map((f) => f.toLowerCase()));
    expect(all.length).toBe(new Set(all).size);
  });

  it("each example uses its word", () => {
    const bad = GRAMMAR_WORDS.filter((e) => !e.meanings.some((m) => linked(m.ex).some((w) => grammarWordOf(w) === e))).map((e) => e.w);
    expect(bad).toEqual([]);
  });

  it("a word's topic exists", () => {
    const keys = new Set(GRAMMAR_TOPICS.map((t) => t.key));
    expect(GRAMMAR_WORDS.filter((e) => e.topic && !keys.has(e.topic)).map((e) => e.w)).toEqual([]);
  });

  it("links German words, whatever the case, and keeps the text whole", () => {
    expect(linked("Nach dem Essen gehe ich nach Hause.")).toEqual(["Nach", "nach"]);
    expect(linked("Woher? Wo? Wohin?")).toEqual(["Woher", "Wo", "Wohin"]);
    const text = "Ich gehe zum Arzt.";
    expect(splitGrammarWords(text).map((p) => p.text).join("")).toBe(text);
  });

  it("in English text, English-looking words link only when highlighted", () => {
    expect(linked("in a building, an article, nach links", { german: false })).toEqual(["nach"]);
    expect(linked("in", { german: false, highlighted: true })).toEqual(["in"]);
    expect(linked("in einem Haus")).toEqual(["in"]);
  });
});
