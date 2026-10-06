import { describe, it, expect } from "vitest";
import { scheduleTopic, isTopicDue, nextGrammarTopic } from "./grammarReview";

describe("scheduleTopic", () => {
  it("passing grows the gap: 3, 8, 20 … up to 60 days", () => {
    let e = scheduleTopic(undefined, 9, 10, "2026-10-06");
    expect(e).toEqual({ interval: 3, due: "2026-10-09", last: "2026-10-06" });
    e = scheduleTopic(e, 10, 10, "2026-10-09");
    expect(e.interval).toBe(8);
    e = scheduleTopic(e, 8, 10, "2026-10-17");
    expect(e.interval).toBe(20);
    expect(scheduleTopic({ interval: 50 }, 10, 10, "2026-10-06").interval).toBe(60);
  });
  it("below 80% comes back tomorrow", () => {
    expect(scheduleTopic({ interval: 20 }, 7, 10, "2026-10-06")).toEqual({ interval: 1, due: "2026-10-07", last: "2026-10-06" });
  });
});

describe("nextGrammarTopic", () => {
  const topics = [{ key: "a" }, { key: "b" }, { key: "c" }];
  const exercises = { a: [1], b: [1], c: [1] };
  it("prefers the most overdue topic", () => {
    const schedule = { a: { due: "2026-10-05" }, b: { due: "2026-10-01" }, c: { due: "2026-10-30" } };
    expect(nextGrammarTopic(topics, exercises, schedule, "2026-10-06")).toEqual({ key: "b", due: true });
    expect(isTopicDue(schedule.c, "2026-10-06")).toBe(false);
  });
  it("otherwise suggests the first topic never practised", () => {
    expect(nextGrammarTopic(topics, exercises, { a: { due: "2026-10-30" } }, "2026-10-06")).toEqual({ key: "b", due: false });
    expect(nextGrammarTopic(topics, exercises, { a: { due: "2026-11-01" }, b: { due: "2026-11-01" }, c: { due: "2026-11-01" } }, "2026-10-06")).toBeNull();
  });
});
