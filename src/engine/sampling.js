// Fisher-Yates shuffle - used for the "⤮ Shuffle" button across every deck
// view, distinct from weightedSample (which favors overdue cards; this is a
// flat, unweighted shuffle for browsing a deck in a random order).
export const shuffled = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Spaced repetition (#4): overdue cards are sampled far more often, cards not
// yet due are sampled rarely, and never-seen cards get a healthy default -
// this is what actually drives adaptive review instead of flat shuffling.
// Works unchanged under the FSRS-inspired model (engine/fsrs.js) since it
// only reads entry.due, not the shape of whatever produced that date.
import { DAY_MS } from "../constants";
import { idOf } from "./fsrs";

export const cardWeight = (card, progress) => {
  const entry = progress[idOf(card.deck, card.front)];
  if (!entry) return 2.2; // new - worth prioritizing, but not as much as something overdue
  const now = Date.now();
  if (entry.due <= now) {
    const overdueDays = (now - entry.due) / DAY_MS;
    return Math.min(6, 3 + overdueDays * 0.5); // more overdue → more likely, capped
  }
  return 0.12; // not due yet - rarely shown, never fully excluded
};

// Weighted sampling without replacement (A-ES algorithm): higher weight → more likely picked.
export const weightedSample = (items, n, progress) => {
  const keyed = items.map((c) => ({ c, key: Math.pow(Math.random(), 1 / cardWeight(c, progress)) }));
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, n).map((x) => x.c);
};
