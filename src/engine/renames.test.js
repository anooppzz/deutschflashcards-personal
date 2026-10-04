import { describe, it, expect } from "vitest";
import { applyRenames } from "./renames";

describe("applyRenames", () => {
  const e = (n) => ({ stability: n, due: n });
  it("moves progress from an old id to the new one", () => {
    const { progress, changed } = applyRenames({ "a::old": e(5), "a::other": e(1) }, { "a::old": "b::new" });
    expect(progress).toEqual({ "b::new": e(5), "a::other": e(1) });
    expect(changed).toBe(true);
  });
  it("keeps the new card's own progress if it already has some", () => {
    const { progress } = applyRenames({ "a::old": e(5), "b::new": e(9) }, { "a::old": "b::new" });
    expect(progress).toEqual({ "b::new": e(9) });
  });
  it("does nothing when no renamed card has progress, or for removed cards (null)", () => {
    expect(applyRenames({ "x::y": e(1) }, { "a::old": "b::new" }).changed).toBe(false);
    expect(applyRenames({ "a::gone": e(1) }, { "a::gone": null })).toEqual({ progress: { "a::gone": e(1) }, changed: false });
  });
});
