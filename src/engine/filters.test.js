import { describe, it, expect } from "vitest";
import { distinctLevels, distinctSources, passesLevelFilter, passesSourceFilter, passesGlobalFilters } from "./filters";

describe("distinctLevels", () => {
  it("returns only the levels actually present, in A1-then-A2 order", () => {
    const cards = [{ level: "A2" }, { level: "A1" }, { level: "A2" }];
    expect(distinctLevels(cards)).toEqual(["A1", "A2"]);
  });
  it("returns an empty array when nothing has a level", () => {
    expect(distinctLevels([{ front: "x" }])).toEqual([]);
  });
});

describe("distinctSources", () => {
  it("returns unique, sorted source strings", () => {
    const cards = [{ source: "B" }, { source: "A" }, { source: "A" }, {}];
    expect(distinctSources(cards)).toEqual(["A", "B"]);
  });
});

describe("passesLevelFilter", () => {
  it("passes a card whose level is in the active set", () => {
    expect(passesLevelFilter({ level: "A1" }, ["A1", "A2"])).toBe(true);
  });
  it("excludes a card whose level was deselected", () => {
    expect(passesLevelFilter({ level: "A2" }, ["A1"])).toBe(false);
  });
  it("always passes a card with no level (defensive default)", () => {
    expect(passesLevelFilter({}, ["A1"])).toBe(true);
  });
});

describe("passesSourceFilter", () => {
  it("passes a card whose source is in the active set", () => {
    expect(passesSourceFilter({ source: "Einheit 3" }, ["Einheit 3"])).toBe(true);
  });
  it("excludes a card whose source was deselected", () => {
    expect(passesSourceFilter({ source: "Einheit 4" }, ["Einheit 3"])).toBe(false);
  });
  it("always passes an untagged card so filtering by chapter never hides untagged content", () => {
    expect(passesSourceFilter({}, ["Einheit 3"])).toBe(true);
  });
});

describe("passesGlobalFilters", () => {
  it("requires both level and source to pass", () => {
    const card = { level: "A2", source: "Einheit 5" };
    expect(passesGlobalFilters(card, ["A2"], ["Einheit 5"])).toBe(true);
    expect(passesGlobalFilters(card, ["A1"], ["Einheit 5"])).toBe(false);
    expect(passesGlobalFilters(card, ["A2"], ["Einheit 3"])).toBe(false);
  });
});
