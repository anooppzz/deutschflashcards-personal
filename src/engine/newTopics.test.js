import { describe, it, expect } from "vitest";
import { newTopicsOf } from "./newTopics";
import EXTRA_TOPICS from "../data/decks/extra-topics.json";

const topics = [
  { key: "a", added: "2026-10-05" },
  { key: "b", added: "2026-08-01" },
  { key: "c" },
];
const now = Date.parse("2026-10-06T12:00:00Z");

describe("newTopicsOf", () => {
  it("lists recently added chapters only", () => {
    expect(newTopicsOf(topics, { now }).map((t) => t.key)).toEqual(["a"]);
  });
  it("skips chapters already seen or selected", () => {
    expect(newTopicsOf(topics, { now, seen: ["a"] })).toEqual([]);
    expect(newTopicsOf(topics, { now, selected: ["a"] })).toEqual([]);
  });
  it("every added date in the data is a valid YYYY-MM-DD", () => {
    const bad = EXTRA_TOPICS.filter((t) => t.added && !/^\d{4}-\d{2}-\d{2}$/.test(t.added)).map((t) => t.key);
    expect(bad).toEqual([]);
  });
});
