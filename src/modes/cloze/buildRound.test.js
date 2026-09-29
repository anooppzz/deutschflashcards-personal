import { describe, it, expect } from "vitest";
import { findClozeSpan, buildCloze, buildClozePool, isClozeCorrect, findAlternateWordMatch } from "./buildRound";

describe("findClozeSpan", () => {
  it("matches a plain noun after stripping the article", () => {
    const span = findClozeSpan("die Banane", "Ich esse eine Banane.");
    expect(span).not.toBeNull();
    expect(span.matched).toBe("Banane");
  });

  it("matches an adjective literally", () => {
    const span = findClozeSpan("schön", "Das Wetter ist heute schön.");
    expect(span.matched).toBe("schön");
  });

  it("matches a separable verb via its infinitive stem after removing the middot", () => {
    const span = findClozeSpan("kaufen", "Ich kaufe frisches Brot beim Bäcker.");
    expect(span).not.toBeNull();
    expect(span.matched.toLowerCase().startsWith("kauf")).toBe(true);
  });

  it("returns null rather than a false-positive match when nothing plausible is found", () => {
    const span = findClozeSpan("die Regel", "Im Verkehr gibt es viele Regeln.");
    expect(span).toBeNull();
  });

  it("matches words that start or end with an umlaut or ß", () => {
    expect(findClozeSpan("das Öl", "Das Öl ist zum Braten.").matched).toBe("Öl");
    expect(findClozeSpan("Österreich", "Meine Familie kommt aus Österreich.").matched).toBe("Österreich");
    expect(findClozeSpan("groß", "Das Zimmer ist sehr groß.").matched).toBe("groß");
    expect(findClozeSpan("über", "Der Vogel fliegt über das Haus.").matched).toBe("über");
  });

  it("does not match a word inside a longer word", () => {
    expect(findClozeSpan("über", "Das ist überhaupt nicht gut.")).toBeNull();
    expect(findClozeSpan("das Öl", "Das Olivenöl ist teuer.")).toBeNull();
  });

  it("leaves whole phrases that end like a sentence out of Cloze", () => {
    expect(findClozeSpan("Achtung!", "Achtung! Der Zug fährt ab.")).toBeNull();
    expect(findClozeSpan("Ich komme gleich.", "Einen Augenblick, bitte. Ich komme gleich.")).toBeNull();
    expect(findClozeSpan("Zusammen oder getrennt?", "Zusammen oder getrennt? – Getrennt, bitte.")).toBeNull();
  });

  it("returns null for missing inputs instead of throwing", () => {
    expect(findClozeSpan("", "Ein Satz.")).toBeNull();
    expect(findClozeSpan("Wort", "")).toBeNull();
    expect(findClozeSpan(null, "Ein Satz.")).toBeNull();
    expect(findClozeSpan("Wort", null)).toBeNull();
  });

  it("never throws when the front value contains regex-special characters", () => {
    expect(() => findClozeSpan("(genau)so … wie", "Die Jacke ist so warm wie der Mantel.")).not.toThrow();
  });
});

describe("buildCloze", () => {
  it("splits the example into before/answer/after around the match", () => {
    const card = { front: "die Banane", example: "Ich esse eine Banane." };
    const cloze = buildCloze(card);
    expect(cloze.clozeAnswer).toBe("Banane");
    expect(cloze.clozeBefore + cloze.clozeAnswer + cloze.clozeAfter).toBe(card.example);
  });

  it("returns null when no confident match exists, rather than a broken blank", () => {
    const card = { front: "der Schuh", example: "Meine Schuhe sind schmutzig." };
    expect(buildCloze(card)).toBeNull();
  });

  it("preserves the original card's other fields", () => {
    const card = { front: "die Banane", example: "Ich esse eine Banane.", deck: "essen", exampleEn: "I eat a banana." };
    const cloze = buildCloze(card);
    expect(cloze.deck).toBe("essen");
    expect(cloze.exampleEn).toBe("I eat a banana.");
  });
});

describe("buildClozePool", () => {
  it("keeps only cards with a confident match, dropping the rest", () => {
    const cards = [
      { front: "die Banane", example: "Ich esse eine Banane." },
      { front: "der Schuh", example: "Meine Schuhe sind schmutzig." },
      { front: "kein Beispiel", example: null },
    ];
    const pool = buildClozePool(cards);
    expect(pool.length).toBe(1);
    expect(pool[0].front).toBe("die Banane");
  });

  it("returns an empty array, not an error, for an empty input", () => {
    expect(buildClozePool([])).toEqual([]);
  });
});

describe("isClozeCorrect (Tier 2 - curated synonym grading)", () => {
  it("accepts the primary answer", () => {
    const card = { clozeAnswer: "Banane" };
    expect(isClozeCorrect("banane", card)).toBe(true);
  });

  it("rejects a wrong answer when no alternates are declared", () => {
    const card = { clozeAnswer: "T-Shirt" };
    expect(isClozeCorrect("Hemd", card)).toBe(false);
  });

  it("accepts a curated alternate (e.g. a regional synonym)", () => {
    const card = { clozeAnswer: "Aufzug", acceptableAlternates: ["Lift"] };
    expect(isClozeCorrect("Lift", card)).toBe(true);
    expect(isClozeCorrect("lift", card)).toBe(true);
  });

  it("still rejects an answer that matches neither the primary nor any alternate", () => {
    const card = { clozeAnswer: "Aufzug", acceptableAlternates: ["Lift"] };
    expect(isClozeCorrect("Treppe", card)).toBe(false);
  });

  it("does not crash on a card with no acceptableAlternates field at all", () => {
    expect(() => isClozeCorrect("x", { clozeAnswer: "y" })).not.toThrow();
  });
});

describe("findAlternateWordMatch (Tier 1 - real-word-but-wrong feedback)", () => {
  const allWords = [
    { front: "das Hemd", english: "shirt" },
    { front: "das T-Shirt", english: "T-shirt" },
    { front: "die Banane", english: "banana" },
  ];

  it("finds a real word elsewhere in the dataset that isn't the current answer", () => {
    const match = findAlternateWordMatch("Hemd", allWords);
    expect(match).not.toBeNull();
    expect(match.english).toBe("shirt");
  });

  it("returns null for genuine gibberish", () => {
    expect(findAlternateWordMatch("asdkjqwe", allWords)).toBeNull();
  });

  it("returns null for empty input rather than matching everything", () => {
    expect(findAlternateWordMatch("", allWords)).toBeNull();
    expect(findAlternateWordMatch("   ", allWords)).toBeNull();
  });

  it("is case-insensitive, matching the same tolerance as grading", () => {
    expect(findAlternateWordMatch("hemd", allWords)).not.toBeNull();
  });
});
