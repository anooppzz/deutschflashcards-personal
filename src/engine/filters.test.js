import { describe, it, expect } from "vitest";
import { distinctLevels, distinctSources, passesLevelFilter, passesSourceFilter, passesGlobalFilters, NO_SOURCE } from "./filters";

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
    const cards = [{ source: "B" }, { source: "A" }, { source: "A" }];
    expect(distinctSources(cards)).toEqual(["A", "B"]);
  });
  it("adds NO_SOURCE last when some cards have no source", () => {
    expect(distinctSources([{ source: "A" }, {}])).toEqual(["A", NO_SOURCE]);
    expect(distinctSources([{}])).toEqual([NO_SOURCE]);
  });
  it("counts every source of a card that comes from two books", () => {
    const cards = [{ source: "Menschen", sources: ["Menschen", "Grammatik aktiv"] }, { source: "Menschen" }];
    expect(distinctSources(cards)).toEqual(["Grammatik aktiv", "Menschen"]);
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
  it("passes an untagged card only while the NO_SOURCE chip is on", () => {
    expect(passesSourceFilter({}, ["Einheit 3", NO_SOURCE])).toBe(true);
    expect(passesSourceFilter({}, ["Einheit 3"])).toBe(false);
  });
  it("passes a card from two books when either one is selected", () => {
    const card = { source: "Einheit 7", sources: ["Einheit 7", "Grammatik aktiv"] };
    expect(passesSourceFilter(card, ["Grammatik aktiv"])).toBe(true);
    expect(passesSourceFilter(card, ["Einheit 7"])).toBe(true);
    expect(passesSourceFilter(card, ["Einheit 3"])).toBe(false);
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
