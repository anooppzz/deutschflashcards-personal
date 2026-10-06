import { describe, it, expect } from "vitest";
import CONTENT from "../../data/exam/dtz-sprechen.json";
import {
  SPEAK_CRITERIA, SPEAK_STEPS, speakingPoints, speakingLevel, sample,
  teil1Turns, teil2Turns, teil3Turns, simulationTurns, speakingReviewPrompt,
} from "./speaking";

const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const both = (x) => { expect(x.de, JSON.stringify(x)).toBeTruthy(); expect(x.en, JSON.stringify(x)).toBeTruthy(); };

describe("Sprechen content (dtz-sprechen.json)", () => {
  it("Teil 1: the official keywords, a model, phrases and questions with model answers", () => {
    expect(CONTENT.teil1.keywords).toEqual(["Name", "Geburtsort", "Wohnort", "Arbeit/Beruf", "Familie", "Sprachen"]);
    expect(CONTENT.teil1.model.length).toBeGreaterThanOrEqual(6);
    [...CONTENT.teil1.model, ...CONTENT.teil1.phrases].forEach(both);
    expect(CONTENT.teil1.questions.length).toBeGreaterThanOrEqual(10);
    CONTENT.teil1.questions.forEach((q) => { both(q.q); both(q.model); expect(q.q.de.endsWith("?")).toBe(true); });
  });

  it("Teil 2: topics with a photo, 3 A2 + 3 B1 questions and a model description", () => {
    expect(CONTENT.teil2.topics.length).toBeGreaterThanOrEqual(6);
    const keys = CONTENT.teil2.topics.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    CONTENT.teil2.topics.forEach((t) => {
      both(t.photo);
      expect(t.a2).toHaveLength(3);
      expect(t.b1).toHaveLength(3);
      [...t.a2, ...t.b1].forEach((q) => { both(q); expect(q.de.trim().endsWith("?") || q.de.trim().endsWith(".")).toBe(true); });
      expect(t.model.length).toBeGreaterThanOrEqual(4);
      t.model.forEach(both);
    });
    CONTENT.teil2.phrases.forEach(both);
  });

  it("Teil 3: planning tasks with notes and an A/B dialogue that starts with A and ends with B", () => {
    expect(CONTENT.teil3.tasks.length).toBeGreaterThanOrEqual(5);
    CONTENT.teil3.tasks.forEach((t) => {
      both(t.situation);
      expect(t.notes.length).toBeGreaterThanOrEqual(4);
      expect(t.notes.at(-1)).toBe("…?");
      expect(t.dialogue.length).toBeGreaterThanOrEqual(8);
      t.dialogue.forEach((l, i) => { expect(l.who).toBe(i % 2 === 0 ? "A" : "B"); both(l); });
      expect(t.dialogue.at(-1).who).toBe("B");
    });
    CONTENT.teil3.phrases.forEach(both);
  });
});

describe("turns", () => {
  it("Teil 1: introduction, then different questions", () => {
    const turns = teil1Turns(CONTENT, { questions: 3, rng: seeded(1) });
    expect(turns.map((t) => t.teil)).toEqual(["1A", "1B", "1B", "1B"]);
    expect(new Set(turns.map((t) => t.say)).size).toBe(4);
    expect(turns[0].info.items).toContain("Familie");
    turns.slice(1).forEach((t) => expect(t.model).toHaveLength(1));
  });

  it("Teil 2: photo, then A2 questions before B1, the first with the official lead-in", () => {
    const topic = CONTENT.teil2.topics[0];
    const turns = teil2Turns(CONTENT, topic, { a2: 2, b1: 1, rng: seeded(2) });
    expect(turns.map((t) => t.teil)).toEqual(["2A", "2B", "2B", "2B"]);
    expect(turns[0].info).toMatchObject({ kind: "photo", de: topic.photo.de });
    expect(turns[1].say.startsWith(CONTENT.teil2.sayB)).toBe(true);
    expect(turns.slice(1).map((t) => t.level)).toEqual(["A2", "A2", "B1"]);
  });

  it("Teil 3: the learner says the A lines after the partner's B lines", () => {
    const task = CONTENT.teil3.tasks[0];
    const turns = teil3Turns(CONTENT, task);
    const aLines = task.dialogue.filter((l) => l.who === "A");
    expect(turns.filter((t) => t.record)).toHaveLength(aLines.length);
    expect(turns[0].who).toBe("examiner");
    expect(turns[1]).toMatchObject({ who: "partner", say: task.dialogue[1].de, model: [{ de: task.dialogue[2].de }] });
    expect(turns.at(-1)).toMatchObject({ id: "3-end", record: false, say: task.dialogue.at(-1).de });
  });

  it("the simulation runs Teil 1 → 2 → 3 with unique ids", () => {
    const turns = simulationTurns(CONTENT, seeded(3));
    const order = turns.map((t) => t.teil);
    expect(order.slice(0, 7)).toEqual(["1A", "1B", "1B", "2A", "2B", "2B", "2B"]);
    expect(order.slice(7).every((t) => t === "3")).toBe(true);
    expect(new Set(turns.map((t) => t.id)).size).toBe(turns.length);
  });

  it("sample picks distinct items", () => {
    expect(new Set(sample([1, 2, 3, 4, 5], 3, seeded(9))).size).toBe(3);
    expect(sample([1, 2], 5)).toHaveLength(2);
  });
});

describe("scoring", () => {
  it("adds up to 100 with the official weights and thresholds", () => {
    expect(SPEAK_CRITERIA.reduce((s, c) => s + c.weight * 5, 0)).toBe(100);
    const all = (step) => Object.fromEntries(SPEAK_CRITERIA.map((c) => [c.key, step]));
    expect(speakingPoints(all(5))).toBe(100);
    expect(speakingPoints(all(4))).toBe(80);
    expect(speakingPoints(all(3))).toBe(60);
    expect(speakingPoints(all(2))).toBe(40);
    expect(speakingPoints({})).toBe(0);
    expect(speakingLevel(34)).toBe("unter A2");
    expect(speakingLevel(35)).toBe("A2");
    expect(speakingLevel(75)).toBe("B1");
    expect(SPEAK_STEPS.map((s) => s.step)).toEqual([5, 4, 3, 2, 1, 0]);
  });

  it("asks the AI only about answered turns", () => {
    const turns = teil1Turns(CONTENT, { questions: 2, rng: seeded(4) });
    const p = speakingReviewPrompt(turns, { "1A": "ich heiße ana ich komme aus brasilien", "1B-1": "   " });
    expect(p).toContain("Me: ich heiße ana ich komme aus brasilien");
    expect(p).toContain(turns[0].say);
    expect(p).not.toContain(turns[2].say);
    expect(p).toContain("speech recognition");
  });
});
