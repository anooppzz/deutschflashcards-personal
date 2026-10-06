import { shuffled } from "../../engine/sampling";
import { idOf } from "../../engine/fsrs";

// 🧩 Satzbau: put the words of a card's example sentence back in order.
// The first word is given (German often allows a different first part -
// "Heute gehe ich …" / "Ich gehe heute …" - so fixing it keeps one right
// answer); the rest are shuffled chips. Practises verb position: verb second,
// verb at the end after weil/dass/wenn, the Perfekt bracket.

export const MIN_WORDS = 4;
export const MAX_WORDS = 10;

// "Ich habe den Bus genommen." -> { words: ["Ich", "habe", "den", "Bus", "genommen"], end: "." }
export const tokenizeSentence = (sentence) => {
  const s = (sentence || "").trim();
  const m = s.match(/^(.*?)([.!?]*)$/);
  const words = m[1].split(/\s+/).filter(Boolean);
  return { words, end: m[2] || "" };
};

// Sentences with one clear word order and a sensible length; no gaps,
// alternatives, quotes or brackets.
export const isSatzbauSentence = (sentence) => {
  if (!sentence || /[…/()„“"«»:;–]/.test(sentence)) return false;
  const { words } = tokenizeSentence(sentence);
  return words.length >= MIN_WORDS && words.length <= MAX_WORDS;
};

// One item per distinct example sentence in the selection.
export const buildSatzbauPool = (cards) => {
  const seen = new Set();
  const pool = [];
  for (const c of cards) {
    const s = c.example && c.example.trim();
    if (!isSatzbauSentence(s) || seen.has(s)) continue;
    seen.add(s);
    const { words, end } = tokenizeSentence(s);
    pool.push({ id: idOf(c.deck, c.front), deck: c.deck, front: c.front, sentence: s, en: c.exampleEn || "", words, end });
  }
  return pool;
};

// The chips to arrange: every word but the first, shuffled so that the
// order on screen is never already the answer.
export const chipsFor = (item, shuffle = shuffled) => {
  const rest = item.words.slice(1);
  if (new Set(rest).size < 2) return rest;
  let out = shuffle(rest);
  for (let i = 0; i < 5 && out.join(" ") === rest.join(" "); i++) out = shuffle(rest);
  if (out.join(" ") === rest.join(" ")) out = [...rest.slice(1), rest[0]];
  return out;
};

// Same words in the same order (identical words are interchangeable).
export const isCorrectOrder = (item, arranged) => arranged.join(" ") === item.words.slice(1).join(" ");

export const SATZBAU_ROUND = 10;
export const buildSatzbauRound = (pool, n = SATZBAU_ROUND) => shuffled(pool).slice(0, n);
