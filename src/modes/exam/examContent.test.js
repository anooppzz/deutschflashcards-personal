import { describe, it, expect } from "vitest";
import SETS from "../../data/exam/dtz-sets.json";
import { itemsOf, itemsOfPart, choicesFor, scoreItems, levelFor, formatClock } from "./dtz";

describe.each(SETS.map((s) => [s.key, s]))("DTZ set %s", (_key, set) => {
  const all = [...itemsOfPart(set, "hoeren"), ...itemsOfPart(set, "lesen")];

  it("numbers items 1–45: Hören 4+5+8+3, Lesen 5+5+6+3+6", () => {
    expect(all.map((i) => i.n)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
    expect(set.hoeren.map((t) => itemsOf(t).length)).toEqual([4, 5, 8, 3]);
    expect(set.lesen.map((t) => itemsOf(t).length)).toEqual([5, 5, 6, 3, 6]);
  });

  it("every answer is one of its choices and every item has a reason", () => {
    const bad = [];
    for (const part of ["hoeren", "lesen"]) {
      for (const teil of set[part]) {
        for (const item of itemsOf(teil)) {
          if (!choicesFor(teil, item).some((c) => c.key === item.answer)) bad.push(`${item.n}: answer ${item.answer}`);
          if (!item.why) bad.push(`${item.n}: no why`);
          if (item.type === "mc" && Object.keys(item.options).join("") !== "abc") bad.push(`${item.n}: options a–c`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("Hören: every group has audio; Teil 3 pairs richtig/falsch with a/b/c; Teil 4 has six sentences", () => {
    for (const teil of set.hoeren) for (const g of teil.groups) expect(g.audio && g.audio.length).toBeTruthy();
    for (const g of set.hoeren[2].groups) expect(g.items.map((i) => i.type)).toEqual(["rf", "mc"]);
    expect(Object.keys(set.hoeren[3].sentences)).toEqual(["a", "b", "c", "d", "e", "f"]);
    const t4 = itemsOf(set.hoeren[3]).map((i) => i.answer);
    expect(new Set(t4).size).toBe(t4.length);
  });

  it("Lesen Teil 2: eight adverts, exactly one X, the other answers all different", () => {
    const t2 = set.lesen[1];
    expect(t2.ads.map((a) => a.id)).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
    const answers = itemsOf(t2).map((i) => i.answer);
    expect(answers.filter((a) => a === "x")).toHaveLength(1);
    const others = answers.filter((a) => a !== "x");
    expect(new Set(others).size).toBe(others.length);
  });

  it("Lesen Teil 1 offers 'anderes Stockwerk' as c; Teil 5 has a gap marker for each item", () => {
    for (const item of itemsOf(set.lesen[0])) expect(item.options.c).toBe("anderes Stockwerk");
    const body = set.lesen[4].document.body;
    for (const item of itemsOf(set.lesen[4])) expect(body).toContain(`(${item.n})`);
  });
});

describe("scoring", () => {
  it("counts right answers and gives the DTZ level", () => {
    const items = [{ n: 1, answer: "a" }, { n: 2, answer: "richtig" }];
    expect(scoreItems(items, { 1: "a", 2: "falsch" })).toEqual({ right: 1, total: 2 });
    expect(levelFor(19)).toBe("unter A2");
    expect(levelFor(20)).toBe("A2");
    expect(levelFor(33)).toBe("B1");
    expect(formatClock(1500)).toBe("25:00");
    expect(formatClock(59.2)).toBe("1:00");
  });
});
