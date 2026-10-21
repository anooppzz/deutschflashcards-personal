import { describe, it, expect } from "vitest";
import { conjugate, buildPatternIndex, sameAs, formText, needsE } from "./conjugate";
import { VERB_FORMS } from "../data";

// the forms of one tense, as plain text: ["lese", "liest", …]
const tense = (front, forms, key) => {
  const c = conjugate(front, forms);
  const t = c.tenses.find((x) => x.key === key);
  return t ? t.rows.map((r) => formText(r.segs)) : null;
};
const F = (praes, praet, perf) => ({ praes, praet, perf });
const LESEN = F("liest", "las", "hat gelesen");

describe("conjugate", () => {
  it("lesen: every A2 tense", () => {
    expect(tense("lesen", LESEN, "praesens")).toEqual(["lese", "liest", "liest", "lesen", "lest", "lesen"]);
    expect(tense("lesen", LESEN, "praeteritum")).toEqual(["las", "lasest", "las", "lasen", "last", "lasen"]);
    expect(tense("lesen", LESEN, "perfekt")).toEqual(["habe gelesen", "hast gelesen", "hat gelesen", "haben gelesen", "habt gelesen", "haben gelesen"]);
    expect(tense("lesen", LESEN, "imperativ")).toEqual(["lies!", "lest!", "lesen Sie!"]);
    expect(tense("lesen", LESEN, "konj2")[0]).toBe("würde lesen");
    expect(tense("lesen", LESEN, "futur1")[1]).toBe("wirst lesen");
    expect(tense("lesen", LESEN, "konj2praet")).toEqual(["läse", "läsest", "läse", "läsen", "läset", "läsen"]);
    expect(tense("lesen", LESEN, "konj1")).toEqual(["lese", "lesest", "lese", "lesen", "leset", "lesen"]);
    expect(tense("lesen", LESEN, "futur2")[2]).toBe("wird gelesen haben");
  });

  it("A2 tenses come first", () => {
    const levels = conjugate("lesen", LESEN).tenses.map((t) => t.level);
    expect(levels.indexOf("B1")).toBeGreaterThan(levels.lastIndexOf("A2"));
  });

  it("present tense: stem changes, -e-, hissing stems", () => {
    expect(tense("fahren", F("fährt", "fuhr", "ist gefahren"), "praesens")).toEqual(["fahre", "fährst", "fährt", "fahren", "fahrt", "fahren"]);
    expect(tense("halten", F("hält", "hielt", "hat gehalten"), "praesens")).toEqual(["halte", "hältst", "hält", "halten", "haltet", "halten"]);
    expect(tense("laden", F("lädt", "lud", "hat geladen"), "praesens")).toEqual(["lade", "lädst", "lädt", "laden", "ladet", "laden"]);
    expect(tense("arbeiten", F("arbeitet", "arbeitete", "hat gearbeitet"), "praesens")).toEqual(["arbeite", "arbeitest", "arbeitet", "arbeiten", "arbeitet", "arbeiten"]);
    expect(tense("öffnen", F("öffnet", "öffnete", "hat geöffnet"), "praesens")[1]).toBe("öffnest");
    expect(tense("tanzen", F("tanzt", "tanzte", "hat getanzt"), "praesens")[1]).toBe("tanzt");
    expect(tense("essen", F("isst", "aß", "hat gegessen"), "praesens")[1]).toBe("isst");
    expect(tense("waschen", F("wäscht", "wusch", "hat gewaschen"), "praesens")[1]).toBe("wäschst");
    expect(tense("wechseln", F("wechselt", "wechselte", "hat gewechselt"), "praesens")).toEqual(["wechsle", "wechselst", "wechselt", "wechseln", "wechselt", "wechseln"]);
    expect(tense("wandern", F("wandert", "wanderte", "ist gewandert"), "praesens")[0]).toBe("wandere");
    expect(tense("kommen", F("kommt", "kam", "ist gekommen"), "praesens")[4]).toBe("kommt");
    expect(tense("wohnen in", F("wohnt in", "wohnte in", "hat gewohnt"), "praesens")[4]).toBe("wohnt in …");
  });

  it("special verbs have their own tables", () => {
    expect(tense("sein", F("ist", "war", "ist gewesen"), "praesens")).toEqual(["bin", "bist", "ist", "sind", "seid", "sind"]);
    expect(tense("sein", F("ist", "war", "ist gewesen"), "konj2")).toEqual(["wäre", "wärst", "wäre", "wären", "wärt", "wären"]);
    expect(tense("sein", F("ist", "war", "ist gewesen"), "imperativ")).toEqual(["sei!", "seid!", "seien Sie!"]);
    expect(tense("können", F("kann", "konnte", "hat gekonnt"), "praesens")).toEqual(["kann", "kannst", "kann", "können", "könnt", "können"]);
    expect(tense("können", F("kann", "konnte", "hat gekonnt"), "konj2")).toEqual(["könnte", "könntest", "könnte", "könnten", "könntet", "könnten"]);
    expect(tense("können", F("kann", "konnte", "hat gekonnt"), "imperativ")).toBeNull();
    expect(tense("werden", F("wird", "wurde", "ist geworden"), "praeteritum")).toEqual(["wurde", "wurdest", "wurde", "wurden", "wurdet", "wurden"]);
    expect(tense("wissen", F("weiß", "wusste", "hat gewusst"), "praesens")[1]).toBe("weißt");
    expect(tense("haben", F("hat", "hatte", "hat gehabt"), "konj2")[0]).toBe("hätte");
    expect(tense("möchten", F("möchte", "wollte"), "perfekt")).toBeNull();
  });

  it("separable, reflexive and phrase verbs keep their words", () => {
    const abfahren = F("fährt ab", "fuhr ab", "ist abgefahren");
    expect(tense("abfahren", abfahren, "praesens")[1]).toBe("fährst ab");
    expect(tense("abfahren", abfahren, "perfekt")[0]).toBe("bin abgefahren");
    expect(tense("abfahren", abfahren, "futur1")[0]).toBe("werde abfahren");
    expect(tense("abfahren", abfahren, "imperativ")).toEqual(["fahr ab!", "fahrt ab!", "fahren Sie ab!"]);
    const einleben = F("lebt sich ein", "lebte sich ein", "hat sich eingelebt");
    expect(tense("ein·leben (sich)", einleben, "praesens")).toEqual(["lebe mich ein", "lebst dich ein", "lebt sich ein", "leben uns ein", "lebt euch ein", "leben sich ein"]);
    expect(tense("ein·leben (sich)", einleben, "perfekt")[1]).toBe("hast dich eingelebt");
    expect(tense("ein·leben (sich)", einleben, "futur1")[3]).toBe("werden uns einleben");
    expect(tense("ein·leben (sich)", einleben, "imperativ")[0]).toBe("leb dich ein!");
    expect(tense("merken (sich)", F("merkt sich", "merkte sich", "hat sich gemerkt"), "praesens")[0]).toBe("merke mir");
    expect(tense("Musik hören", F("hört Musik", "hörte Musik", "hat Musik gehört"), "praesens")[0]).toBe("höre Musik");
    expect(tense("Musik hören", F("hört Musik", "hörte Musik", "hat Musik gehört"), "futur1")[0]).toBe("werde Musik hören");
    expect(tense("stehen bleiben", F("bleibt stehen", "blieb stehen", "ist stehen geblieben"), "perfekt")[0]).toBe("bin stehen geblieben");
    expect(tense("kennenlernen", F("lernt kennen", "lernte kennen", "hat kennengelernt"), "futur1")[0]).toBe("werde kennenlernen");
    expect(tense("dafür sein", F("ist dafür", "war dafür", "ist dafür gewesen"), "praesens")[0]).toBe("bin dafür");
  });

  it("imperative: e → i, -e after t/d", () => {
    expect(tense("nehmen", F("nimmt", "nahm", "hat genommen"), "imperativ")[0]).toBe("nimm!");
    expect(tense("essen", F("isst", "aß", "hat gegessen"), "imperativ")[0]).toBe("iss!");
    expect(tense("treten", F("tritt", "trat", "hat getreten"), "imperativ")[0]).toBe("tritt!");
    expect(tense("warten", F("wartet", "wartete", "hat gewartet"), "imperativ")[0]).toBe("warte!");
    expect(tense("freuen (sich)", F("freut sich", "freute sich", "hat sich gefreut"), "imperativ")).toEqual(["freu dich!", "freut euch!", "freuen Sie sich!"]);
  });

  it("Präteritum and Konjunktiv II: weak, mixed, strong", () => {
    expect(tense("machen", F("macht", "machte", "hat gemacht"), "praeteritum")).toEqual(["machte", "machtest", "machte", "machten", "machtet", "machten"]);
    expect(tense("bringen", F("bringt", "brachte", "hat gebracht"), "konj2praet")[0]).toBe("brächte");
    expect(tense("kennen", F("kennt", "kannte", "hat gekannt"), "konj2praet")[0]).toBe("kennte");
    expect(tense("finden", F("findet", "fand", "hat gefunden"), "praeteritum")[1]).toBe("fandest");
    expect(tense("stehen", F("steht", "stand", "hat gestanden"), "konj2praet")[0]).toBe("stünde");
    expect(tense("gehen", F("geht", "ging", "ist gegangen"), "konj2plusq")[0]).toBe("wäre gegangen");
  });

  it("alternatives: the modern spelling, the others in a note", () => {
    const c = conjugate("backen", F("bäckt/backt", "buk/backte", "hat gebacken"));
    expect(formText(c.tenses[0].rows[2].segs)).toBe("backt");
    expect(c.notes.join(" ")).toContain("bäckt");
    const s = conjugate("sitzen", F("sitzt", "saß", "hat/ist gesessen"));
    expect(formText(s.tenses.find((t) => t.key === "perfekt").rows[0].segs)).toBe("habe gesessen");
    expect(s.notes.join(" ")).toContain("ist gesessen");
  });

  it("marks the irregular stem and the endings", () => {
    const row = conjugate("lesen", LESEN).tenses[0].rows[1].segs;
    expect(row).toEqual([{ t: "lies", k: "irr" }, { t: "t", k: "end" }]);
    expect(conjugate("machen", F("macht", "machte", "hat gemacht")).regular).toBe(true);
    expect(conjugate("lesen", LESEN).keyForms).toEqual(["er liest", "las", "gelesen"]);
  });

  it("needsE", () => {
    expect(["arbeit", "find", "öffn", "rechn", "atm", "trockn"].every(needsE)).toBe(true);
    expect(["komm", "wohn", "lern", "kenn", "mach"].some(needsE)).toBe(false);
  });
});

