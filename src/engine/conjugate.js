// 📊 Alle Formen: a verb's whole conjugation, built from what its card
// already stores (data/index.js VERB_FORMS): the infinitive (the card's
// front), er/sie/es Präsens, Präteritum and Perfekt. Rules make the other
// persons and tenses; sein, haben, werden, wissen, tun and the modal verbs
// have their own tables. Separable verbs ("fährt ab"), reflexive verbs
// ("freut sich" → ich freue mich) and phrases ("hört Musik") keep their
// extra words. Every verb form comes as segments, so the view can colour
// the ending and the irregular stem: [{ t: "lies", k: "irr" }, { t: "t", k: "end" }].

export const PERSONS = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];
const REFL = ["mich", "dich", "sich", "uns", "euch", "sich"];
const REFL_DAT = ["mir", "dir", "sich", "uns", "euch", "sich"];
const DATIVE_REFLEXIVE = new Set(["merken"]); // sich etwas merken → ich merke mir

const AUX = {
  hat: {
    inf: "haben",
    praes: ["habe", "hast", "hat", "haben", "habt", "haben"],
    praet: ["hatte", "hattest", "hatte", "hatten", "hattet", "hatten"],
    k1: ["habe", "habest", "habe", "haben", "habet", "haben"],
    k2: ["hätte", "hättest", "hätte", "hätten", "hättet", "hätten"],
  },
  ist: {
    inf: "sein",
    praes: ["bin", "bist", "ist", "sind", "seid", "sind"],
    praet: ["war", "warst", "war", "waren", "wart", "waren"],
    k1: ["sei", "seiest", "sei", "seien", "seiet", "seien"],
    k2: ["wäre", "wärst", "wäre", "wären", "wärt", "wären"],
  },
};
const WERDEN = ["werde", "wirst", "wird", "werden", "werdet", "werden"];
const WUERDE = ["würde", "würdest", "würde", "würden", "würdet", "würden"];

// Präsens tables no rule makes
const SPECIAL_PRAES = {
  sein: AUX.ist.praes,
  haben: AUX.hat.praes,
  werden: WERDEN,
  wissen: ["weiß", "weißt", "weiß", "wissen", "wisst", "wissen"],
  tun: ["tue", "tust", "tut", "tun", "tut", "tun"],
  können: ["kann", "kannst", "kann", "können", "könnt", "können"],
  müssen: ["muss", "musst", "muss", "müssen", "müsst", "müssen"],
  dürfen: ["darf", "darfst", "darf", "dürfen", "dürft", "dürfen"],
  wollen: ["will", "willst", "will", "wollen", "wollt", "wollen"],
  sollen: ["soll", "sollst", "soll", "sollen", "sollt", "sollen"],
  mögen: ["mag", "magst", "mag", "mögen", "mögt", "mögen"],
  möchten: ["möchte", "möchtest", "möchte", "möchten", "möchtet", "möchten"],
};
export const MODALS = new Set(["können", "müssen", "dürfen", "wollen", "sollen", "mögen", "möchten"]);
// Konjunktiv II forms people really use; every other verb: würde + infinitive
const K2_OWN = {
  sein: "wäre", haben: "hätte", werden: "würde", wissen: "wüsste", können: "könnte", müssen: "müsste",
  dürfen: "dürfte", sollen: "sollte", wollen: "wollte", mögen: "möchte", möchten: "möchte",
};
// old Konjunktiv II stems that don't just take the umlaut (stünde, not stände)
const K2_STEM_FIX = [["stehen", "stand", "stünd"], ["sterben", "starb", "stürb"], ["werfen", "warf", "würf"], ["helfen", "half", "hülf"]];
// mixed verbs: Konjunktiv II with the infinitive's vowel (er kennte)
const K2_E_STEM = ["brennen", "kennen", "nennen", "rennen"];
// mixed verbs whose Konjunktiv II takes the umlaut (er brächte, er dächte)
const K2_UMLAUT_TE = ["bringen", "denken"];
const PREPS = new Set(["in", "aus", "von", "bei", "mit", "an", "auf", "für", "über", "zu", "nach", "als", "als/bei"]);
const NO_IMPERATIVE = new Set([...MODALS, "wissen", "regnen", "schneien", "geschehen"]);

