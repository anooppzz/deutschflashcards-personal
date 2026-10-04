import { describe, it, expect } from "vitest";
import { perfektOf, pluralOf, umlaut, buildFormsPool } from "./buildForms";
import { ALL_CARDS } from "../../data";

const v = (front, sub) => ({ type: "v", front, sub });
const n = (front, sub) => ({ type: "n", front, sub });

describe("perfektOf", () => {
  it("reads hat/ist and the participle", () => {
    expect(perfektOf(v("kaufen", "hat gekauft"))).toEqual({ aux: "hat", reflexive: false, partizip: "gekauft" });
    expect(perfektOf(v("fahren", "fuhr · ist gefahren"))).toEqual({ aux: "ist", reflexive: false, partizip: "gefahren" });
    expect(perfektOf(v("einladen", "du lädst ein, er lädt ein · hat eingeladen")).partizip).toBe("eingeladen");
    expect(perfektOf(v("freuen (sich)", "hat sich gefreut"))).toEqual({ aux: "hat", reflexive: true, partizip: "gefreut" });
    expect(perfektOf(v("liegen in", "hat gelegen · A/CH: ist gelegen")).aux).toBe("hat");
  });
  it("skips phrases and verbs without a Perfekt", () => {
    expect(perfektOf(v("Musik hören", "hat Musik gehört"))).toBeNull();
    expect(perfektOf(v("können", "konnte"))).toBeNull();
    expect(perfektOf(n("der Tisch", "hat gekauft"))).toBeNull();
  });
});

describe("pluralOf", () => {
  it("adds endings and umlauts", () => {
    expect(pluralOf(n("die Rechnung", "Pl. -en"))).toBe("Rechnungen");
    expect(pluralOf(n("der Lehrer", "Pl. -"))).toBe("Lehrer");
    expect(pluralOf(n("der Stuhl", "Pl. ¨-e"))).toBe("Stühle");
    expect(pluralOf(n("das Haus", "Pl. ¨-er"))).toBe("Häuser");
    expect(pluralOf(n("die Mutter", "Pl. ¨"))).toBe("Mütter");
    expect(pluralOf(n("die Werkstatt", "Pl. ¨-en (die Werkstätten)"))).toBe("Werkstätten");
    expect(pluralOf(n("der Krug", "Pl. ¨-e · CH: der Krug, ¨-e"))).toBe("Krüge");
    expect(pluralOf(n("die Lehrerin", "Pl. -nen"))).toBe("Lehrerinnen");
  });
  it("skips nouns without a usable plural", () => {
    expect(pluralOf(n("der Schmuck", "kein Plural"))).toBeNull();
    expect(pluralOf(n("die Leute", "nur Plural"))).toBeNull();
    expect(pluralOf(n("der Hunger", "Hunger haben"))).toBeNull();
  });
  it("umlauts the last vowel of the stem", () => {
    expect(umlaut("Briefumschlag")).toBe("Briefumschläg");
    expect(umlaut("Gasthaus")).toBe("Gasthäus");
    expect(umlaut("Arzt")).toBe("Ärzt");
    expect(umlaut("Apfel")).toBe("Äpfel");
  });
});

describe("real data", () => {
  it("finds plenty of questions of both kinds", () => {
    expect(buildFormsPool(ALL_CARDS, "perfekt").length).toBeGreaterThan(150);
    expect(buildFormsPool(ALL_CARDS, "plural").length).toBeGreaterThan(350);
  });
  it("every plural is a capitalised single word", () => {
    const bad = buildFormsPool(ALL_CARDS, "plural").filter((c) => !/^[A-ZÄÖÜ][\p{L}-]*$/u.test(c.plural)).map((c) => `${c.front}: ${c.plural}`);
    expect(bad).toEqual([]);
  });
});
