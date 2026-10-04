import { describe, it, expect } from "vitest";
import { validateGermanWord, checkReverseAnswer } from "./validation";

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
