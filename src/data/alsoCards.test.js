import { describe, it, expect } from "vitest";
import { EXTRA_TOPICS, alsoCardsOf } from "./index";

// a chapter's "alsoCards" show cards from other chapters - never copies
describe("alsoCards", () => {
  const withAlso = EXTRA_TOPICS.filter((t) => t.alsoCards);

  it("name only chapter cards that exist (renamed a card? update its id here too)", () => {
    const missing = withAlso.flatMap((t) => t.alsoCards
      .filter((id) => !alsoCardsOf(t.key).some(({ deck, raw }) => `${deck}::${raw.front}` === id))
      .map((id) => `${t.key}: ${id}`));
    expect(missing).toEqual([]);
  });

  it("come from another chapter, once, and aren't also a card of the chapter itself", () => {
    const bad = withAlso.flatMap((t) => {
      const own = new Set(t.cards.map((c) => c.front));
      return alsoCardsOf(t.key)
        .filter(({ deck, raw }) => deck === t.key || own.has(raw.front))
        .map(({ raw }) => `${t.key}: ${raw.front}`)
        .concat(new Set(t.alsoCards).size === t.alsoCards.length ? [] : [`${t.key}: repeated id`]);
    });
    expect(bad).toEqual([]);
  });
});
