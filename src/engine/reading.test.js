import { describe, it, expect } from "vitest";
import { parseParagraph, plainParagraph, indexCardsByFront, resolveLink, textsForDecks } from "./reading";
import { ALL_CARDS, READING_TEXTS } from "../data";

describe("parseParagraph", () => {
  it("splits text and linked words", () => {
    expect(parseParagraph("Ich [[komme aus|kommen aus …]] [[Österreich]].")).toEqual([
      { text: "Ich " }, { text: "komme aus", front: "kommen aus …" }, { text: " " }, { text: "Österreich", front: "Österreich" }, { text: "." },
    ]);
    expect(plainParagraph("Ein [[Bild|das Bild]] von mir.")).toBe("Ein Bild von mir.");
  });
});

describe("resolveLink", () => {
  const byFront = indexCardsByFront([{ deck: "a", front: "x" }, { deck: "b", front: "x" }]);
  it("prefers the text's own chapter", () => {
    expect(resolveLink("x", "b", byFront).deck).toBe("b");
    expect(resolveLink("x", "c", byFront).deck).toBe("a");
    expect(resolveLink("y", "a", byFront)).toBeNull();
  });
});

describe("real texts", () => {
  const byFront = indexCardsByFront(ALL_CARDS);
  it("every linked word opens a card", () => {
    const bad = READING_TEXTS.flatMap((t) => t.paragraphs.flatMap(parseParagraph)
      .filter((s) => s.front && !resolveLink(s.front, t.deck, byFront)).map((s) => `${t.key}: ${s.front}`));
    expect(bad).toEqual([]);
  });
  it("every text belongs to a deck, has a translation per paragraph and valid questions", () => {
    const decks = new Set(ALL_CARDS.map((c) => c.deck));
    for (const t of READING_TEXTS) {
      expect(decks.has(t.deck), t.key).toBe(true);
      expect(t.en.length, t.key).toBe(t.paragraphs.length);
      expect(t.questions.length, t.key).toBeGreaterThanOrEqual(3);
      for (const q of t.questions) {
        const options = q.options || ["richtig", "falsch"];
        expect(options, `${t.key}: ${q.q}`).toContain(q.answer);
      }
    }
    expect(new Set(READING_TEXTS.map((t) => t.key)).size).toBe(READING_TEXTS.length);
  });
  it("picks texts for the selected chapters", () => {
    expect(textsForDecks(READING_TEXTS, ["essen-mengen"]).map((t) => t.key)).toEqual(["essen-mengen"]);
  });
});
