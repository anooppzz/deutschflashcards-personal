import { describe, it, expect } from "vitest";
import { dueCards } from "./review";
import { idOf } from "./fsrs";

const card = (front, deck = "x") => ({ deck, front });
const NOW = 1_000_000;

describe("dueCards", () => {
  it("returns studied cards whose date has come, most overdue first", () => {
    const cards = [card("a"), card("b"), card("c"), card("d")];
    const progress = {
      [idOf("x", "a")]: { due: NOW - 10 },
      [idOf("x", "b")]: { due: NOW + 10 }, // not yet
      [idOf("x", "c")]: { due: NOW - 500 },
      // d: never studied - not due
    };
    expect(dueCards(progress, cards, NOW).map((c) => c.front)).toEqual(["c", "a"]);
  });

  it("ignores progress for cards that no longer exist", () => {
    expect(dueCards({ [idOf("x", "gone")]: { due: 0 } }, [card("a")], NOW)).toEqual([]);
  });

  it("keeps the same word in two decks apart", () => {
    const progress = { [idOf("x", "a")]: { due: 0 } };
    expect(dueCards(progress, [card("a", "x"), card("a", "y")], NOW)).toEqual([card("a", "x")]);
  });
});
