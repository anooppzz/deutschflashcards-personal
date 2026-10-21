import { describe, it, expect } from "vitest";
import { tapChip } from "./filters";

const ALL = ["n", "v", "adj", "sonst"];

describe("tapChip", () => {
  it("all on: the tapped chip alone", () => {
    expect(tapChip(ALL, "v", ALL)).toEqual(["v"]);
  });
  it("some on: adds or removes", () => {
    expect(tapChip(["v"], "n", ALL)).toEqual(["v", "n"]);
    expect(tapChip(["v", "n"], "n", ALL)).toEqual(["v"]);
  });
  it("removing the last one shows all again", () => {
    expect(tapChip(["v"], "v", ALL)).toEqual(ALL);
  });
});