const VOWELS = "aeiouäöü";
const seg = (t, k = "") => ({ t, k });
const textOf = (segs) => segs.map((s) => s.t).join("");

// the stem: lesen → les, wandern → wander, klingeln → klingel, tun → tu
const stemOf = (inf) => (/[^e]n$/.test(inf) || /e[lr]n$/.test(inf) ? inf.slice(0, -1) : inf.slice(0, -2));
// an -e- before -st/-t: du arbeitest, ihr öffnet, er rechnet
export const needsE = (stem) => {
  if (/[dt]$/.test(stem)) return true;
  const m = stem.match(/([^aeiouäöü])([mn])$/);
  if (!m || m[1] === m[2] || "lrmn".includes(m[1])) return false;
  // "wohn": h after a vowel is no consonant here; "rechn": it is
  return !(m[1] === "h" && VOWELS.includes(stem[stem.length - 3]));
};
const hissing = (s) => /[sßzx]$/.test(s);

// umlaut on the last a / o / u (au → äu): las → läs, zog → zög
const umlaut = (w) => {
  const i = Math.max(w.lastIndexOf("a"), w.lastIndexOf("o"), w.lastIndexOf("u"));
  if (i < 0) return w;
  if (w[i] === "u" && w[i - 1] === "a") return w.slice(0, i - 1) + "äu" + w.slice(i + 1);
  return w.slice(0, i) + { a: "ä", o: "ö", u: "ü" }[w[i]] + w.slice(i + 1);
};
// the stem vowel: the last vowel group (les → e, liest → ie, ging → i)
const vowelOf = (s) => {
  const m = s.match(/(au|äu|eu|ei|ie|[aeiouäöü])[^aeiouäöü]*$/);
  return m ? m[1] : "";
};

// "bäckt/backt" → backt, "gehängt/gehangen" → gehangen: the last spelling
// (the modern one, and the one that matches its Präteritum); the others
// go into the notes
const pickAlt = (word, notes, label) => {
  if (!word.includes("/")) return word;
  const alts = word.split("/");
  notes.push(`${label}: auch ${alts.slice(0, -1).join(", ")}`);
  return alts[alts.length - 1];
};

// Splits the card into its parts. front "ein·leben (sich)", praes "lebt sich
// ein" → { head: "leben", particle: "ein", rest: ["sich", "ein"] }
export const parseVerb = (front, forms) => {
  if (!front || !forms || !forms.praes || !forms.praet) return null;
  const notes = [];
  const [er0, ...rest0] = forms.praes.trim().split(/\s+/);
  const praet0 = forms.praet.trim().split(/\s+/)[0];
  const clean = front.replace(/\s*\(sich\)\s*$/, "").replace(/^sich\s+/, "");
  const words = clean.split(/\s+/).filter((w) => w !== "…");
  const candidates = words.filter((w) => /^[a-zäöüß·]+$/.test(w) && !rest0.includes(w));
  const word = candidates[candidates.length - 1];
  if (!word) return null;
  let particle = "";
  let head = word;
  if (word.includes("·")) [particle, head] = word.split("·");
  else {
    const p = rest0.find((t) => /^[a-zäöü]+$/.test(t) && word.length > t.length && word.startsWith(t));
    if (p) { particle = p; head = word.slice(p.length); }
  }
  if (!/n$/.test(head) || head.length < 3) return null;
  // "wohnt in" → "wohnt in …": a preposition needs its object
  const rest = rest0.flatMap((t, i) => (PREPS.has(t) && t !== particle && rest0[i + 1] !== "…" ? [t, "…"] : [t]));
  const reflexive = rest.includes("sich");
  const er = pickAlt(er0, notes, "er/sie/es");
  const praet = pickAlt(praet0, notes, "Präteritum");
  let perf = null;
  if (forms.perf) {
    const toks = forms.perf.trim().split(/\s+/);
    const auxAlts = toks[0].split("/");
    if (auxAlts.length > 1) notes.push(`Perfekt: auch ${auxAlts.slice(1).join(", ")} ${toks.slice(1).join(" ")}`);
    const part = pickAlt(toks[toks.length - 1], notes, "Partizip");
    const aux = auxAlts[0];
    // "küssen (sich)": küsst, but "hat sich geküsst" - follow the Präsens
    const mid = toks.slice(1, -1).filter((w) => reflexive || w !== "sich");
    if (AUX[aux]) perf = { aux, words: [...mid, part], part };
  }
  return {
    front, head, particle, er, praet, perf, notes, rest,
    reflexive,
    dative: DATIVE_REFLEXIVE.has(head),
    verb: particle + head, // the verb without its extra words: abfahren, hören
  };
};

