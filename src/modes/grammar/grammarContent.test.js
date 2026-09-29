import { describe, it, expect } from "vitest";
import { localize, parseHighlights } from "./richText";
import GRAMMAR_TOPICS from "../../data/grammar/topics.json";

describe("parseHighlights", () => {
  it("splits **marked** parts out", () => {
    expect(parseHighlights("wohn**st**")).toEqual([{ text: "wohn", hl: false }, { text: "st", hl: true }]);
    expect(parseHighlights("gr**ö**ß**er**")).toEqual([
      { text: "gr", hl: false }, { text: "ö", hl: true }, { text: "ß", hl: false }, { text: "er", hl: true },
    ]);
  });

  it("leaves text without markup alone", () => {
    expect(parseHighlights("die Zeitung")).toEqual([{ text: "die Zeitung", hl: false }]);
    expect(parseHighlights("")).toEqual([]);
  });
});

describe("localize", () => {
  it("returns plain strings as they are", () => {
    expect(localize("wohnen", "en")).toBe("wohnen");
  });
  it("picks the language, falling back to en then de", () => {
    const t = { de: "Endung", en: "Ending" };
    expect(localize(t, "de")).toBe("Endung");
    expect(localize(t, "uk")).toBe("Ending");
    expect(localize({ de: "nur deutsch" }, "en")).toBe("nur deutsch");
  });
});

// Every piece of text in a topic, with a label saying where it is.
const textsOf = (topic) => {
  const out = [["title", topic.title], ["summary", topic.summary]];
  topic.sections.forEach((s, i) => {
    const at = `sections[${i}] (${s.type})`;
    if (s.title) out.push([`${at}.title`, s.title]);
    if (s.type === "table") {
      s.head.forEach((h, c) => out.push([`${at}.head[${c}]`, h]));
      s.rows.forEach((row, r) => row.forEach((cell, c) => out.push([`${at}.rows[${r}][${c}]`, cell])));
    }
    if (s.type === "points") s.items.forEach((item, j) => out.push([`${at}.items[${j}]`, item]));
    if (s.type === "warning") out.push([`${at}.text`, s.text]);
  });
  return out;
};

describe("grammar topic groups", () => {
  it("every topic has a group in German and English", () => {
    const bad = GRAMMAR_TOPICS.filter((t) => !(t.group && t.group.de && t.group.en)).map((t) => t.key);
    expect(bad).toEqual([]);
  });

  it("each group's topics sit together (headings show where the group changes)", () => {
    const order = GRAMMAR_TOPICS.map((t) => t.group.de).filter((g, i, all) => i === 0 || g !== all[i - 1]);
    expect(order).toEqual([...new Set(order)]);
  });

  it("topic keys are unique", () => {
    const keys = GRAMMAR_TOPICS.map((t) => t.key);
    expect(keys).toEqual([...new Set(keys)]);
  });
});

describe("grammar topics data", () => {
  it.each(GRAMMAR_TOPICS.map((t) => [t.key, t]))("%s is structured", (key, topic) => {
    expect(topic.summary).toBeTruthy();
    expect(Array.isArray(topic.sections) && topic.sections.length).toBeTruthy();
    for (const s of topic.sections) {
      expect(["table", "points", "warning"]).toContain(s.type);
      if (s.type === "table") {
        expect(s.rows.length).toBeGreaterThan(0);
        for (const row of s.rows) expect(row).toHaveLength(s.head.length);
      }
      if (s.type === "points") expect(s.items.length).toBeGreaterThan(0);
    }
  });

  it.each(GRAMMAR_TOPICS.map((t) => [t.key, t]))("%s has German and English for every text, and balanced **", (key, topic) => {
    const problems = [];
    for (const [where, text] of textsOf(topic)) {
      const variants = typeof text === "string" ? [text] : [text.de, text.en];
      if (typeof text !== "string" && !(text.de && text.en)) problems.push(`${where}: missing de or en`);
      for (const v of variants) {
        if (typeof v === "string" && (v.split("**").length - 1) % 2 !== 0) problems.push(`${where}: unbalanced ** in "${v}"`);
      }
    }
    expect(problems).toEqual([]);
  });
});
