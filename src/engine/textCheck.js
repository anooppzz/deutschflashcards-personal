// 🔍 Fehler-Check (Menschen A2, "Fehler in eigenen Texten finden"): read your
// own text once per kind of mistake, and look for only that one. The book's
// five rounds plus two extra ones (Kasus, Adjektivendungen); each marks the
// places in the text for its kind:
//   kind "error" - very likely wrong, with a fix (ich gehen → ich gehe)
//   kind "check" - look here, it may be wrong
// The app only knows its own words (the cards) and their verb forms
// (engine/conjugate.js) - a word it doesn't know is never marked.
// Used by components/TextCheck.jsx (✍️ Text prüfen and DTZ Schreiben).
import { conjugate, formText, parseVerb } from "./conjugate";
import { STORAGE_KEYS } from "../constants";
import { lookupWiktionary } from "./wiktionary";

export const ROUNDS = [
  {
    key: "nomen-gross", grammar: "grammatik-woerter",
    de: "Sind die Nomen großgeschrieben?", en: "Are the nouns capitalised?",
    rule: { de: "Nomen schreibt man immer groß – auch mitten im Satz: Ich trinke Kaffee.", en: "Every noun starts with a capital letter, also in the middle of a sentence." },
  },
  {
    key: "verb-konjugiert", grammar: "praesens-regelmaessig",
    de: "Sind die Verben konjugiert?", en: "Are the verbs conjugated?",
    rule: { de: "Das Verb passt zur Person: ich gehe, du gehst, er geht – nicht „ich gehen“.", en: "The verb's ending matches the person: ich gehe, du gehst, er geht." },
  },
  {
    key: "verb-position2", grammar: "wortstellung-hauptsatz",
    de: "Steht das Verb in Hauptsätzen an Position 2?", en: "Is the verb in position 2 in main clauses?",
    rule: { de: "Im Hauptsatz steht das Verb auf Position 2: Heute gehe ich … (nicht: Heute ich gehe).", en: "Main clause: the verb is the 2nd element. If something else comes first, the subject moves behind the verb." },
  },
  {
    key: "verb-ende", grammar: "nebensatz",
    de: "Steht das Verb in Nebensätzen am Ende?", en: "Is the verb at the end in subordinate clauses?",
    rule: { de: "Nach weil, dass, wenn, ob … steht das Verb am Ende: …, weil ich keine Zeit habe.", en: "After weil (because), dass (that), wenn (if/when), ob (whether) … the verb goes to the end of the clause." },
  },
  {
    key: "artikel", grammar: "artikel-nominativ",
    de: "Stehen die Nomen mit Artikel?", en: "Do the nouns have an article?",
    rule: { de: "Ein Nomen braucht meistens einen Artikel – den richtigen: der Tisch, die Lampe, das Bett. Ohne Artikel: Plural (Ich kaufe Blumen), Stoffe (Ich trinke Kaffee), Namen.", en: "A noun usually needs an article, with the noun's gender (der/die/das). Not needed: plurals in general, things like coffee or water, names." },
  },
  {
    key: "kasus", grammar: "kasus-ueberblick", extra: true,
    de: "Stimmt der Kasus?", en: "Is the case right (dative / accusative)?",
    rule: { de: "mit, nach, bei, seit, von, zu, aus + Dativ (mit dem Bus); für, ohne, gegen, um, durch + Akkusativ (für den Chef); in, an, auf … Wo? + Dativ (Ich bin im Kino), Wohin? + Akkusativ (Ich gehe ins Kino); helfen, gefallen, danken … + Dativ (Das gefällt mir).", en: "Some prepositions and verbs always take the dative, others the accusative; in/an/auf … take the dative for a place (where?) and the accusative for a movement (where to?)." },
  },
  {
    key: "adj-endung", grammar: "adjektivendungen", extra: true,
    de: "Stimmen die Adjektivendungen?", en: "Are the adjective endings right?",
    rule: { de: "Nach der/die/das: -e oder -en (der neue Tisch, mit dem neuen Tisch). Nach ein/kein/mein: -er/-es/-e/-en (ein neuer Tisch, ein neues Bett). Ohne Artikel zeigt das Adjektiv den Kasus: gutes Wetter, mit kaltem Wasser, liebe Grüße.", en: "An adjective before a noun needs an ending; it depends on the article, the gender and the case. Without an article, the adjective takes the article's ending (dem → kaltem)." },
  },
];

// ---- words ----

