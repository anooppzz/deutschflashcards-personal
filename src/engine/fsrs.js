// Adaptive spaced repetition, inspired by FSRS (Free Spaced Repetition
// Scheduler). IMPORTANT HONESTY NOTE: this is a simplified model that
// captures FSRS's core idea - per-card memory state (difficulty +
// stability) driving an individually-adaptive review interval - rather
// than a byte-for-byte port of the real FSRS-4.5/5 algorithm. The actual
// spec uses ~19 parameters trained on a large cross-user review dataset,
// retrievability curves, and elapsed-time-aware stability updates; hand-
// rolling that correctly without a training dataset would be closer to
// guessing than implementing. What this DOES faithfully capture is the
// real behavioral difference from the old fixed-box Leitner system: two
// cards that are both "box 3" under Leitner get IDENTICAL treatment no
// matter how each one actually behaves, whereas here, two cards with the
// same review count can end up with very different next-review dates
// because their own difficulty/stability history diverged.
//
// Model per card: { difficulty, stability, due, reps }
//   difficulty: 1 (easy) - 10 (hard), starts at 5 (neutral)
//   stability: days until ~forgetting - this IS the review interval
//   reps: total number of graded reviews (for display/debugging only)
import { DAY_MS, STORAGE_KEYS } from "../constants";
import { storage } from "./storage";

const INITIAL_STABILITY = 1;
const INITIAL_DIFFICULTY = 5;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const MIN_STABILITY = 1;
// Hard cap on how far out a review can ever be pushed. Real FSRS
// implementations cap maximum interval too (commonly configurable, often
// far larger for full-scale deployments) - without SOME cap, a card that
// gets a modest streak of correct answers grows its interval exponentially
// forever (verified: 30 correct reviews in a row reaches a multi-million-
// year interval with no cap) and would never be shown again in practice,
// which defeats spaced repetition rather than serving it. A cap around
// one year is a reasonable ceiling for a personal study app - it means
// "I'm confident I know this" tops out at "revisit at most yearly," not
// "never again."
const MAX_STABILITY = 365;

// A card reads as "known" once its stability crosses this many days -
// mirrors the old KNOWN_BOX_THRESHOLD concept (box 4+, a 7+ day gap) but
// expressed in the new model's own terms rather than reusing box numbers.
export const KNOWN_STABILITY_THRESHOLD = 21;

export const initFsrsCard = () => ({
  difficulty: INITIAL_DIFFICULTY,
  stability: INITIAL_STABILITY,
  due: Date.now(),
  reps: 0,
});

// Grade a review. correct=true nudges difficulty down (easier next time)
// and grows stability - easier cards (lower difficulty) grow faster than
// hard ones, which is the actual point of an adaptive model: a card you
// keep getting right coasts to longer and longer gaps, proportional to
// how easy IT specifically has been, not a fixed universal schedule.
// correct=false is a real setback: difficulty rises, stability collapses
// back toward the minimum rather than to zero, since a single miss on an
// otherwise well-known word shouldn't fully erase its history.
export const reviewFsrsCard = (entry, correct) => {
  const e = entry && typeof entry.stability === "number" ? entry : initFsrsCard();
  let { difficulty, stability } = e;
  const reps = (e.reps || 0) + 1;

  if (correct) {
    difficulty = Math.max(MIN_DIFFICULTY, difficulty - 0.3);
    // growth factor ranges ~1.6x (hard, difficulty near 10) to ~3x (easy, difficulty near 1)
    const growth = 1 + ((11 - difficulty) / 10) * 1.5;
    stability = Math.min(MAX_STABILITY, Math.max(MIN_STABILITY, stability * growth));
  } else {
    difficulty = Math.min(MAX_DIFFICULTY, difficulty + 1.2);
    stability = Math.max(MIN_STABILITY, stability * 0.3);
  }

  const due = Date.now() + stability * DAY_MS;
  return { difficulty, stability, due, reps };
};

export const isKnownStability = (stability) => stability >= KNOWN_STABILITY_THRESHOLD;

// Manual override from the flashcard's ✓ Gekonnt / ↻ Üben buttons - a
// coarser, direct statement rather than a graded review. "Known" jumps
// stability straight to the known threshold; "review" resets to fresh.
export const knownFsrsCard = () => ({ difficulty: INITIAL_DIFFICULTY, stability: KNOWN_STABILITY_THRESHOLD, due: Date.now() + KNOWN_STABILITY_THRESHOLD * DAY_MS, reps: 0 });
export const reviewNowFsrsCard = () => initFsrsCard();

export const statusOfFsrs = (entry) => {
  if (!entry || typeof entry.stability !== "number") return undefined;
  if (isKnownStability(entry.stability)) return "known";
  if (entry.reps === 0 || entry.stability <= MIN_STABILITY) return "review";
  return "progress";
};

export const dueLabel = (due) => {
  const days = Math.ceil((due - Date.now()) / DAY_MS);
  if (days <= 0) return "heute";
  if (days === 1) return "morgen";
  return `in ${days} Tg.`;
};

// One-time migration: old entries were { box, due } (Leitner, 0-6).
// Converts to the new { difficulty, stability, due, reps } shape using a
// sensible mapping so nobody's existing progress silently resets to zero
// the first time they open the app after this change.
const OLD_INTERVAL_BY_BOX = [0, 1, 2, 4, 7, 14, 30];
export const migrateBoxEntry = (old) => {
  if (!old || typeof old.box !== "number") return old;
  const stability = Math.max(MIN_STABILITY, OLD_INTERVAL_BY_BOX[old.box] || MIN_STABILITY);
  return {
    difficulty: INITIAL_DIFFICULTY,
    stability,
    due: old.due,
    reps: old.box,
  };
};

export const saveProgress = (map) => {
  try { storage.set(STORAGE_KEYS.PROGRESS, JSON.stringify(map)); } catch (e) {}
};

export const idOf = (deck, front) => `${deck}::${front}`;