// ---- the person forms of one verb ----

// Präsens: [ich, du, er, wir, ihr, sie] as segments, and whether the stem changes
const presentOf = (v) => {
  const { head, er } = v;
  const special = SPECIAL_PRAES[head];
  if (special) {
    return {
      changed: !["tun"].includes(head),
      forms: special.map((f, i) => (i < 3 || head === "sein" ? [seg(f, "irr")] : splitEnd(f, stemOf(head)))),
    };
  }
  const stem = stemOf(head);
  const ich = /eln$/.test(head) ? [seg(stem.slice(0, -2) + "l"), seg("e", "end")] : [seg(stem), seg("e", "end")];
  let du;
  let erSegs;
  let changed = false;
  if (er === stem + "et") {
    du = [seg(stem), seg("est", "end")];
    erSegs = [seg(stem), seg("et", "end")];
  } else if (/t$/.test(stem) && er !== stem + "t") {
    // halten: er hält, du hältst - the t belongs to the stem
    changed = true;
    du = [seg(er, "irr"), seg("st", "end")];
    erSegs = [seg(er, "irr")];
  } else {
    const base = er.endsWith("t") ? er.slice(0, -1) : er;
    changed = base !== stem;
    const k = changed ? "irr" : "";
    erSegs = er.endsWith("t") ? [seg(base, k), seg("t", "end")] : [seg(er, k)];
    du = hissing(base) ? [seg(base, k), seg("t", "end")] : [seg(base, k), seg("st", "end")];
  }
  const en = head.slice(stem.length);
  const ihr = [seg(stem), seg(needsE(stem) ? "et" : "t", "end")];
  return { changed, forms: [ich, du, erSegs, [seg(stem), seg(en, "end")], ihr, [seg(stem), seg(en, "end")]] };
};
const splitEnd = (form, stem) => (form.startsWith(stem) && form.length > stem.length
  ? [seg(stem), seg(form.slice(stem.length), "end")] : [seg(form, "irr")]);

// Präteritum: weak (machte), mixed (brachte) or strong (las)
const praetKind = (v) => {
  const stem = stemOf(v.head);
  if (v.praet === stem + "te" || v.praet === stem + "ete") return "weak";
  return v.praet.endsWith("te") ? "mixed" : "strong";
};
// six forms from an -e form (machte, hätte, würde) or a strong one (las)
const eForms = (base, k, first = "e") => [
  [seg(base, k), seg(first, "end")], [seg(base, k), seg(first + "st", "end")], [seg(base, k), seg(first, "end")],
  [seg(base, k), seg(first + "n", "end")], [seg(base, k), seg(first + "t", "end")], [seg(base, k), seg(first + "n", "end")],
];
const strongForms = (s) => {
  if (s.endsWith("e")) return eForms(s.slice(0, -1), "irr"); // wurde
  const e = /[dt]$/.test(s) || hissing(s);
  return [
    [seg(s, "irr")], [seg(s, "irr"), seg(e ? "est" : "st", "end")], [seg(s, "irr")],
    [seg(s, "irr"), seg("en", "end")], [seg(s, "irr"), seg(/[dt]$/.test(s) ? "et" : "t", "end")], [seg(s, "irr"), seg("en", "end")],
  ];
};
const preteritOf = (v) => {
  const kind = praetKind(v);
  if (kind === "strong") return strongForms(v.praet);
  const base = v.praet.slice(0, -1); // machte → macht
  const stem = stemOf(v.head);
  if (kind === "weak") return eForms(stem, "", v.praet.slice(stem.length));
  return eForms(base.slice(0, -1), "irr", "te"); // brach + te
};

