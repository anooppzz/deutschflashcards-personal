import { describe, it, expect } from "vitest";
import { validateGermanWord, checkReverseAnswer, isArticleCorrect, isDictatable, speakableText, checkDictation } from "./validation";

describe("validateGermanWord", () => {
  it("ignores case, articles, umlaut spelling and the separable dot", () => {
    expect(validateGermanWord("Rechnung", "die Rechnung")).toBe(true);
    expect(validateGermanWord("fruehstuecken", "frühstücken")).toBe(true);
    expect(validateGermanWord("anrufen", "an·rufen")).toBe(true);
    expect(validateGermanWord("Angestellte", "der/die Angestellte")).toBe(true);
  });
  it("accepts reflexive verbs with or without sich", () => {
    expect(validateGermanWord("sich duschen", "duschen (sich)")).toBe(true);
    expect(validateGermanWord("duschen", "duschen (sich)")).toBe(true);
  });
  it("rejects a different word", () => {
    expect(validateGermanWord("Rechnungen", "die Rechnung")).toBe(false);
    expect(validateGermanWord("", "die Rechnung")).toBe(false);
  });
});

describe("checkReverseAnswer", () => {
  it("needs the right article for nouns", () => {
    expect(checkReverseAnswer("die Rechnung", "die Rechnung")).toEqual({ correct: true, reason: null });
    expect(checkReverseAnswer("Die rechnung", "die Rechnung").correct).toBe(true);
    expect(checkReverseAnswer("der Rechnung", "die Rechnung")).toEqual({ correct: false, reason: "wrong-article" });
    expect(checkReverseAnswer("Rechnung", "die Rechnung")).toEqual({ correct: false, reason: "missing-article" });
  });
  it("accepts either article for der/die nouns", () => {
    expect(checkReverseAnswer("der Angestellte", "der/die Angestellte").correct).toBe(true);
    expect(checkReverseAnswer("die Angestellte", "der/die Angestellte").correct).toBe(true);
    expect(checkReverseAnswer("das Angestellte", "der/die Angestellte").reason).toBe("wrong-article");
  });
  it("needs no article where the card has none", () => {
    expect(checkReverseAnswer("anrufen", "an·rufen").correct).toBe(true);
    expect(checkReverseAnswer("Weihnachten", "Weihnachten").correct).toBe(true);
  });
  it("reports a wrong word before the article", () => {
    expect(checkReverseAnswer("der Rechner", "die Rechnung").reason).toBe("word");
  });
});

describe("isArticleCorrect", () => {
  it("checks a single-gender noun", () => {
    expect(isArticleCorrect("die", "die")).toBe(true);
    expect(isArticleCorrect("der", "die")).toBe(false);
  });
  it("accepts either article for a der/die noun", () => {
    expect(isArticleCorrect("der", "der/die")).toBe(true);
    expect(isArticleCorrect("die", "der/die")).toBe(true);
    expect(isArticleCorrect("das", "der/die")).toBe(false);
  });
  it("is false before a choice is made", () => {
    expect(isArticleCorrect(null, "der")).toBe(false);
  });
});

describe("Hören (dictation)", () => {
  it("uses only cards with one clear spoken answer", () => {
    expect(isDictatable("die Rechnung")).toBe(true);
    expect(isDictatable("Wie geht's?")).toBe(true);
    expect(isDictatable("kümmern (sich)")).toBe(true);
    expect(isDictatable("das Kilo(gramm)")).toBe(false);
    expect(isDictatable("kommen aus …")).toBe(false);
    expect(isDictatable("Vielen Dank / Herzlichen Dank!")).toBe(false);
    expect(isDictatable("der/die Angestellte")).toBe(false);
  });

  it("reads reflexive and separable verbs naturally", () => {
    expect(speakableText("vor·bereiten (sich)")).toBe("sich vorbereiten");
    expect(speakableText("an·rufen")).toBe("anrufen");
    expect(speakableText("die Rechnung")).toBe("die Rechnung");
  });

  it("ignores punctuation but still needs the article", () => {
    expect(checkDictation("wie gehts", "Wie geht's?").correct).toBe(true);
    expect(checkDictation("Die Rechnung bitte", "Die Rechnung, bitte!").correct).toBe(true);
    expect(checkDictation("Rechnung", "die Rechnung").reason).toBe("missing-article");
    expect(checkDictation("sich vorbereiten", "vor·bereiten (sich)").correct).toBe(true);
  });
});
