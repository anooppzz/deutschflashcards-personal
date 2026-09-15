import { describe, it, expect } from "vitest";
import { gridWord, buildWordSearchPool, buildWordSearchGrid, buildWordSearchRound, resolveWordSearchSize } from "./buildGrid";

describe("gridWord", () => {
  it("strips the article and uppercases", () => {
    expect(gridWord("die Banane")).toBe("BANANE");
  });

  it("substitutes umlauts for grid purposes", () => {
    expect(gridWord("der Käse")).toBe("KAESE");
    expect(gridWord("schön")).toBe("SCHOEN");
    expect(gridWord("die Straße")).toBe("STRASSE");
  });

  it("rejects multi-word phrases", () => {
    expect(gridWord("zum Beispiel")).toBeNull();
  });

  it("rejects words shorter than the minimum", () => {
    expect(gridWord("ja")).toBeNull();
  });

  it("rejects words longer than the maximum", () => {
    expect(gridWord("Straßenverkehrsordnung")).toBeNull();
  });

  it("handles separable verbs by removing the middot", () => {
    expect(gridWord("an·bieten")).toBe("ANBIETEN");
  });
});

describe("buildWordSearchPool", () => {
  it("keeps only cards with a usable grid word AND an example + translation", () => {
    const cards = [
      { front: "die Banane", example: "Ich esse eine Banane.", exampleEn: "I eat a banana." },
      { front: "zum Beispiel", example: "Zum Beispiel Äpfel.", exampleEn: "For example, apples." },
      { front: "die Katze", example: null, exampleEn: null },
    ];
    const pool = buildWordSearchPool(cards);
    expect(pool.length).toBe(1);
    expect(pool[0].front).toBe("die Banane");
    expect(pool[0].gridWord).toBe("BANANE");
  });
});

describe("buildWordSearchGrid", () => {
  const sampleCards = [
    { front: "die Banane", example: "x", exampleEn: "y" },
    { front: "der Apfel", example: "x", exampleEn: "y" },
    { front: "die Katze", example: "x", exampleEn: "y" },
    { front: "der Hund", example: "x", exampleEn: "y" },
    { front: "das Brot", example: "x", exampleEn: "y" },
  ].map((c) => ({ ...c, gridWord: gridWord(c.front) }));

  it("produces a square grid sized to fit the longest word, within bounds", () => {
    const { grid, size } = buildWordSearchGrid(sampleCards);
    expect(grid.length).toBe(size);
    expect(grid.every((row) => row.length === size)).toBe(true);
    expect(size).toBeGreaterThanOrEqual(8);
    expect(size).toBeLessThanOrEqual(14);
  });

  it("fills every cell - no null/empty cells left over", () => {
    const { grid } = buildWordSearchGrid(sampleCards);
    grid.forEach((row) => row.forEach((cell) => expect(typeof cell).toBe("string")));
  });

  it("places most or all words when there's plenty of room", () => {
    const { placements } = buildWordSearchGrid(sampleCards);
    expect(placements.length).toBeGreaterThan(0);
    expect(placements.length).toBeLessThanOrEqual(sampleCards.length);
  });

  it("every placement's path cells actually spell the word in the grid", () => {
    const { grid, placements } = buildWordSearchGrid(sampleCards);
    placements.forEach((p) => {
      const spelled = p.path.map(({ row, col }) => grid[row][col]).join("");
      expect(spelled).toBe(p.word);
    });
  });

  it("every placement path is contiguous and forward-only (one of the 4 allowed directions)", () => {
    const { placements } = buildWordSearchGrid(sampleCards);
    const allowedDeltas = [[0, 1], [1, 0], [1, 1], [1, -1]];
    placements.forEach((p) => {
      if (p.path.length < 2) return;
      const dr = p.path[1].row - p.path[0].row;
      const dc = p.path[1].col - p.path[0].col;
      expect(allowedDeltas.some(([a, b]) => a === dr && b === dc)).toBe(true);
      for (let i = 2; i < p.path.length; i++) {
        expect(p.path[i].row - p.path[i - 1].row).toBe(dr);
        expect(p.path[i].col - p.path[i - 1].col).toBe(dc);
      }
    });
  });

  it("never throws and always returns a valid grid even with zero eligible words", () => {
    expect(() => buildWordSearchGrid([])).not.toThrow();
    const { grid, placements, size } = buildWordSearchGrid([]);
    expect(placements).toEqual([]);
    expect(grid.length).toBe(size);
  });

  it("handles a single very long word without exceeding MAX_GRID", () => {
    const longCard = { front: "die Sehenswürdigkeit", gridWord: gridWord("die Sehenswürdigkeit") };
    const { grid, size } = buildWordSearchGrid(longCard.gridWord ? [longCard] : []);
    expect(size).toBeLessThanOrEqual(14);
    expect(grid.length).toBe(size);
  });
});

describe("buildWordSearchRound", () => {
  it("never selects more words than requested", () => {
    const pool = buildWordSearchPool([
      { front: "die Banane", example: "x", exampleEn: "y" },
      { front: "der Apfel", example: "x", exampleEn: "y" },
      { front: "die Katze", example: "x", exampleEn: "y" },
    ]);
    const { placements } = buildWordSearchRound(pool, 2);
    expect(placements.length).toBeLessThanOrEqual(2);
  });
});

describe("resolveWordSearchSize", () => {
  it("respects a valid preset", () => {
    expect(resolveWordSearchSize(8, 20)).toBe(8);
  });
  it("clamps to the available pool size", () => {
    expect(resolveWordSearchSize(10, 3)).toBe(3);
  });
  it("falls back to a sane default for an unrecognized pref", () => {
    expect(resolveWordSearchSize("bogus", 20)).toBe(8);
  });
});
