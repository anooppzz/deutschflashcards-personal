import { describe, it, expect } from "vitest";
import { effectiveCount, effectiveStreakDisplay, addDaysStr, localDateStr } from "./streak";

describe("streak: a new day starts at 0", () => {
  const today = localDateStr();
  const yesterday = addDaysStr(today, -1);
  it("shows today's count only when the data is from today", () => {
    expect(effectiveCount({ date: today, count: 7, goal: 10 }, today)).toBe(7);
    expect(effectiveCount({ date: yesterday, count: 37, goal: 10 }, today)).toBe(0);
    expect(effectiveCount(null, today)).toBe(0);
  });
  it("keeps yesterday's streak alive until midnight of today, but not older ones", () => {
    expect(effectiveStreakDisplay({ date: yesterday, count: 37, goal: 10, streak: 3 })).toBe(3);
    expect(effectiveStreakDisplay({ date: addDaysStr(today, -2), count: 37, goal: 10, streak: 3 })).toBe(0);
  });
});
