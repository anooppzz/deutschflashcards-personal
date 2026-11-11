// Tappable grammar words (📖 grammar pages): prepositions, question words,
// short forms (zum, vom …), connectors and directions get their meaning on
// tap, right where they are. The list is hand-written in
// data/grammar/words.json - small words with several meanings, which the
// learner's cards don't explain.
//
// In German text every listed word is a link. In English text (a {de, en}
// explanation shown in English) a word that is also an English word - in,
// an, am, um, links - only links when it is highlighted (**in** + Akk.),
// so "in a building" stays plain English.
import WORDS from "../data/grammar/words.json";

export const GRAMMAR_WORDS = WORDS;

const BY_FORM = new Map();
WORDS.forEach((entry) => [entry.w, ...(entry.forms || [])].forEach((f) => BY_FORM.set(f.toLowerCase(), entry)));

export const grammarWordOf = (word) => BY_FORM.get(String(word).toLowerCase()) || null;

const WORD_RE = /[A-Za-zÄÖÜäöüß]+/g;

// text → [{ text, entry? }]: the listed words carry their entry
// german: the text is German; highlighted: the text is a **highlight**
export const splitGrammarWords = (text, { german = true, highlighted = false } = {}) => {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(WORD_RE)) {
    const entry = grammarWordOf(m[0]);
    if (!entry || (!german && entry.englishWord && !highlighted)) continue;
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[0], entry });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
};
