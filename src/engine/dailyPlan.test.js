import { describe, it, expect } from "vitest";
import { freshDaily, addNewId, newCardsFor } from "./dailyPlan";
import { idOf } from "./fsrs";

describe("daily plan", () => {
  it("starts a new day empty and keeps today's state", () => {
    expect(freshDaily({ date: "2026-10-05", newIds: ["a"], grammar: true }, "2026-10-06"))
      .toEqual({ date: "2026-10-06", newIds: [], grammar: false, collapsed: false });
    expect(freshDaily({ date: "2026-10-06", newIds: ["a"], grammar: true }, "2026-10-06").newIds).toEqual(["a"]);
    expect(freshDaily(null, "2026-10-06").date).toBe("2026-10-06");
  });

  it("counts each new card once", () => {
    const d = addNewId(freshDaily(null, "2026-10-06"), "x::y");
    expect(addNewId(d, "x::y")).toBe(d);
    expect(d.newIds).toEqual(["x::y"]);
  });

  it("offers unseen cards, selected chapters first", () => {
    const cards = [{ deck: "a", front: "1" }, { deck: "b", front: "2" }, { deck: "b", front: "3" }, { deck: "a", front: "4" }];
    const progress = { [idOf("b", "2")]: {} };
    expect(newCardsFor(cards, progress, ["b"], idOf, 10).map((c) => c.front)).toEqual(["3", "1", "4"]);
    expect(newCardsFor(cards, progress, ["b"], idOf, 2).map((c) => c.front)).toEqual(["3", "1"]);
  });
});
