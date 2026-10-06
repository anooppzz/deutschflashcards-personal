import { describe, it, expect } from "vitest";
import { lookupTerm, wordLinks, wordQuestion, claudeUrl, topicLinks, topicQuestion, wordSubject, topicSubject } from "./lookup";

describe("lookupTerm", () => {
  it("strips article, dot, brackets and alternatives", () => {
    expect(lookupTerm("die Rechnung")).toBe("Rechnung");
    expect(lookupTerm("der/die Angestellte")).toBe("Angestellte");
    expect(lookupTerm("an·rufen")).toBe("anrufen");
    expect(lookupTerm("vor·bereiten (sich)")).toBe("vorbereiten");
    expect(lookupTerm("das Kilo(gramm)")).toBe("Kilo");
    expect(lookupTerm("Vielen Dank / Herzlichen Dank!")).toBe("Vielen Dank");
    expect(lookupTerm("Wie geht's?")).toBe("Wie geht's");
    expect(lookupTerm("kommen aus …")).toBe("kommen aus");
    expect(lookupTerm("")).toBe("");
  });
});

describe("links", () => {
  it("builds encoded dictionary links", () => {
    const links = wordLinks("die Größe");
    expect(links.map((l) => l.label)).toEqual(["Duden", "DWDS", "Verbformen", "Reverso", "Leo", "Google"]);
    expect(links[0].url).toBe("https://www.duden.de/suchen/dudenonline/Gr%C3%B6%C3%9Fe");
    expect(topicLinks("Perfekt")[0].url).toContain("Perfekt%20Deutsch%20Grammatik%20A2");
  });

  it("writes a Claude question with the card's context", () => {
    const q = wordQuestion({ front: "die Rechnung", english: "bill", example: "Die Rechnung, bitte!" });
    expect(q).toContain("„die Rechnung“ (bill)");
    expect(q).toContain("Die Rechnung, bitte!");
    expect(claudeUrl(q)).toMatch(/^https:\/\/claude\.ai\/new\?q=I'm%20learning/);
  });
});

describe("AI subjects", () => {
  it("carry the card or topic for the in-app chat", () => {
    const w = wordSubject({ front: "die Rechnung", english: "bill", example: "Die Rechnung, bitte!" });
    expect(w).toMatchObject({ kind: "word", title: "die Rechnung" });
    expect(w.question).toBe(wordQuestion({ front: "die Rechnung", english: "bill", example: "Die Rechnung, bitte!" }));
    expect(w.context).toContain("„die Rechnung“ (bill)");
    expect(w.context).toContain("Die Rechnung, bitte!");
    const t = topicSubject("Perfekt");
    expect(t).toMatchObject({ kind: "topic", title: "Perfekt", question: topicQuestion("Perfekt") });
    expect(t.context).toContain("„Perfekt“");
  });
});