const WORD = /[\p{L}][\p{L}'’-]*/gu;
// the text as words with their place: [{ t, lo, start, end }]
export const wordsOf = (text) => [...text.matchAll(WORD)].map((m) => ({ t: m[0], lo: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length }));

// sentences → clauses (split at commas), each a list of word indexes; a line
// break ends a sentence too (letters: „Liebe Sabine,“ on its own line)
const clausesOf = (text, words) => {
  const sentences = [];
  let sentence = [];
  let clause = [];
  let wi = 0;
  const endClause = () => { if (clause.length) sentence.push(clause); clause = []; };
  const endSentence = () => { endClause(); if (sentence.length) sentences.push(sentence); sentence = []; };
  for (let i = 0; i < text.length; i += 1) {
    if (wi < words.length && words[wi].start === i) { clause.push(wi); i = words[wi].end - 1; wi += 1; continue; }
    const ch = text[i];
    if (ch === "," || ch === ";" || ch === ":") endClause();
    else if (ch === "." || ch === "!" || ch === "?" || ch === "\n") endSentence();
  }
  endSentence();
  return sentences;
};

const PRONOUN_PERSONS = { ich: [0], du: [1], er: [2], es: [2, 5], sie: [2, 5], wir: [3], ihr: [4] }; // „es sind zwanzig Grad“
// pronouns that are always the subject (es, sie, ihr can be objects too)
const SUBJECT_ONLY = new Set(["ich", "du", "er", "wir"]);
const COORD = new Set(["und", "oder", "aber", "denn", "sondern"]);
const SUBORD = new Set(["weil", "dass", "wenn", "ob", "obwohl", "damit", "bevor", "nachdem", "als", "falls", "sodass"]);
const DETERMINERS = new Set([
  "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines",
  "kein", "keine", "keinen", "keinem", "keiner", "keines", "dieser", "diese", "diesen", "diesem", "dieses",
  "jeder", "jede", "jeden", "jedem", "jedes", "welcher", "welche", "welchen", "welchem", "welches",
  "zum", "zur", "im", "am", "ins", "ans", "vom", "beim", "alle", "viele", "einige", "mehrere", "manche", "beide",
  "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "hundert", "tausend", "pro",
]);
const POSSESSIVE = /^(mein|dein|sein|ihr|unser|euer|eur|Ihr)(e|en|em|er|es)?$/i;
const isDeterminer = (lo) => DETERMINERS.has(lo) || POSSESSIVE.test(lo);
// little words that are never nouns, even when a noun card looks the same
const FUNCTION_WORDS = new Set([
  "ich", "du", "er", "sie", "es", "wir", "ihr", "mich", "dich", "sich", "uns", "euch", "mir", "dir", "ihm", "ihnen",
  "und", "oder", "aber", "denn", "sondern", "weil", "dass", "wenn", "ob", "als", "wie", "mit", "nach", "bei", "von",
  "zu", "aus", "für", "ohne", "gegen", "um", "in", "an", "auf", "über", "unter", "vor", "hinter", "neben", "zwischen",
  "nicht", "auch", "sehr", "gern", "gerne", "schon", "noch", "nur", "bald", "heute", "morgen", "gestern", "hier", "da",
  "dort", "jetzt", "dann", "so", "ja", "nein", "doch", "mal", "viel", "wenig", "gut", "bis", "seit", "wieder",
  "paar", // ein paar Minuten
]);
// question words: after a comma they start a subordinate clause (…, wann ich will)
const W_WORDS = new Set(["was", "wer", "wen", "wem", "wann", "wie", "wo", "woher", "wohin", "warum", "welche", "welcher", "welches", "welchen", "welchem"]);

// ---- what the app knows: nouns and verb forms ----

// verbs every text needs, whether or not the app has a card for them
const BASE_VERBS = [
  ["sein", "ist", "war", "ist gewesen"], ["haben", "hat", "hatte", "hat gehabt"], ["werden", "wird", "wurde", "ist geworden"],
  ["wissen", "weiß", "wusste", "hat gewusst"], ["können", "kann", "konnte", "hat gekonnt"], ["müssen", "muss", "musste", "hat gemusst"],
  ["dürfen", "darf", "durfte", "hat gedurft"], ["wollen", "will", "wollte", "hat gewollt"], ["sollen", "soll", "sollte", "hat gesollt"],
  ["mögen", "mag", "mochte", "hat gemocht"], ["möchten", "möchte", "wollte"],
];

// an adjective with an ending: neu + e → neue, teuer → teure, dunkel → dunkle
const NO_DECLINE = new Set(["rosa", "lila", "super", "prima", "extra", "orange"]);
export const inflect = (base, end) => {
  if (!end) return base;
  if (base === "hoch") return `hoh${end}`;
  if (base.endsWith("e")) return base + end.slice(1);
  if (/el$/.test(base)) return `${base.slice(0, -2)}l${end}`;
  if (/(au|eu)er$/.test(base)) return `${base.slice(0, -2)}r${end}`;
  return base + end;
};

// ---- the lexicon: what the checks know about words ----
// nouns: "kaffee" → "Kaffee" · nounInfo: "tisch" → { gender, form } ·
// plurals: "blumen" → { gender, singular, form } · adjectives: "neuen" →
// { base, ending } · persons: finite form → persons it fits (0 ich … 5 sie) ·
// present / sameTense: a form → the six forms (to suggest the right one) ·
// participle: "gefällt" → "gefallen" · lemma: "fuhr" → "fahren" ·
// dativeForms: every form of helfen, gefallen … · notNouns: words that are
// never nouns
const emptyLexicon = () => ({
  nouns: new Map(), nounInfo: new Map(), plurals: new Map(), adjectives: new Map(), notNouns: new Set(FUNCTION_WORDS),
  persons: new Map(), present: new Map(), sameTense: new Map(), participle: new Map(), participles: new Set(),
  lemma: new Map(), dativeForms: new Set(),
});
// a copy to add to (Wiktionary words for one text)
const copyLexicon = (lex) => Object.fromEntries(Object.entries(lex).map(([k, v]) => [k, v instanceof Map ? new Map(v) : new Set(v)]));

const setOnce = (map, key, value) => { if (!map.has(key)) map.set(key, value); };

// form: "Tisch"; plural: "Tische" | "" (none) | null (unknown); pluralOnly: die Eltern
const addNoun = (lex, form, gender, plural, pluralOnly = false) => {
  const lo = form.toLowerCase();
  setOnce(lex.nouns, lo, form);
  if (pluralOnly) { setOnce(lex.plurals, lo, { gender: null, singular: null, form }); return; }
  if (!["der", "die", "das"].includes(gender)) return;
  setOnce(lex.nounInfo, lo, { gender, form });
  if (plural) {
    setOnce(lex.plurals, plural.toLowerCase(), { gender, singular: form, form: plural });
    setOnce(lex.nouns, plural.toLowerCase(), plural);
  }
};

const addAdjective = (lex, base) => {
  if (!/^[a-zäöüß]+$/.test(base) || NO_DECLINE.has(base)) return;
  for (const end of ["", "e", "en", "er", "es", "em"]) setOnce(lex.adjectives, inflect(base, end), { base, ending: end });
};

// front: "ab·fahren", forms: { praes, praet, perf } (VERB_FORMS)
const addVerb = (lex, front, forms, dative = false) => {
  const c = conjugate(front, forms);
  if (!c) return;
  const praes = c.tenses.find((t) => t.key === "praesens").rows.map((r) => formText(r.segs).split(" ")[0]);
  const v = parseVerb(front, forms);
  const part = v && v.perf ? v.perf.part.toLowerCase() : null;
  const verb = c.verb.toLowerCase();
  const isDative = dative && c.head !== "stehen";
  const forms6 = (word) => {
    const lo = word.toLowerCase();
    setOnce(lex.lemma, lo, verb);
    if (part) setOnce(lex.participle, lo, part);
    if (isDative) lex.dativeForms.add(lo);
  };
  forms6(verb);
  if (part) { lex.participles.add(part); setOnce(lex.lemma, part, verb); if (isDative) lex.dativeForms.add(part); }
  const add = (form, i) => {
    const lo = form.toLowerCase();
    if (!lex.persons.has(lo)) lex.persons.set(lo, new Set());
    lex.persons.get(lo).add(i);
    lex.notNouns.add(lo);
    setOnce(lex.present, lo, praes);
  };
  for (const t of c.tenses) {
    if (t.key === "praesens" || t.key === "praeteritum") {
      const six = t.rows.map((r) => formText(r.segs).split(" ")[0]);
      for (const f of six) { setOnce(lex.sameTense, f.toLowerCase(), six); forms6(f); }
    }
    if (["praesens", "praeteritum", "konj2"].includes(t.key)) {
      t.rows.forEach((r, i) => {
        const words = formText(r.segs).split(" ");
        if (t.key === "konj2" && words.length > 1 && words[0].startsWith("würd")) { add(words[0], i); return; }
        add(words[0], i);
        // a separable verb in a subordinate clause: …, weil ich früh aufstehe
        if (c.particle && words[words.length - 1] === c.particle) { add(c.particle + words[0], i); forms6(c.particle + words[0]); }
      });
    }
    for (const r of t.rows) for (const w of formText(r.segs).split(" ")) lex.notNouns.add(w.toLowerCase());
  }
};

// cards: ALL_CARDS; verbForms: VERB_FORMS (card id → forms); opts.pluralOf:
// a noun card's plural (modes/forms/buildForms.js); opts.dativeIds: verbs
// that take the dative (📋 "Verben mit Dativ", group Dativ)
export const buildLexicon = (cards, verbForms, opts = {}) => {
  const { pluralOf = () => null, dativeIds = new Set() } = opts;
  const lex = emptyLexicon();
  for (const c of cards) {
    if (c.type === "n") {
      const m = c.front.match(/^(?:der\/die|der|die|das)\s+([\p{Lu}][\p{L}-]*)$/u);
      if (m) addNoun(lex, m[1], c.gender, pluralOf(c), /^nur Plural/.test(c.sub || "")); // die Eltern, die Möbel: plural only
    } else {
      if (c.type === "adj") addAdjective(lex, c.front);
      for (const w of c.front.replace(/·/g, "").match(WORD) || []) if (!/^\p{Lu}/u.test(w)) lex.notNouns.add(w.toLowerCase());
    }
  }
  for (const [inf, praes, praet, perf] of BASE_VERBS) addVerb(lex, inf, { praes, praet, perf });
  for (const [id, forms] of verbForms) addVerb(lex, id.slice(id.indexOf("::") + 2), forms, dativeIds.has(id));
  return lex;
};

// ---- words the app has no card for (📖 Wiktionary) ----

// the words in a text the lexicon doesn't know – to look up
export const unknownWords = (text, lex, max = 15) => {
  const seen = new Set();
  const out = [];
  wordsOf(text).forEach((w, i, all) => {
    const lo = w.lo;
    if (seen.has(lo) || lo.length < 3) return;
    seen.add(lo);
    const known = lex.nouns.has(lo) || lex.notNouns.has(lo) || lex.adjectives.has(lo) || lex.persons.has(lo) || lex.lemma.has(lo) || isDeterminer(lo) || W_WORDS.has(lo) || SUBORD.has(lo);
    // a capital word after „Liebe/Lieber/Frau/Herr“ is a name
    const prev = all[i - 1];
    if (known || (prev && /^(liebe[rs]?|frau|herr|hallo|hi)$/i.test(prev.t))) return;
    out.push(w.t);
  });
  return out.slice(0, max);
};

// Look the unknown words up in Wiktionary (cached per word) – an inflected
// form („Häuser“) is followed to its base word („Haus“). Throws when the
// first lookup fails (offline). → { lex, found: [word], missing: [word] }
const useful = (e) => (e.articles && e.articles.length) || e.verb || e.adjective || e.pos === "Adjektiv";
export const lookUpUnknown = async (words, lex, lookup = lookupWiktionary) => {
  const entries = [];
  const found = [];
  const missing = [];
  for (const [n, w] of words.entries()) {
    let es;
    try { es = await lookup(w); } catch (err) { if (n === 0) throw err; missing.push(w); continue; }
    let got = es.filter(useful);
    for (const base of [...new Set(es.map((e) => e.lemma).filter(Boolean))].slice(0, 2)) {
      try { got = got.concat((await lookup(base)).filter(useful)); } catch { /* offline now */ }
    }
    if (got.length) { entries.push(...got); found.push(w); } else missing.push(w);
  }
  return { lex: extendLexicon(lex, entries), found, missing };
};

// Wiktionary entries (engine/wiktionary.js) → a lexicon that knows them too
export const extendLexicon = (lex, entries) => {
  const next = copyLexicon(lex);
  for (const e of entries) {
    if (e.articles && e.articles.length === 1 && e.pos === "Substantiv") addNoun(next, e.title, e.articles[0], e.plural || null);
    if (e.verb && e.verb.er && e.verb.praeteritum && e.verb.partizip && /^[a-zäöüß]+$/.test(e.title)) {
      const aux = /^sein/.test(e.verb.hilfsverb || "") ? "ist" : "hat";
      addVerb(next, e.title, { praes: e.verb.er, praet: e.verb.praeteritum, perf: `${aux} ${e.verb.partizip}` });
    }
    if (e.adjective || e.pos === "Adjektiv") addAdjective(next, e.title);
  }
  return next;
};
// ---- the five rounds ----

const mark = (words, from, to, kind, de, en, fix) => ({ start: words[from].start, end: words[to].end, kind, de, en, fix });
const isFinite = (lex, w, first) => lex.persons.has(w.lo) && (first || !/^\p{Lu}/u.test(w.t));

const nounCaps = (words, lex) => words.flatMap((w, i) => {
  if (!/^\p{Ll}/u.test(w.t) || lex.notNouns.has(w.lo) || lex.adjectives.has(w.lo)) return [];
  // „eine junge Frau“, „das deutsche Alphabet“: an adjective before a noun
  if (words[i + 1] && /^\p{Lu}/u.test(words[i + 1].t) && words[i - 1] && isDeterminer(words[i - 1].lo)) return [];
  const noun = lex.nouns.get(w.lo);
  return noun ? [mark(words, i, i, "error", `${w.t} → ${noun}`, "A noun: capital letter.", noun)] : [];
});

const verbAgreement = (words, clauses, lex) => {
  const out = [];
  const check = (pi, vi) => {
    const pron = words[pi].lo;
    const allowed = PRONOUN_PERSONS[pron];
    const fits = lex.persons.get(words[vi].lo);
    if (!fits || allowed.some((p) => fits.has(p))) return;
    const praes = lex.present.get(words[vi].lo);
    const fix = praes && praes[allowed[0]];
    const [a, b] = pi < vi ? [pi, vi] : [vi, pi];
    const right = fix ? (pi < vi ? `${words[pi].t} ${fix}` : `${fix} ${words[pi].t}`) : null;
    out.push(mark(words, a, b, "error",
      `${words[a].t} ${words[b].t}${right ? ` → ${right}` : ""}`,
      `The verb doesn't fit „${words[pi].t}“${fix ? ` – ${words[pi].lo} ${fix}` : ""}.`, right));
  };
  for (const clause of clauses.flat()) {
    clause.forEach((wi, k) => {
      const lo = words[wi].lo;
      if (!PRONOUN_PERSONS[lo]) return;
      const prev = k > 0 ? words[clause[k - 1]] : null;
      const next = k + 1 < clause.length ? clause[k + 1] : null;
      if (prev && COORD.has(prev.lo)) return; // „Sabine und ich gehen“
      if (prev && isFinite(lex, prev, k - 1 === 0)) {
        // inverted: Heute gehe ich / Kommst du? (es, sie, ihr may be objects there)
        if (SUBJECT_ONLY.has(lo)) check(wi, clause[k - 1]);
        return;
      }
      if (next == null || !isFinite(lex, words[next], false)) return;
      if (!SUBJECT_ONLY.has(lo) && k > 0 && !SUBORD.has(prev.lo)) return;
      check(wi, next);
    });
  }
  return out;
};

// main clauses: „Heute ich gehe“ → „Heute gehe ich“; after a leading
// subordinate clause the verb comes first: „Weil …, gehe ich“
const position2 = (words, clauses, lex) => {
  const out = [];
  for (const sentence of clauses) {
    sentence.forEach((clause, ci) => {
      let c = clause;
      if (SUBORD.has(words[c[0]].lo)) return;
      if (ci > 0 && W_WORDS.has(words[c[0]].lo)) return; // „…, wann ich will“: a subordinate clause
      if (COORD.has(words[c[0]].lo)) c = c.slice(1);
      if (c.length < 3) return;
      const v = c.findIndex((wi, k) => isFinite(lex, words[wi], k === 0));
      if (v < 1) return;
      const before = words[c[v - 1]];
      if (!PRONOUN_PERSONS[before.lo]) return;
      // „Ich und du gehen“: two subjects, not a word order mistake
      if (c.slice(0, v - 1).some((wi) => COORD.has(words[wi].lo) || PRONOUN_PERSONS[words[wi].lo])) return;
      const leadSub = ci > 0 && SUBORD.has(words[sentence[0][0]].lo);
      if (v - 1 === 0 && !leadSub) return; // „Ich gehe“ – fine
      const verb = words[c[v]];
      const fixed = leadSub && v - 1 === 0
        ? `${verb.t} ${before.t.toLowerCase()}`
        : `${c.slice(0, v - 1).map((wi) => words[wi].t).join(" ")} ${verb.t} ${before.t.toLowerCase()}`;
      out.push(mark(words, c[0], c[v], "error", `${c.slice(0, v + 1).map((wi) => words[wi].t).join(" ")} → ${fixed}`,
        leadSub ? "After a leading weil/wenn/dass clause, the main clause starts with the verb." : "The verb is the 2nd element: after Heute, Dann, Am Montag … comes the verb, then the subject.", fixed));
    });
  }
  return out;
};

const verbAtEnd = (words, clauses, lex) => {
  const out = [];
  for (const clause of clauses.flat()) {
    if (!SUBORD.has(words[clause[0]].lo) || clause.length < 3) continue;
    const rest = clause.slice(1);
    const last = words[rest[rest.length - 1]];
    const subj = rest.find((wi) => PRONOUN_PERSONS[words[wi].lo]);
    const allowed = subj != null ? PRONOUN_PERSONS[words[subj].lo] : null;
    const fitsSubj = (w) => isFinite(lex, w, false) && (!allowed || allowed.some((p) => lex.persons.get(w.lo).has(p)));
    const finite = rest.filter((wi) => wi !== subj && fitsSubj(words[wi]));
    // the last word may be a verb the app doesn't know: then only „check“
    const unknown = /^\p{Ll}/u.test(last.t) && !lex.persons.has(last.lo) && !lex.notNouns.has(last.lo) && !lex.nouns.has(last.lo);
    if (finite.length === 0 || (unknown && !allowed)) {
      if (!lex.persons.has(last.lo)) out.push(mark(words, clause[0], rest[rest.length - 1], "check", `${words[clause[0]].t} …: Verb am Ende?`, "Check: the conjugated verb goes to the end of this clause."));
      continue;
    }
    if (finite.includes(rest[rest.length - 1])) continue;
    // no pronoun subject (… dass Leon zu Hause bleiben soll): ending on a verb is fine
    if (!allowed && lex.persons.has(last.lo)) continue;
    const verb = finite[0];
    const fixed = [words[clause[0]].t, ...rest.filter((wi) => wi !== verb).map((wi) => words[wi].t), words[verb].t].join(" ");
    out.push(mark(words, clause[0], rest[rest.length - 1], "error", `→ ${fixed}`, `Subordinate clause: „${words[verb].t}“ goes to the end.`, fixed));
  }
  return out;
};

const ADJ_END = /(e|en|er|es|em)$/;
// nouns that are usually used without an article
const NO_ARTICLE = new Set([
  "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag", "januar", "februar", "märz", "april",
  "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember", "uhr", "zeit", "hause", "urlaub",
  "hunger", "durst", "angst", "spaß", "glück", "lust", "geld", "kaffee", "tee", "wasser", "milch", "brot", "zucker",
  "sport", "musik", "deutsch", "englisch", "bescheid", "hilfe",
]);
const articles = (text, words, lex) => words.flatMap((w, i) => {
  if (!/^\p{Lu}/u.test(w.t) || !lex.nouns.has(w.lo) || lex.notNouns.has(w.lo) || NO_ARTICLE.has(w.lo)) return [];
  const p1 = words[i - 1];
  const p2 = words[i - 2];
  const next = words[i + 1];
  if (p1 && /\d/.test(text.slice(p1.end, w.start))) return []; // „um 8 Uhr“, „3 Kilo“
  if (next && /^\p{Lu}/u.test(next.t) && /^\s+$/.test(text.slice(w.end, next.start)) && /^(frau|herr|doktor)$/.test(w.lo)) return []; // „Frau Krüger“
  if (p1 && /^(letzte|nächste|vorige|jede)$/.test(p1.lo)) return []; // „letzte Woche“
  if (p1 && isDeterminer(p1.lo)) return [];
  if (p1 && p2 && ADJ_END.test(p1.lo) && isDeterminer(p2.lo)) return [];
  if (i === 0 || (p1 && /^(liebe[rs]?|sehr|geehrte[rs]?|hallo)$/i.test(p1.t))) return []; // „Liebe Sabine“
  return [mark(words, i, i, "check", `${w.t}: Artikel?`, "Check: does this noun need der/die/das, ein/eine, mein …?")];
});

// ---- articles, cases, endings: what a determiner + noun can be ----

const DEF_SLOTS = {
  der: ["nom-m", "dat-f", "gen-f", "gen-pl"], die: ["nom-f", "acc-f", "nom-pl", "acc-pl"], das: ["nom-n", "acc-n"],
  den: ["acc-m", "dat-pl"], dem: ["dat-m", "dat-n"], des: ["gen-m", "gen-n"],
};
const INDEF_SLOTS = {
  "": ["nom-m", "nom-n", "acc-n"], e: ["nom-f", "acc-f", "nom-pl", "acc-pl"], en: ["acc-m", "dat-pl"],
  em: ["dat-m", "dat-n"], er: ["dat-f", "gen-f", "gen-pl"], es: ["gen-m", "gen-n"],
};
const DEF_FORM = {
  "nom-m": "der", "acc-m": "den", "dat-m": "dem", "gen-m": "des", "nom-f": "die", "acc-f": "die", "dat-f": "der", "gen-f": "der",
  "nom-n": "das", "acc-n": "das", "dat-n": "dem", "gen-n": "des", "nom-pl": "die", "acc-pl": "die", "dat-pl": "den", "gen-pl": "der",
};
const INDEF_END = {
  "nom-m": "", "acc-m": "en", "dat-m": "em", "gen-m": "es", "nom-f": "e", "acc-f": "e", "dat-f": "er", "gen-f": "er",
  "nom-n": "", "acc-n": "", "dat-n": "em", "gen-n": "es", "nom-pl": "e", "acc-pl": "e", "dat-pl": "en", "gen-pl": "er",
};
const GENDER = { der: "m", die: "f", das: "n" };
const GENDER_EN = { der: "masculine", die: "feminine", das: "neuter" };
const CASE_DE = { nom: "Nominativ", acc: "Akkusativ", dat: "Dativ", gen: "Genitiv" };

// der/die/das … or ein/kein/mein … with its ending
const detOf = (lo) => {
  if (DEF_SLOTS[lo]) return { kind: "def", form: lo };
  const m = lo.match(/^(ein|kein|mein|dein|sein|ihr|unser|euer|eur)(e|en|em|er|es)?$/);
  return m ? { kind: "indef", stem: m[1], end: m[2] || "" } : null;
};
const slotsOf = (d) => (d.kind === "def" ? DEF_SLOTS[d.form] : INDEF_SLOTS[d.end].filter((sl) => d.stem !== "ein" || !sl.endsWith("pl")));
const detFor = (d, slot, orig) => {
  const f = d.kind === "def" ? DEF_FORM[slot] : d.stem + INDEF_END[slot];
  return /^\p{Lu}/u.test(orig) ? f[0].toUpperCase() + f.slice(1) : f;
};
// after der/die/das: -e in nominative singular (and accusative f/n), else -en;
// after ein/kein/mein: -er/-e/-es in nominative (and accusative f/n), else -en
const MIXED = { "nom-m": "er", "nom-f": "e", "nom-n": "es", "acc-f": "e", "acc-n": "es" };
const adjEnding = (d, slot) => (d.kind === "def" ? (/^(nom-[mfn]|acc-[fn])$/.test(slot) ? "e" : "en") : MIXED[slot] || "en");

// a noun word's gender and number: ["m"], ["pl"], ["m", "pl"] (der Lehrer / die Lehrer)
const readingsOf = (lex, lo) => {
  const r = [];
  const sg = lex.nounInfo.get(lo);
  if (sg) r.push(GENDER[sg.gender]);
  if (lex.plurals.has(lo)) r.push("pl");
  return r;
};
// a determiner at i, adjectives, then a known noun – all in one clause
const phraseAt = (text, words, lex, i) => {
  const d = words[i] && detOf(words[i].lo);
  if (!d) return null;
  let j = i + 1;
  const adjs = [];
  while (j < words.length && /^\p{Ll}/u.test(words[j].t) && lex.adjectives.has(words[j].lo)) { adjs.push(j); j += 1; }
  if (j >= words.length || !/^\p{Lu}/u.test(words[j].t)) return null;
  if (/[,.!?;:\n\d]/.test(text.slice(words[i].end, words[j].start))) return null; // „die 5 Euro“
  const readings = readingsOf(lex, words[j].lo);
  return readings.length ? { i, d, adjs, noun: j, readings } : null;
};
const fitting = (p) => slotsOf(p.d).filter((sl) => p.readings.includes(sl.split("-")[1]));
const phraseText = (text, words, p) => text.slice(words[p.i].start, words[p.noun].end);
const withDet = (text, words, p, det) => det + text.slice(words[p.i].end, words[p.noun].end);
// words that start a clause after a comma: der/die/das there is a relative pronoun
const afterComma = (clauses) => new Set(clauses.flatMap((sentence) => sentence.slice(1).map((c) => c[0])));

// round 5: „die Tisch“ → „der Tisch“
const genderErrors = (text, words, clauses, lex) => {
  const rel = afterComma(clauses);
  return words.flatMap((w, i) => {
    if (rel.has(i) && DEF_SLOTS[w.lo]) return [];
    const p = phraseAt(text, words, lex, i);
    if (!p || fitting(p).length) return [];
    const sg = lex.nounInfo.get(words[p.noun].lo);
    if (!sg) return []; // a plural with ein: no fix to suggest
    const caseOf = slotsOf(p.d)[0].split("-")[0];
    const fixed = withDet(text, words, p, detFor(p.d, `${caseOf}-${GENDER[sg.gender]}`, w.t));
    return [mark(words, i, p.noun, "error", `${phraseText(text, words, p)} → ${fixed}`, `It's „${sg.gender} ${sg.form}“ (${GENDER_EN[sg.gender]}).`, fixed)];
  });
};

// round 2, noun subjects: „Die Blumen hat …“ → „Die Blumen haben …“
const SUBJECT_PRONOUNS = new Set(["ich", "du", "er", "sie", "es", "wir", "ihr"]);
const nounSubjects = (text, words, clauses, lex) => {
  const out = [];
  for (const clause of clauses.flat()) {
    const c = COORD.has(words[clause[0]].lo) ? clause.slice(1) : clause;
    if (c.length < 2) continue;
    const sub = SUBORD.has(words[c[0]].lo);
    const first = c[sub ? 1 : 0];
    if (first == null) continue;
    let number = null;
    let nounIdx = null;
    const p = phraseAt(text, words, lex, first);
    if (p) {
      const nom = fitting(p).filter((sl) => sl.startsWith("nom"));
      const nums = new Set(nom.map((sl) => (sl.endsWith("pl") ? "pl" : "sg")));
      if (nums.size !== 1) continue;
      [number] = nums;
      nounIdx = p.noun;
    } else if (/^\p{Lu}/u.test(words[first].t) && lex.plurals.has(words[first].lo) && !lex.nounInfo.has(words[first].lo)) {
      number = "pl";
      nounIdx = first;
    } else continue;
    const k = c.indexOf(nounIdx);
    const vi = sub ? c[c.length - 1] : c[k + 1];
    if (vi == null || vi === nounIdx || !isFinite(lex, words[vi], false)) continue;
    if (!sub && c[k + 2] != null && SUBJECT_PRONOUNS.has(words[c[k + 2]].lo)) continue; // „Die Blumen kaufe ich“
    const need = number === "pl" ? 5 : 2;
    if (lex.persons.get(words[vi].lo).has(need)) continue;
    const six = lex.sameTense.get(words[vi].lo);
    const fix = six && six[need];
    out.push(mark(words, first, vi, "error", `${words[vi].t} → ${fix || "?"}`,
      number === "pl" ? `„${words[nounIdx].t}“ is plural – the verb takes the sie-form (${fix}).` : `„${words[nounIdx].t}“ is singular – the verb takes the er/sie/es-form (${fix}).`, fix));
  }
  return out;
};

// round 2, Perfekt: „hat … gefällt“ → „hat … gefallen“
const AUX = new Set(["habe", "hast", "hat", "haben", "habt", "hatte", "hattest", "hatten", "hattet", "bin", "bist", "ist", "sind", "seid", "war", "warst", "waren", "wart"]);
const participleErrors = (words, clauses, lex) => {
  const out = [];
  for (const c of clauses.flat()) {
    if (c.length < 3 || SUBORD.has(words[c[0]].lo)) continue;
    const aux = c.slice(0, 3).find((wi) => AUX.has(words[wi].lo));
    const lastIdx = c[c.length - 1];
    const last = words[lastIdx];
    if (aux == null || aux === lastIdx || !/^\p{Ll}/u.test(last.t) || lex.participles.has(last.lo) || lex.adjectives.has(last.lo)) continue; // „Der Schnee ist weiß“
    const part = lex.participle.get(last.lo);
    if (!part || words[c[c.length - 2]].lo === "zu") continue;
    out.push(mark(words, lastIdx, lastIdx, "error", `${last.t} → ${part}`, `Perfekt: ${words[aux].t} … + Partizip II at the end (${part}).`, part));
  }
  return out;
};

// round 6: prepositions + case, dative verbs + mir/dir/ihm
const DAT_PREPS = new Set(["mit", "nach", "bei", "seit", "von", "zu", "aus", "gegenüber"]);
const ACC_PREPS = new Set(["für", "ohne", "gegen", "um", "durch"]);
const ALL_PREPS = new Set([...DAT_PREPS, ...ACC_PREPS, "an", "auf", "hinter", "in", "neben", "über", "unter", "vor", "zwischen"]);
// zum = zu dem (m/n) … zur = zu der (f); the right one for each gender
const CONTRACTIONS = {
  zum: { ok: ["m", "n"], f: "zur" }, zur: { ok: ["f"], m: "zum", n: "zum" }, beim: { ok: ["m", "n"], f: "bei der" },
  vom: { ok: ["m", "n"], f: "von der" }, im: { ok: ["m", "n"], f: "in der" }, am: { ok: ["m", "n"], f: "an der" },
  ins: { ok: ["n"], m: "in den", f: "in die" }, ans: { ok: ["n"], m: "an den", f: "an die" },
};
const ACC_TO_DAT = { mich: "mir", dich: "dir", ihn: "ihm" };

// Wechselpräpositionen: Wohin? (movement) → Akkusativ, Wo? (place) → Dativ.
// The clause's verb decides; time words (in der Woche, vor einem Jahr) are Dativ.
const TWO_WAY = new Set(["in", "an", "auf", "hinter", "neben", "über", "unter", "vor", "zwischen"]);
const TWO_WAY_CONTRACTED = { im: ["in", "dat"], am: ["an", "dat"], ins: ["in", "acc"], ans: ["an", "acc"] };
// putting something somewhere: always Wohin? (Ich lege das Buch auf den Tisch)
const PLACING = new Set([
  "legen", "stellen", "setzen", "bringen", "mitbringen", "werfen", "wegwerfen", "schicken", "abschicken", "packen",
  "einpacken", "tun", "gießen", "kleben", "aufkleben", "stecken",
]);
// going somewhere: usually Wohin?, but moving inside a place is Wo? (im Park spazieren gehen)
const GOING = new Set([
  "gehen", "fahren", "fliegen", "rennen", "ziehen", "umziehen", "einziehen", "steigen", "einsteigen", "umsteigen",
  "springen", "zurückkommen", "zurückfahren", "hinfahren", "mitkommen",
]);
// a particle at the end makes it another verb: „Die Sonne geht im Osten auf“
const PARTICLES = new Set(["auf", "unter", "an", "aus", "ein", "mit", "zurück", "los", "weg", "vor", "nach", "zu", "ab", "um"]);
const LOCATION = new Set([
  "sein", "wohnen", "leben", "liegen", "stehen", "sitzen", "bleiben", "arbeiten", "schlafen", "studieren", "essen", "trinken",
  "spielen", "lernen", "kaufen", "einkaufen", "treffen", "frühstücken", "feiern", "parken", "stattfinden", "tanzen", "singen",
  "duschen", "baden", "kochen", "übernachten", "warten", "sprechen",
]);
// verbs with a fixed preposition: warten auf, denken an, sich freuen über … – no Wo?/Wohin?
const FIXED_PREP = new Set([
  "warten", "denken", "freuen", "ärgern", "erinnern", "achten", "aufpassen", "antworten", "gewöhnen", "reden", "sprechen",
  "lachen", "nachdenken", "hoffen", "teilnehmen", "glauben", "schreiben", "bestehen", "verlieben", "vorbereiten", "kümmern", "wundern",
  "beschweren", "informieren", "diskutieren", "streiten",
]);
const TIME_NOUNS = new Set([
  "jahr", "monat", "woche", "tag", "stunde", "minute", "nacht", "abend", "morgen", "mittag", "nachmittag", "vormittag",
  "wochenende", "moment", "zeit", "sommer", "winter", "frühling", "herbst", "anfang", "ende",
  "januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember",
  "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag",
]);
// Wo? or Wohin? for a two-way preposition in this part of a clause:
// { want: "dat" | "acc", sure } or null. clauseWords: the words up to the
// next und/oder/aber („… in einem Café und fahren zurück“ are two parts)
const wantedTwoWay = (prep, nounLo, clauseWords, lex) => {
  if (TIME_NOUNS.has(nounLo)) return prep === "über" ? null : { want: "dat", sure: true }; // über das Wochenende
  if (nounLo === "ferien" || nounLo === "urlaub") return null; // in den Ferien (time) / in die Ferien (fahren): both right
  // verbs only: a capital word inside the clause is a noun (das Essen, die Reise)
  let lemmas = clauseWords.filter((w, k) => k === 0 || !/^\p{Lu}/u.test(w.t)).map((w) => lex.lemma.get(w.lo)).filter(Boolean);
  // „ist … gelaufen“: sein/haben next to another verb is only the helper verb
  if (lemmas.some((l) => l !== "sein" && l !== "haben")) lemmas = lemmas.filter((l) => l !== "sein" && l !== "haben");
  if (["an", "auf", "über", "vor"].includes(prep) && lemmas.some((l) => FIXED_PREP.has(l))) return null;
  const last = clauseWords[clauseWords.length - 1];
  if (lemmas.some((l) => PLACING.has(l))) return { want: "acc", sure: true };
  if (lemmas.some((l) => GOING.has(l))) {
    if (clauseWords.some((w) => w.lo === "spazieren") || (last && PARTICLES.has(last.lo))) return null;
    return { want: "acc", sure: false };
  }
  if (lemmas.some((l) => LOCATION.has(l))) return { want: "dat", sure: true };
  return null;
};
// the case a determiner + noun shows: "dat" | "acc" | null (could be both)
const caseShown = (slots) => {
  const dat = slots.some((sl) => sl.startsWith("dat"));
  const acc = slots.some((sl) => sl.startsWith("acc") || sl.startsWith("nom"));
  return dat && !acc ? "dat" : acc && !dat ? "acc" : null;
};
const TWO_WAY_EN = {
  acc: "Wohin? (movement to a place) → Akkusativ. If you move inside the place (im Park laufen), Dativ is right.",
  dat: "Wo? (place, no movement) → Dativ.",
};

const caseErrors = (text, words, clauses, lex) => {
  const out = [];
  // each word → the words of its clause part (split at und/oder/aber)
  const clauseOf = new Map();
  for (const c of clauses.flat()) {
    let part = [];
    const parts = [part];
    for (const wi of c) {
      if (COORD.has(words[wi].lo) && part.length) { part = []; parts.push(part); }
      part.push(wi);
    }
    for (const pt of parts) for (const wi of pt) clauseOf.set(wi, pt.map((x) => words[x]));
  }
  words.forEach((w, i) => {
    if (TWO_WAY.has(w.lo)) {
      const p = phraseAt(text, words, lex, i + 1);
      if (!p) return;
      const slots = fitting(p);
      const shown = slots.length ? caseShown(slots) : null;
      const wanted = shown && wantedTwoWay(w.lo, words[p.noun].lo, clauseOf.get(i) || [], lex);
      if (!wanted || wanted.want === shown) return;
      const { want } = wanted;
      const g = slots[0].split("-")[1];
      const fixed = `${w.t} ${withDet(text, words, p, detFor(p.d, `${want}-${g}`, words[i + 1].t))}`;
      out.push(mark(words, i, p.noun, wanted.sure ? "error" : "check", `${w.t} ${phraseText(text, words, p)} → ${fixed}`, TWO_WAY_EN[want], fixed));
      return;
    }
    const want = DAT_PREPS.has(w.lo) ? "dat" : ACC_PREPS.has(w.lo) ? "acc" : null;
    if (want) {
      const p = phraseAt(text, words, lex, i + 1);
      if (!p) return;
      const slots = fitting(p);
      if (!slots.length) return; // a gender mistake: round 5
      if (!slots.some((sl) => sl.startsWith(want))) {
        const g = slots[0].split("-")[1];
        const fixed = `${w.t} ${withDet(text, words, p, detFor(p.d, `${want}-${g}`, words[i + 1].t))}`;
        out.push(mark(words, i, p.noun, "error", `${w.t} ${phraseText(text, words, p)} → ${fixed}`, `„${w.t}“ always takes the ${CASE_DE[want] === "Dativ" ? "dative" : "accusative"} (${CASE_DE[want]}).`, fixed));
      } else if (want === "dat" && slots.every((sl) => sl === "dat-pl") && !/[ns]$/.test(words[p.noun].lo)) {
        const fixed = `${words[p.noun].t}n`;
        out.push(mark(words, p.noun, p.noun, "error", `${words[p.noun].t} → ${fixed}`, "Dative plural: the noun gets -n (mit den Kindern).", fixed));
      }
      return;
    }
    const con = CONTRACTIONS[w.lo];
    const next = words[i + 1];
    if (con && next && /^\p{Lu}/u.test(next.t)) {
      const sg = lex.nounInfo.get(next.lo);
      if (!sg || lex.plurals.has(next.lo)) return;
      const g = GENDER[sg.gender];
      if (!con.ok.includes(g) && con[g]) {
        const fix = /^\p{Lu}/u.test(w.t) ? con[g][0].toUpperCase() + con[g].slice(1) : con[g];
        out.push(mark(words, i, i + 1, "error", `${w.t} ${next.t} → ${fix} ${next.t}`, `It's „${sg.gender} ${sg.form}“ (${GENDER_EN[sg.gender]}).`, `${fix} ${next.t}`));
        return;
      }
      // im/am = Wo? (Dativ), ins/ans = Wohin? (Akkusativ)
      const two = TWO_WAY_CONTRACTED[w.lo];
      if (!two) return;
      const wanted = wantedTwoWay(two[0], next.lo, clauseOf.get(i) || [], lex);
      if (!wanted || wanted.want === two[1]) return;
      const { want } = wanted;
      const det = want === "dat" ? DEF_FORM[`dat-${g}`] : DEF_FORM[`acc-${g}`];
      const short = { "in dem": "im", "an dem": "am", "in das": "ins", "an das": "ans" }[`${two[0]} ${det}`];
      const fixWord = short || `${two[0]} ${det}`;
      const fix = /^\p{Lu}/u.test(w.t) ? fixWord[0].toUpperCase() + fixWord.slice(1) : fixWord;
      out.push(mark(words, i, i + 1, wanted.sure ? "error" : "check", `${w.t} ${next.t} → ${fix} ${next.t}`, TWO_WAY_EN[want], `${fix} ${next.t}`));
    }
  });
  for (const c of clauses.flat()) {
    const verb = c.find((wi) => lex.dativeForms.has(words[wi].lo));
    if (verb == null) continue;
    c.forEach((wi, k) => {
      const fix = ACC_TO_DAT[words[wi].lo];
      if (!fix || (k > 0 && ALL_PREPS.has(words[c[k - 1]].lo))) return;
      out.push(mark(words, wi, wi, "error", `${words[wi].t} → ${fix}`, `„${words[verb].t}“ takes the dative: mir, dir, ihm (not mich, dich, ihn).`, fix));
    });
  }
  return out;
};

// round 7 without an article: „gut Wetter“ → „gutes Wetter“, „mit kalte Wasser“ → „kaltem“
const STRONG = {
  "nom-m": "er", "acc-m": "en", "dat-m": "em", "nom-f": "e", "acc-f": "e", "dat-f": "er",
  "nom-n": "es", "acc-n": "es", "dat-n": "em", "nom-pl": "e", "acc-pl": "e", "dat-pl": "en",
};
// before these the adjective has no article of its own (zwei neue Autos)
const COUNT_WORDS = /^(zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|hundert|tausend|viele|einige|mehrere|pro)$/;
const LANGUAGES = /^(deutsch|englisch|französisch|spanisch|italienisch|arabisch|türkisch|russisch)$/; // „Er spricht gut Deutsch“
const strongAdjectiveErrors = (text, words, clauses, lex) => {
  const out = [];
  const starts = new Set(clauses.flat().map((c) => c[0]));
  const isAdj = (k) => words[k] && lex.adjectives.has(words[k].lo) && (/^\p{Ll}/u.test(words[k].t) || starts.has(k));
  words.forEach((w, i) => {
    if (!isAdj(i) || isAdj(i - 1)) return;
    const prev = starts.has(i) ? null : words[i - 1];
    if (prev && (detOf(prev.lo) || (isDeterminer(prev.lo) && !COUNT_WORDS.test(prev.lo)))) return;
    let j = i;
    while (isAdj(j)) j += 1;
    const noun = words[j];
    if (!noun || !/^\p{Lu}/u.test(noun.t) || LANGUAGES.test(noun.lo) || /[,.!?;:\n]/.test(text.slice(words[i].end, noun.start))) return;
    const readings = readingsOf(lex, noun.lo);
    if (!readings.length) return;
    const cases = prev && DAT_PREPS.has(prev.lo) ? ["dat"]
      : prev && ACC_PREPS.has(prev.lo) ? ["acc"]
        : prev && TWO_WAY.has(prev.lo) ? ["dat", "acc"] : ["nom", "acc"];
    const wanted = [...new Set(cases.flatMap((cs) => readings.map((g) => STRONG[`${cs}-${g}`])))];
    // a bare adjective is often an adverb („Ich mache regelmäßig Sport“): only
    // after a preposition or ist/sind is it surely missing its ending
    const surelyAttributive = prev && (ALL_PREPS.has(prev.lo) || /^(ist|sind|war|waren)$/.test(prev.lo));
    for (let a = i; a < j; a += 1) {
      const info = lex.adjectives.get(words[a].lo);
      if (wanted.includes(info.ending)) continue;
      if (!info.ending && !surelyAttributive) continue;
      let fix = inflect(info.base, wanted[0]);
      if (/^\p{Lu}/u.test(words[a].t)) fix = fix[0].toUpperCase() + fix.slice(1);
      out.push(mark(words, a, a, "error", `${words[a].t} → ${fix}`, `No article before „${noun.t}“: the adjective shows the case – -${wanted[0]}${wanted.length > 1 ? ` (or -${wanted.slice(1).join(", -")})` : ""}.`, fix));
    }
  });
  return out;
};

// round 7: „mit dem neue Auto“ → „mit dem neuen Auto“
const adjectiveErrors = (text, words, lex) => words.flatMap((w, i) => {
  const p = phraseAt(text, words, lex, i);
  if (!p || !p.adjs.length) return [];
  const slots = fitting(p);
  if (!slots.length) return [];
  const wanted = [...new Set(slots.map((sl) => adjEnding(p.d, sl)))];
  return p.adjs.flatMap((a) => {
    const info = lex.adjectives.get(words[a].lo);
    if (wanted.includes(info.ending)) return [];
    const fix = inflect(info.base, wanted[0]);
    return [mark(words, a, a, "error", `${words[a].t} → ${fix}`, `After „${w.t}“ + ${words[p.noun].t}: -${wanted[0]}${wanted.length > 1 ? ` (or -${wanted.slice(1).join(", -")})` : ""}.`, fix)];
  });
});

// All rounds' marks for a text: { [roundKey]: [{ start, end, kind, de, en, fix }] }
export const checkText = (text, lex) => {
  const words = wordsOf(text);
  const clauses = clausesOf(text, words);
  return {
    "nomen-gross": nounCaps(words, lex),
    "verb-konjugiert": [...verbAgreement(words, clauses, lex), ...nounSubjects(text, words, clauses, lex), ...participleErrors(words, clauses, lex)],
    "verb-position2": position2(words, clauses, lex),
    "verb-ende": verbAtEnd(words, clauses, lex),
    artikel: [...genderErrors(text, words, clauses, lex), ...articles(text, words, lex)],
    kasus: caseErrors(text, words, clauses, lex),
    "adj-endung": [...adjectiveErrors(text, words, lex), ...strongAdjectiveErrors(text, words, clauses, lex)],
  };
};

// The text cut into pieces for showing one round's marks: [{ t, mark? }]
export const pieces = (text, marks) => {
  const out = [];
  let at = 0;
  for (const m of [...marks].sort((a, b) => a.start - b.start)) {
    if (m.start < at) continue; // overlapping marks: the first wins
    if (m.start > at) out.push({ t: text.slice(at, m.start) });
    out.push({ t: text.slice(m.start, m.end), mark: m });
    at = m.end;
  }
  if (at < text.length) out.push({ t: text.slice(at) });
  return out;
};

// ---- "Das mache ich oft falsch" (the learner's own list) ----
// { ticked: [round keys], own: ["Komma vor dass", …] }
export const weakOrder = (weak) => [
  ...ROUNDS.filter((r) => weak.ticked.includes(r.key)),
  ...ROUNDS.filter((r) => !weak.ticked.includes(r.key)),
];

// lines for an AI request: what the learner often gets wrong
export const weakLines = (weak) => [
  ...ROUNDS.filter((r) => weak.ticked.includes(r.key)).map((r) => r.en),
  ...weak.own,
];

export const readWeak = () => {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEYS.WRITING_WEAK) || "null");
    if (v && Array.isArray(v.ticked) && Array.isArray(v.own)) return v;
  } catch { /* storage off */ }
  return { ticked: [], own: [] };
};
export const saveWeak = (weak) => {
  try { localStorage.setItem(STORAGE_KEYS.WRITING_WEAK, JSON.stringify(weak)); } catch { /* storage off */ }
};

// The request for an AI to correct a free text (✍️ Text prüfen). English
// explanations, German corrections; the learner's weak points first.
export const textCorrectionPrompt = (text, weak) => {
  const lines = weakLines(weak);
  return [
    "I'm learning German (A2, textbook Menschen A2) and wrote this text. Please correct it.",
    "",
    '"""',
    text.trim(),
    '"""',
    "",
    "Check especially: nouns capitalised, verbs conjugated, verb in position 2 in main clauses, verb at the end in subordinate clauses (weil, dass, wenn …), nouns with the right article, cases (dative/accusative), adjective endings.",
    ...(lines.length ? ["I often make these mistakes – look at them first:", ...lines.map((l) => `- ${l}`)] : []),
    "",
    "Give: my mistakes as a table „my text → correct → why“ (why in simple English, A2 level); then the corrected text that keeps my ideas; then one tip for my most frequent mistake.",
  ].join("\n");
};