// Konjunktiv II from the Präteritum (läse, käme, hätte, brächte)
const k2OldOf = (v) => {
  if (v.head === "sein") return AUX.ist.k2.map((f) => [seg(f, "irr")]);
  const kind = praetKind(v);
  const stem = stemOf(v.head);
  if (kind === "weak") return eForms(stem, "", v.praet.slice(stem.length));
  if (kind === "mixed") {
    if (K2_E_STEM.some((h) => v.head.endsWith(h))) return eForms(stem, "", "te");
    const core = v.praet.slice(0, -2);
    const own = K2_UMLAUT_TE.some((h) => v.head.endsWith(h)) || K2_OWN[v.head];
    return eForms(own ? umlaut(core) : core, "irr", "te");
  }
  const fix = K2_STEM_FIX.find(([h]) => v.head.endsWith(h));
  const base = fix ? v.praet.replace(fix[1], fix[2]) : umlaut(v.praet);
  return [
    [seg(base, "irr"), seg("e", "end")], [seg(base, "irr"), seg("est", "end")], [seg(base, "irr"), seg("e", "end")],
    [seg(base, "irr"), seg("en", "end")], [seg(base, "irr"), seg("et", "end")], [seg(base, "irr"), seg("en", "end")],
  ];
};

// Konjunktiv I (indirect speech): er lese, er habe, er sei
const k1Of = (v) => {
  if (v.head === "sein") return AUX.ist.k1.map((f) => [seg(f, "irr")]);
  const stem = stemOf(v.head);
  const en = v.head.slice(stem.length);
  return ["e", "est", "e", en, "et", en].map((e) => [seg(stem), seg(e, "end")]);
};

// ---- whole rows: the verb form + the card's other words ----

const reflexive = (v, i) => (v.dative ? REFL_DAT : REFL)[i];
// main clause: finite verb + the rest of the er form, sich → mich/dich …
const withRest = (v, i, segs) => [...segs, ...v.rest.map((w) => seg(" " + (w === "sich" ? reflexive(v, i) : w)))];
// after werde / würde: (mich) + extra words + the infinitive (einleben, Musik hören)
const infPhrase = (v, i) => [
  ...(v.reflexive ? [reflexive(v, i)] : []),
  ...v.rest.filter((w) => w !== "sich" && w !== v.particle),
  v.particle + v.head,
].join(" ");
const perfPhrase = (v, i) => v.perf.words.map((w) => (w === "sich" ? reflexive(v, i) : w)).join(" ");
const partSeg = (v) => {
  const stem = stemOf(v.head);
  const regular = v.perf.part.endsWith(stem + "t") || v.perf.part.endsWith(stem + "et");
  return regular ? "" : "irr";
};
// "habe gelesen": the auxiliary plain, the participle (and its words) bold
const compound = (v, auxForms, after) => auxForms.map((a, i) => {
  const words = after(i).split(" ");
  const last = words.pop();
  return [seg(a + " "), ...(words.length ? [seg(words.join(" ") + " ", "w")] : []), seg(last, last === v.perf.part ? partSeg(v) || "w" : "w")];
});
const helper = (forms, v, i) => [seg(forms[i] + " "), seg(infPhrase(v, i), "w")];

const imperativeOf = (v, present) => {
  if (NO_IMPERATIVE.has(v.head)) return null;
  const stem = stemOf(v.head);
  const extra = (pron) => v.rest.map((w) => " " + (w === "sich" ? pron : w)).join("");
  let du;
  if (v.head === "sein") du = [seg("sei", "irr")];
  else if (v.head === "haben") du = [seg("hab", "irr")];
  else if (v.head === "werden") du = [seg("werd"), seg("e", "end")];
  else if (v.head === "tun") du = [seg("tu")];
  else {
    // e → i(e): lesen → lies!, nehmen → nimm!, treten → tritt!
    let i = 0;
    while (i < stem.length && stem[i] === v.er[i]) i++;
    if (stem[i] === "e" && v.er[i] === "i") du = [seg(/t$/.test(stem) ? v.er : v.er.slice(0, -1), "irr")];
    else if (/eln$/.test(v.head)) du = [seg(stem.slice(0, -2) + "l"), seg("e", "end")];
    else if (needsE(stem) || /ern$/.test(v.head) || /ig$/.test(stem)) du = [seg(stem), seg("e", "end")];
    else du = [seg(stem)];
  }
  const ihr = v.head === "sein" ? [seg("seid", "irr")] : present.forms[4];
  const sie = v.head === "sein" ? [seg("seien", "irr")] : [seg(v.head)];
  return [
    { person: "du", segs: [...du, seg(extra(v.dative ? "dir" : "dich") + "!")] },
    { person: "ihr", segs: [...ihr, seg(extra("euch") + "!")] },
    { person: "Sie", segs: [...sie, seg(" Sie" + extra("sich") + "!")] },
  ];
};

