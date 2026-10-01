// "Heute fällig": every card whose spaced-repetition review date has come,
// across all decks. Cards never studied have no date yet, so they aren't
// due - they come in through the topics and practice modes instead.
// Most overdue first.
import { idOf } from "./fsrs";

export const dueCards = (progress, cards, now = Date.now()) =>
  cards
    .map((card) => ({ card, entry: progress[idOf(card.deck, card.front)] }))
    .filter(({ entry }) => entry && typeof entry.due === "number" && entry.due <= now)
    .sort((a, b) => a.entry.due - b.entry.due)
    .map(({ card }) => card);
