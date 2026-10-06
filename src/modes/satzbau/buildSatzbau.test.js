import { describe, it, expect } from "vitest";
import { tokenizeSentence, isSatzbauSentence, buildSatzbauPool, chipsFor, isCorrectOrder } from "./buildSatzbau";
import { ALL_CARDS } from "../../data";

describe("Satzbau", () => {
  it("splits a sentence into words and its end mark", () => {
    expect(tokenizeSentence("Ich habe den Bus genommen.")).toEqual({ words: ["Ich", "habe", "den", "Bus", "genommen"], end: "." });
    expect(tokenizeSentence("Darf ich hier sitzen?")).toEqual({ words: ["Darf", "ich", "hier", "sitzen"], end: "?" });
    expect(tokenizeSentence("Ja, gern, wir kommen mit!").words).toEqual(["Ja,", "gern,", "wir", "kommen", "mit"]);
  });

  it("keeps sentences of 4-10 words without gaps or quotes", () => {
    expect(isSatzbauSentence("Ich habe den Bus genommen.")).toBe(true);
    expect(isSatzbauSentence("Sei bitte leise!")).toBe(false);
    expect(isSatzbauSentence("Ich heiße … und komme aus …")).toBe(false);
    expect(isSatzbauSentence("Er sagt: „Komm her!“")).toBe(false);
  });

  it("builds one item per distinct sentence", () => {
    const cards = [
      { deck: "a", front: "x", example: "Ich habe den Bus genommen.", exampleEn: "I took the bus." },
      { deck: "b", front: "y", example: "Ich habe den Bus genommen." },
      { deck: "c", front: "z", example: "Kurz." },
    ];
    const pool = buildSatzbauPool(cards);
    expect(pool).toHaveLength(1);
    expect(pool[0]).toMatchObject({ id: "a::x", en: "I took the bus.", end: "." });
  });

  it("never shows the answer as the starting order", () => {
    const item = { words: ["Ich", "habe", "den", "Bus", "genommen"] };
    const identity = (a) => [...a];
    const chips = chipsFor(item, identity);
    expect(chips.join(" ")).not.toBe("habe den Bus genommen");
    expect([...chips].sort()).toEqual(["Bus", "den", "genommen", "habe"]);
    expect(isCorrectOrder(item, ["habe", "den", "Bus", "genommen"])).toBe(true);
    expect(isCorrectOrder(item, ["den", "Bus", "habe", "genommen"])).toBe(false);
  });

  it("finds plenty of sentences in the real decks", () => {
    expect(buildSatzbauPool(ALL_CARDS).length).toBeGreaterThan(400);
  });
});
