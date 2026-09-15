import { describe, it, expect } from "vitest";
import {
  initFsrsCard,
  reviewFsrsCard,
  isKnownStability,
  statusOfFsrs,
  dueLabel,
  migrateBoxEntry,
  knownFsrsCard,
  reviewNowFsrsCard,
  KNOWN_STABILITY_THRESHOLD,
} from "./fsrs";

describe("initFsrsCard", () => {
  it("returns a fresh card with sane defaults", () => {
    const c = initFsrsCard();
    expect(c.difficulty).toBe(5);
    expect(c.stability).toBe(1);
    expect(c.reps).toBe(0);
    expect(typeof c.due).toBe("number");
  });
});

describe("reviewFsrsCard - the stability cap regression test", () => {
  // This is a direct regression test for a real bug found during a
  // self-critique pass: with no upper cap, 30 correct reviews in a row
  // pushed the interval past 474 million YEARS, which functionally means
  // the card is never shown again - the opposite of what spaced
  // repetition is supposed to do. This test exists specifically so that
  // bug can never silently come back.
  it("never lets stability exceed the cap, even after many correct reviews in a row", () => {
    let entry = null;
    for (let i = 0; i < 50; i++) {
      entry = reviewFsrsCard(entry, true);
    }
    expect(entry.stability).toBeLessThanOrEqual(365);
    expect(Number.isFinite(entry.stability)).toBe(true);
  });

  it("grows stability on a correct review", () => {
    const entry = reviewFsrsCard(null, true);
    expect(entry.stability).toBeGreaterThan(1);
  });

  it("decreases difficulty on a correct review, within bounds", () => {
    const entry = reviewFsrsCard(null, true);
    expect(entry.difficulty).toBeLessThan(5);
    expect(entry.difficulty).toBeGreaterThanOrEqual(1);
  });

  it("shrinks stability on a wrong review but never below the floor", () => {
    let entry = reviewFsrsCard(null, true);
    entry = reviewFsrsCard(entry, true);
    const beforeMiss = entry.stability;
    entry = reviewFsrsCard(entry, false);
    expect(entry.stability).toBeLessThan(beforeMiss);
    expect(entry.stability).toBeGreaterThanOrEqual(1);
  });

  it("increases difficulty on a wrong review, capped at 10", () => {
    let entry = null;
    for (let i = 0; i < 20; i++) entry = reviewFsrsCard(entry, false);
    expect(entry.difficulty).toBeLessThanOrEqual(10);
  });

  it("increments reps on every review regardless of correctness", () => {
    let entry = reviewFsrsCard(null, true);
    expect(entry.reps).toBe(1);
    entry = reviewFsrsCard(entry, false);
    expect(entry.reps).toBe(2);
  });

  it("treats a malformed/legacy entry as fresh rather than crashing", () => {
    const entry = reviewFsrsCard({ notAValidShape: true }, true);
    expect(Number.isFinite(entry.stability)).toBe(true);
    expect(Number.isFinite(entry.difficulty)).toBe(true);
  });
});

describe("isKnownStability", () => {
  it("matches the documented threshold constant", () => {
    expect(isKnownStability(KNOWN_STABILITY_THRESHOLD)).toBe(true);
    expect(isKnownStability(KNOWN_STABILITY_THRESHOLD - 0.01)).toBe(false);
  });
});

describe("statusOfFsrs", () => {
  it("returns undefined for no entry", () => {
    expect(statusOfFsrs(undefined)).toBeUndefined();
    expect(statusOfFsrs(null)).toBeUndefined();
  });

  it("returns 'known' once stability crosses the threshold", () => {
    expect(statusOfFsrs({ stability: 30, reps: 5 })).toBe("known");
  });

  it("returns 'review' for a fresh/never-reviewed entry", () => {
    expect(statusOfFsrs({ stability: 1, reps: 0 })).toBe("review");
  });

  it("returns 'progress' for a mid-training entry", () => {
    expect(statusOfFsrs({ stability: 5, reps: 3 })).toBe("progress");
  });
});

describe("dueLabel", () => {
  const DAY_MS = 86400000;
  it("says 'heute' for something due now or in the past", () => {
    expect(dueLabel(Date.now() - 1000)).toBe("heute");
  });
  it("says 'morgen' for exactly one day out", () => {
    expect(dueLabel(Date.now() + DAY_MS)).toBe("morgen");
  });
  it("gives a day count further out", () => {
    expect(dueLabel(Date.now() + 5 * DAY_MS)).toMatch(/in \d+ Tg\./);
  });
});

describe("migrateBoxEntry", () => {
  it("converts an old fixed-box entry into the adaptive shape", () => {
    const old = { box: 3, due: 12345 };
    const migrated = migrateBoxEntry(old);
    expect(migrated.stability).toBeGreaterThan(0);
    expect(migrated.due).toBe(12345);
    expect(migrated.reps).toBe(3);
    expect(migrated.difficulty).toBe(5);
  });

  it("passes through non-box entries unchanged", () => {
    const already = { difficulty: 4, stability: 10, due: 1, reps: 2 };
    expect(migrateBoxEntry(already)).toBe(already);
  });

  it("never produces a stability below the floor even for box 0", () => {
    const migrated = migrateBoxEntry({ box: 0, due: 1 });
    expect(migrated.stability).toBeGreaterThanOrEqual(1);
  });
});

describe("knownFsrsCard / reviewNowFsrsCard (manual ✓/↻ overrides)", () => {
  it("knownFsrsCard immediately reads as known", () => {
    expect(isKnownStability(knownFsrsCard().stability)).toBe(true);
  });
  it("reviewNowFsrsCard resets to a fresh, due-now state", () => {
    const c = reviewNowFsrsCard();
    expect(c.stability).toBe(1);
    expect(c.due).toBeLessThanOrEqual(Date.now() + 1000);
  });
});
