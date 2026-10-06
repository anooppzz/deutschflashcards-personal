import { describe, it, expect } from "vitest";
import { recordAnswer, sortedEntries, grammarMistakeId, isGrammarMistakeId, parseGrammarMistakeId } from "./mistakes";

describe("recordAnswer", () => {
  it("adds a wrong answer and counts repeats", () => {
    let b = recordAnswer({}, "a::x", false, "2026-10-01");
    expect(b["a::x"]).toEqual({ wrong: 1, rightDays: [], last: "2026-10-01" });
    b = recordAnswer(b, "a::x", false, "2026-10-02");
    expect(b["a::x"].wrong).toBe(2);
  });

  it("ignores right answers for words not in the book", () => {
    const b = {};
    expect(recordAnswer(b, "a::x", true, "2026-10-01")).toBe(b);
  });

  it("clears an entry after right answers on two different days", () => {
    let b = recordAnswer({}, "a::x", false, "2026-10-01");
    b = recordAnswer(b, "a::x", true, "2026-10-01");
    const sameDay = recordAnswer(b, "a::x", true, "2026-10-01");
    expect(sameDay).toBe(b);
    expect(b["a::x"].rightDays).toEqual(["2026-10-01"]);
    b = recordAnswer(b, "a::x", true, "2026-10-03");
    expect(b["a::x"]).toBeUndefined();
  });

  it("a new mistake starts the count again", () => {
    let b = recordAnswer({}, "a::x", false, "2026-10-01");
    b = recordAnswer(b, "a::x", true, "2026-10-02");
    b = recordAnswer(b, "a::x", false, "2026-10-03");
    expect(b["a::x"]).toEqual({ wrong: 2, rightDays: [], last: "2026-10-03" });
  });
});

describe("helpers", () => {
  it("sorts by mistakes, then most recent", () => {
    const b = {
      a: { wrong: 1, rightDays: [], last: "2026-10-05" },
      b: { wrong: 3, rightDays: [], last: "2026-10-01" },
      c: { wrong: 1, rightDays: [], last: "2026-10-06" },
    };
    expect(sortedEntries(b).map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("round-trips grammar question ids, even with :: in the question", () => {
    const id = grammarMistakeId("perfekt", "Ich ___ gegangen. A::B");
    expect(isGrammarMistakeId(id)).toBe(true);
    expect(isGrammarMistakeId("kleidung::die Bluse")).toBe(false);
    expect(parseGrammarMistakeId(id)).toEqual({ topic: "perfekt", q: "Ich ___ gegangen. A::B" });
  });
});
