import { describe, it, expect } from "vitest";
import { ALL_CARDS, VERB_FORMS } from "./index";
import { idOf } from "../engine";
import { verbFormOf, buildFormsPool } from "../modes/forms/buildForms";

// every verb shows er/sie/es, Präteritum and Perfekt on the back of its card
describe("verb forms", () => {
  const verbs = ALL_CARDS.filter((c) => c.type === "v");

  it("every verb card has its er/sie/es form and Präteritum (new verb? add \"forms\")", () => {
    const missing = verbs.filter((c) => {
      const f = VERB_FORMS.get(idOf(c.deck, c.front));
      return !f || !f.praes || !f.praet;
    }).map((c) => idOf(c.deck, c.front));
    expect(missing).toEqual([]);
  });

  it("every verb card has its Perfekt (möchten has none)", () => {
    const missing = verbs.filter((c) => !VERB_FORMS.get(idOf(c.deck, c.front))?.perf).map((c) => idOf(c.deck, c.front));
    expect(missing).toEqual(["essen::möchten"]);
  });

  it("takes the book's table first, else the card's forms and its sub line", () => {
    expect(VERB_FORMS.get("reisen::abfahren")).toEqual({ praes: "fährt ab", praet: "fuhr ab", perf: "ist abgefahren" });
    expect(VERB_FORMS.get("freizeit::Musik hören")).toEqual({ praes: "hört Musik", praet: "hörte Musik", perf: "hat Musik gehört" });
    expect(VERB_FORMS.get("hotel::absagen").perf).toBe("hat abgesagt");
    expect(VERB_FORMS.get("natur-tourismus::liegen in").perf).toBe("hat gelegen");
    expect(VERB_FORMS.get("freizeit::können")).toEqual({ praes: "kann", praet: "konnte", perf: "hat gekonnt" });
    expect(VERB_FORMS.get("irregular::schieben")).toEqual({ praes: "schiebt", praet: "schob", perf: "hat geschoben" });
  });
});

describe("Formen: Präsens and Präteritum", () => {
  const v = (front) => ({ type: "v", deck: "d", front });
  it("asks the er/sie/es form or the Präteritum of single verbs", () => {
    expect(verbFormOf(v("ab·fahren"), { praes: "fährt ab", praet: "fuhr ab" }, "praesens")).toEqual({ form: "fährt ab", answers: ["fährt ab"] });
    expect(verbFormOf(v("freuen (sich)"), { praes: "freut sich", praet: "freute sich" }, "praeteritum").form).toBe("freute sich");
    expect(verbFormOf(v("backen"), { praes: "bäckt/backt", praet: "buk/backte" }, "praesens").answers).toEqual(["bäckt", "backt"]);
  });
  it("leaves out phrases and verbs without the form", () => {
    expect(verbFormOf(v("Musik hören"), { praes: "hört Musik", praet: "hörte Musik" }, "praesens")).toBeNull();
    expect(verbFormOf(v("gehen"), { praet: "ging" }, "praesens")).toBeNull();
    expect(verbFormOf({ type: "n", front: "der Tisch" }, { praes: "x" }, "praesens")).toBeNull();
  });
  it("builds a pool from the forms by card id", () => {
    const pool = buildFormsPool([v("gehen")], "praeteritum", new Map([["d::gehen", { praes: "geht", praet: "ging" }]]));
    expect(pool.map((p) => p.form)).toEqual(["ging"]);
  });
});