describe("every verb in the app", () => {
  it("conjugates (all but none)", () => {
    const failed = [...VERB_FORMS].filter(([id, f]) => !conjugate(id.split("::")[1], f)).map(([id]) => id);
    expect(failed).toEqual([]);
  });
  it("no form has a double space, undefined or a doubled ending", () => {
    for (const [id, f] of VERB_FORMS) {
      const c = conjugate(id.split("::")[1], f);
      for (const t of c.tenses) for (const r of t.rows) {
        const s = formText(r.segs);
        expect(s, `${id} ${t.key}`).not.toMatch(/ {2}|undefined|null|stst\b|eest\b/);
      }
    }
  });
});

describe("Geht wie …", () => {
  const index = buildPatternIndex(VERB_FORMS);
  it("lesen goes like sehen; fahren like tragen, simple verbs first", () => {
    expect(sameAs(index, "irregular::lesen", "lesen").list.map((x) => x.verb)).toContain("sehen");
    const fahren = sameAs(index, "irregular::fahren", "fahren").list.map((x) => x.verb);
    expect(fahren).toContain("tragen");
    expect(fahren.indexOf("tragen")).toBeLessThan(Math.max(0, fahren.indexOf("abfahren")) || 99);
  });
  it("modal verbs go together, the verb itself is left out", () => {
    const m = sameAs(index, "freizeit::können", "können").list.map((x) => x.verb);
    expect(m).toContain("müssen");
    expect(m).not.toContain("können");
  });
});

describe("fixes found in the app's verbs", () => {
  it("spielen is no -eln verb; entschuldige!; a preposition keeps its …", () => {
    expect(tense("Gitarre spielen", F("spielt Gitarre", "spielte Gitarre", "hat Gitarre gespielt"), "praesens")[0]).toBe("spiele Gitarre");
    expect(tense("entschuldigen", F("entschuldigt", "entschuldigte", "hat entschuldigt"), "imperativ")[0]).toBe("entschuldige!");
    expect(tense("liegen in", F("liegt in", "lag in", "hat gelegen"), "futur1")[0]).toBe("werde in … liegen");
    expect(tense("küssen (sich)", F("küsst", "küsste", "hat sich geküsst"), "perfekt")[0]).toBe("habe geküsst");
  });
  it("möchten: Präsens and Präteritum only", () => {
    expect(conjugate("möchten", F("möchte", "wollte")).tenses.map((t) => t.key)).toEqual(["praesens", "praeteritum"]);
  });
});