const rows = (forms) => forms.map((segs, i) => ({ person: PERSONS[i], segs }));

// everything after the Präteritum: Imperativ, Konjunktiv II, Futur I (A2), then the B1 tenses
const moreTenses = (v, present, kind, add) => {
  const imp = imperativeOf(v, present);
  if (imp) add("imperativ", "A2", "Imperativ", "commands", "asking or telling someone to do something", "imperativ", imp);
  const own = K2_OWN[v.head];
  if (own) {
    const k2 = v.head === "sein" ? AUX.ist.k2.map((f) => [seg(f, "irr")]) : eForms(own.slice(0, -1), "irr");
    add("konj2", "A2", "Konjunktiv II", "would / could", "wishes, polite requests, advice", "konjunktiv-2",
      rows(k2.map((f, i) => withRest(v, i, f))), `${own}: an own form – most other verbs use würde + infinitive`);
  } else {
    add("konj2", "A2", "Konjunktiv II", "would", "wishes, polite requests, advice", "konjunktiv-2",
      rows(PERSONS.map((_, i) => helper(WUERDE, v, i))), "würde + infinitive – how almost every verb says “would”");
  }
  add("futur1", "A2", "Futur I", "future", "plans and guesses; often Präsens + time instead", null,
    rows(PERSONS.map((_, i) => helper(WERDEN, v, i))));

  if (v.perf) {
    add("plusquam", "B1", "Plusquamperfekt", "had done", "before another past event", null,
      rows(compound(v, AUX[v.perf.aux].praet, (i) => perfPhrase(v, i))));
    add("futur2", "B1", "Futur II", "will have done", "rare", null,
      rows(compound(v, WERDEN, (i) => `${perfPhrase(v, i)} ${AUX[v.perf.aux].inf}`)));
  }
  add("konj1", "B1", "Konjunktiv I", "reported speech", "news: Er sagt, er sei krank.", null,
    rows(k1Of(v).map((f, i) => withRest(v, i, f))));
  if (v.perf) {
    add("konj1perf", "B1", "Konjunktiv I Perfekt", "reported speech – past", "news: Er sagt, er habe es gesehen.", null,
      rows(compound(v, AUX[v.perf.aux].k1, (i) => perfPhrase(v, i))));
  }
  if (!own) {
    add("konj2praet", "B1", "Konjunktiv II Präteritum", "would – old form", kind === "weak" ? "same as Präteritum, so people say würde + infinitive" : "written German; in speech mostly würde + infinitive", "konjunktiv-2",
      rows(k2OldOf(v).map((f, i) => withRest(v, i, f))));
  }
  if (v.perf) {
    add("konj2plusq", "B1", "Konjunktiv II Plusquamperfekt", "would have done", "Ich hätte das gemacht.", "konjunktiv-2",
      rows(compound(v, AUX[v.perf.aux].k2, (i) => perfPhrase(v, i))));
  }
};

