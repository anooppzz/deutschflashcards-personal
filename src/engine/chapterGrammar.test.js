import { describe, it, expect } from "vitest";
import { EXTRA_TOPICS, EXTRA_BY_KEY, GRAMMAR_TOPICS } from "../data";
import { parseGrammarRef, sectionIndex, chapterGrammarOf, chapterGrammarFor } from "./chapterGrammar";

describe("chapter grammar (📌 Zu diesem Kapitel)", () => {
  it("every ref names an existing topic and section", () => {
    const bad = EXTRA_TOPICS.flatMap((ch) => (ch.grammarTopics || [])
      .filter((ref) => !chapterGrammarOf({ grammarTopics: [ref] }, GRAMMAR_TOPICS).length)
      .map((ref) => `${ch.key}: ${ref}`));
    expect(bad).toEqual([]);
  });

  it("refs are not repeated within a chapter", () => {
    const bad = EXTRA_TOPICS.filter((ch) => ch.grammarTopics && new Set(ch.grammarTopics).size !== ch.grammarTopics.length).map((ch) => ch.key);
    expect(bad).toEqual([]);
  });

  it("section ids are short slugs, unique within their topic", () => {
    const bad = GRAMMAR_TOPICS.flatMap((t) => {
      const ids = (t.sections || []).map((s) => s.id).filter((id) => id != null);
      const wrong = ids.filter((id) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)).map((id) => `${t.key}#${id}`);
      return new Set(ids).size === ids.length ? wrong : [...wrong, `${t.key}: repeated section id`];
    });
    expect(bad).toEqual([]);
  });

  it("a book label names the book and a page or unit", () => {
    const bad = GRAMMAR_TOPICS.flatMap((t) => (t.sections || [])
      .filter((s) => s.book != null && !/^.+ · (Einheit|Kap\.) \d+.*$/.test(s.book))
      .map((s) => `${t.key}: ${s.book}`));
    expect(bad).toEqual([]);
  });

  it("Hotel 2 links Indirekte Fragen and the page-94 prepositions", () => {
    const refs = chapterGrammarOf(EXTRA_BY_KEY.hotel2, GRAMMAR_TOPICS).map((i) => i.ref);
    expect(refs).toContain("indirekte-fragen");
    expect(refs).toContain("praep-ort#im-haus");
  });

  it("parses refs and resolves sections by id or index", () => {
    expect(parseGrammarRef("a#b")).toEqual({ key: "a", section: "b" });
    expect(parseGrammarRef("a")).toEqual({ key: "a", section: null });
    const topic = { sections: [{ id: "x" }, {}] };
    expect(sectionIndex(topic, "x")).toBe(0);
    expect(sectionIndex(topic, 1)).toBe(1);
    expect(sectionIndex(topic, 5)).toBeNull();
    expect(sectionIndex(topic, "nope")).toBeNull();
    expect(sectionIndex(topic, null)).toBeNull();
  });

  it("lists only selected chapters that have grammar", () => {
    const res = chapterGrammarFor(["begruessung", "hotel2", "nope"], EXTRA_BY_KEY, GRAMMAR_TOPICS);
    expect(res.map((c) => c.chapter.key)).toEqual(["hotel2"]);
  });
});
