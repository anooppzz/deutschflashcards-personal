// 🔍 Fehler-Check (Menschen A2, "Fehler in eigenen Texten finden"): read your
// own text once per kind of mistake, and look for only that one. Five
// rounds; each marks the places in the text for its kind:
//   kind "error" - very likely wrong, with a fix (ich gehen → ich gehe)
//   kind "check" - look here, it may be wrong
// The app only knows its own words (the cards) and their verb forms
// (engine/conjugate.js) - a word it doesn't know is never marked.
// Used by components/TextCheck.jsx (✍️ Text prüfen and DTZ Schreiben).
import { conjugate, formText } from "./conjugate";
import { STORAGE_KEYS } from "../constants";

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
    rule: { de: "Ein Nomen braucht meistens einen Artikel: der/die/das, ein/eine, mein/dein … Ohne Artikel: Plural (Ich kaufe Blumen), Stoffe (Ich trinke Kaffee), Namen.", en: "A noun usually needs an article (der/die/das, ein/eine, mein …). Not needed: plurals in general, things like coffee or water, names." },
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

const PRONOUN_PERSONS = { ich: [0], du: [1], er: [2], es: [2], sie: [2, 5], wir: [3], ihr: [4] };
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
]);

// ---- what the app knows: nouns and verb forms ----

// verbs every text needs, whether or not the app has a card for them
const BASE_VERBS = [
  ["sein", "ist", "war", "ist gewesen"], ["haben", "hat", "hatte", "hat gehabt"], ["werden", "wird", "wurde", "ist geworden"],
  ["wissen", "weiß", "wusste", "hat gewusst"], ["können", "kann", "konnte", "hat gekonnt"], ["müssen", "muss", "musste", "hat gemusst"],
  ["dürfen", "darf", "durfte", "hat gedurft"], ["wollen", "will", "wollte", "hat gewollt"], ["sollen", "soll", "sollte", "hat gesollt"],
  ["mögen", "mag", "mochte", "hat gemocht"], ["möchten", "möchte", "wollte"],
];

// cards: ALL_CARDS; verbForms: VERB_FORMS (card id → forms)
export const buildLexicon = (cards, verbForms) => {
  const nouns = new Map(); // "kaffee" → "Kaffee"
  const notNouns = new Set(FUNCTION_WORDS);
  for (const c of cards) {
    if (c.type === "n") {
      const m = c.front.match(/^(?:der\/die|der|die|das)\s+([\p{Lu}][\p{L}-]*)$/u);
      if (m) nouns.set(m[1].toLowerCase(), m[1]);
    } else {
      for (const w of c.front.replace(/·/g, "").match(WORD) || []) if (!/^\p{Lu}/u.test(w)) notNouns.add(w.toLowerCase());
    }
  }
  // finite verb form → the persons it fits (0 ich … 5 sie/Sie), and the
  // verb's Präsens to suggest the right form
  const persons = new Map();
  const present = new Map();
  const add = (form, i, praes) => {
    const lo = form.toLowerCase();
    if (!persons.has(lo)) persons.set(lo, new Set());
    persons.get(lo).add(i);
    notNouns.add(lo);
    if (praes && !present.has(lo)) present.set(lo, praes);
  };
  const all = [...BASE_VERBS.map(([inf, praes, praet, perf]) => [`base::${inf}`, { praes, praet, perf }]), ...verbForms];
  for (const [id, forms] of all) {
    const c = conjugate(id.slice(id.indexOf("::") + 2), forms);
    if (!c) continue;
    const praesT = c.tenses.find((t) => t.key === "praesens");
    const praes = praesT.rows.map((r) => formText(r.segs).split(" ")[0]);
    for (const t of c.tenses) {
      if (!["praesens", "praeteritum", "konj2"].includes(t.key)) continue;
      t.rows.forEach((r, i) => {
        const words = formText(r.segs).split(" ");
        if (t.key === "konj2" && words.length > 1 && words[0].startsWith("würd")) { add(words[0], i); return; }
        add(words[0], i, praes);
        // a separable verb in a subordinate clause: …, weil ich früh aufstehe
        if (c.particle && words[words.length - 1] === c.particle) add(c.particle + words[0], i);
      });
    }
    for (const t of c.tenses) for (const r of t.rows) for (const w of formText(r.segs).split(" ")) notNouns.add(w.toLowerCase());
  }
  return { nouns, notNouns, persons, present };
};

// ---- the five rounds ----

const mark = (words, from, to, kind, de, en, fix) => ({ start: words[from].start, end: words[to].end, kind, de, en, fix });
const isFinite = (lex, w, first) => lex.persons.has(w.lo) && (first || !/^\p{Lu}/u.test(w.t));

const nounCaps = (words, lex) => words.flatMap((w, i) => {
  if (!/^\p{Ll}/u.test(w.t) || lex.notNouns.has(w.lo)) return [];
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

// All rounds' marks for a text: { [roundKey]: [{ start, end, kind, de, en, fix }] }
export const checkText = (text, lex) => {
  const words = wordsOf(text);
  const clauses = clausesOf(text, words);
  return {
    "nomen-gross": nounCaps(words, lex),
    "verb-konjugiert": verbAgreement(words, clauses, lex),
    "verb-position2": position2(words, clauses, lex),
    "verb-ende": verbAtEnd(words, clauses, lex),
    artikel: articles(text, words, lex),
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
    "Check especially: nouns capitalised, verbs conjugated, verb in position 2 in main clauses, verb at the end in subordinate clauses (weil, dass, wenn …), nouns with an article.",
    ...(lines.length ? ["I often make these mistakes – look at them first:", ...lines.map((l) => `- ${l}`)] : []),
    "",
    "Give: my mistakes as a table „my text → correct → why“ (why in simple English, A2 level); then the corrected text that keeps my ideas; then one tip for my most frequent mistake.",
  ].join("\n");
};