// The tenses, A2 first (open), then B1 (folded in the view).
// grammar: the topic key in grammar/topics.json
export const conjugate = (front, forms) => {
  const v = parseVerb(front, forms);
  if (!v) return null;
  const present = presentOf(v);
  const kind = SPECIAL_PRAES[v.head] ? "special" : praetKind(v);
  const tenses = [];
  const add = (key, level, de, en, use, grammar, r, note) => tenses.push({ key, level, title: { de, en }, use, grammar, rows: r, note });

  add("praesens", "A2", "Präsens", "present", "now, habits, the near future", v.head === "sein" || MODALS.has(v.head) ? null : "praesens-regelmaessig",
    rows(present.forms.map((f, i) => withRest(v, i, f))));
  if (v.perf) {
    add("perfekt", "A2", "Perfekt", "past – spoken", "talking about the past", "perfekt",
      rows(compound(v, AUX[v.perf.aux].praes, (i) => perfPhrase(v, i))));
  }
  add("praeteritum", "A2", "Präteritum", "past – written", "writing; sein, haben and modal verbs also in speech", "praeteritum",
    rows(preteritOf(v).map((f, i) => withRest(v, i, f))), v.head === "möchten" ? "möchten has no past of its own: ich wollte (from wollen)" : undefined);
  // möchten is itself a Konjunktiv II (of mögen): no other tenses
  if (v.head !== "möchten") moreTenses(v, present, kind, add);

  const regular = kind === "weak" && !present.changed && (!v.perf || !partSeg(v));
  return {
    front, verb: v.verb, head: v.head, particle: v.particle, reflexive: v.reflexive, modal: MODALS.has(v.head),
    regular, notes: v.notes, tenses,
    // the forms to remember for an irregular verb: liest · las · gelesen
    keyForms: regular ? null : [
      present.changed && textOf(present.forms[1]) !== textOf(present.forms[2]) ? `du ${textOf(present.forms[1])}` : null,
      present.changed ? `er ${textOf(present.forms[2])}` : null,
      kind !== "weak" ? v.praet : null,
      v.perf && partSeg(v) ? v.perf.part : null,
    ].filter(Boolean),
    pattern: patternOf(v, present, kind),
  };
};

// "Geht wie …": verbs with the same pattern. Irregular verbs: the stem
// vowels (lesen e – ie – a – e like sehen); regular ones: their kind.
const patternOf = (v, present, kind) => {
  if (MODALS.has(v.head)) return { key: "modal", label: "Modalverb" };
  if (kind === "special") return null; // sein, haben, werden, wissen, tun: one of a kind
  const stem = stemOf(v.head);
  const part = v.perf ? v.perf.part : "";
  if (kind === "weak" && !present.changed && (!v.perf || !partSeg(v))) {
    if (/ieren$/.test(v.head)) return { key: "w-ieren", label: "regelmäßig, -ieren: ohne ge- (hat studiert)" };
    if (/e[lr]n$/.test(v.head)) return { key: "w-eln", label: "regelmäßig, -eln/-ern: ich wandere, wir wandern" };
    if (needsE(stem)) return { key: "w-e", label: "regelmäßig mit -e-: du arbeitest, er arbeitet" };
    return { key: "w", label: "regelmäßig" };
  }
  if (kind === "weak") return null; // backen: only the Partizip (gebacken) is irregular
  const praetCore = kind === "strong" ? v.praet : v.praet.slice(0, -2);
  const partCore = part.replace(/(en|t)$/, "");
  const vowels = [vowelOf(stem), vowelOf(present.changed ? textOf(present.forms[2]) : stem), vowelOf(praetCore), part ? vowelOf(partCore) : "?"];
  return { key: `${kind}:${vowels.join("-")}`, label: `${kind === "mixed" ? "gemischt" : "unregelmäßig"}: ${vowels.join(" – ")}` };
};

// All verbs that share a pattern, by card id → [{ id, verb }], one per verb
// (abfahren counts once though it is in two chapters). formsById: VERB_FORMS.
export const buildPatternIndex = (formsById) => {
  const byKey = new Map();
  const byId = new Map();
  for (const [id, forms] of formsById) {
    const front = id.slice(id.indexOf("::") + 2);
    const c = conjugate(front, forms);
    if (!c || !c.pattern) continue;
    byId.set(id, c.pattern.key);
    if (!byKey.has(c.pattern.key)) byKey.set(c.pattern.key, new Map());
    const verbs = byKey.get(c.pattern.key);
    if (!verbs.has(c.verb)) verbs.set(c.verb, { id, verb: c.verb, base: !c.particle && !/\s/.test(front) });
  }
  return { byKey, byId };
};

// up to `max` other verbs like this one, simple verbs first (fahren before abfahren)
export const sameAs = (index, id, verb, max = 8) => {
  const key = index.byId.get(id);
  if (!key) return { list: [], more: 0 };
  const all = [...index.byKey.get(key).values()].filter((x) => x.verb !== verb);
  all.sort((a, b) => Number(b.base) - Number(a.base));
  return { list: all.slice(0, max), more: Math.max(0, all.length - max) };
};

// the text of a row, e.g. for 🔊: "du liest"
export const rowText = (row) => `${row.person === "er/sie/es" ? "er" : row.person === "sie/Sie" ? "sie" : row.person} ${textOf(row.segs)}`;
export const formText = textOf;
