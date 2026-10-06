import { describe, it, expect } from "vitest";
import DTZ_WRITING from "../../data/exam/dtz-schreiben.json";
import { writingChecks, wordCount, writingLevel, modelText, writingReviewPrompt, suggestTaskPoints, CRITERIA, POINT_STEPS } from "./writing";

const tasks = DTZ_WRITING.flatMap((p) => [p.a, p.b]);
const failing = (text, register) => writingChecks(text, register).filter((c) => c.ok === false).map((c) => c.key);

describe("Schreiben tasks (dtz-schreiben.json)", () => {
  it("come in pairs A/B with unique keys", () => {
    expect(DTZ_WRITING.length).toBeGreaterThanOrEqual(4);
    const keys = tasks.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    DTZ_WRITING.forEach((p) => { expect(p.a && p.b).toBeTruthy(); expect(p.title).toBeTruthy(); });
  });

  it.each(tasks.map((t) => [t.key, t]))("%s follows the format", (key, t) => {
    expect(["formal", "informal"]).toContain(t.register);
    expect(["E-Mail", "Brief"]).toContain(t.kind);
    for (const f of ["title", "situation", "situationEn", "instruction", "instructionEn"]) expect(t[f], f).toBeTruthy();
    expect(t.points).toHaveLength(4);
    t.points.forEach((p) => { expect(p.de).toBeTruthy(); expect(p.en).toBeTruthy(); });
    expect(t.model.parts).toHaveLength(4);
    expect(t.model.partsEn).toHaveLength(4);
    expect(t.phrases.length).toBeGreaterThanOrEqual(4);
    // the model answer passes its own checklist and has a realistic length
    expect(failing(modelText(t), t.register)).toEqual([]);
    const n = wordCount(modelText(t));
    expect(n).toBeGreaterThanOrEqual(70);
    expect(n).toBeLessThanOrEqual(140);
    // after "Anrede," the text goes on in lower case
    expect(t.model.parts[0][0]).toBe(t.model.parts[0][0].toLowerCase());
  });
});

describe("writing checklist", () => {
  it("finds a missing greeting and sign-off", () => {
    expect(failing("Ich kann nicht kommen.", "formal")).toEqual(expect.arrayContaining(["anrede", "gruss"]));
  });
  it("wants Sie in a formal text and the right ending on geehrte/r", () => {
    const text = "Sehr geehrte Herr Becker,\nkannst du mir helfen? Dein Kollege …\nMit freundlichen Grüßen\nAli";
    expect(failing(text, "formal")).toEqual(expect.arrayContaining(["geehrter", "sie"]));
    expect(failing("Sehr geehrter Frau Wagner,\n…\nViele Grüße", "formal")).toContain("geehrte");
  });
  it("wants a personal greeting in an informal text and a comma", () => {
    expect(failing("Sehr geehrte Frau Weber,\n…\nLiebe Grüße", "informal")).toContain("anrede");
    expect(failing("Lieber Tom\nwie geht's?\nViele Grüße", "informal")).toContain("komma");
    expect(failing("Lieber Tom,\nwie geht's?\nViele Grüße\nSamir", "informal")).toEqual([]);
  });
  it("counts words and linking words", () => {
    expect(wordCount("Ich heiße Ana-Maria, ich wohne in der Goethestraße 5.")).toBe(9);
    const c = writingChecks("Liebe Ana,\nich komme nicht, weil ich krank bin, deshalb …\nViele Grüße", "informal").find((x) => x.key === "connectors");
    expect(c.ok).toBe(true);
    expect(c.de).toContain("weil");
  });
});

describe("rating", () => {
  it("uses the official thresholds", () => {
    expect(writingLevel(6)).toBe("unter A2");
    expect(writingLevel(7)).toBe("A2");
    expect(writingLevel(14)).toBe("A2");
    expect(writingLevel(15)).toBe("B1");
    expect(CRITERIA).toHaveLength(4);
    expect(POINT_STEPS.map((s) => s.points)).toEqual([5, 4, 3, 2, 1, 0]);
    expect(suggestTaskPoints(4)).toBe(4);
    expect(suggestTaskPoints(0)).toBe(0);
  });
  it("builds an AI prompt with task, points and text", () => {
    const t = tasks[0];
    const p = writingReviewPrompt(t, "  Liebe Sabine, …  ");
    expect(p).toContain(t.situation);
    t.points.forEach((pt) => expect(p).toContain(pt.de));
    expect(p).toContain('"""\nLiebe Sabine, …\n"""');
    expect(p).toContain("B1 from 15");
  });
});
