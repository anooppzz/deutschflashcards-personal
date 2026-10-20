// Single entry point for all vocabulary + translation data. App.jsx (and
// any future mode) imports from here rather than reaching into individual
// JSON files, so the wiring between "deck key" -> "data array" lives in
// exactly one place.
import IRREGULAR_VERBS from "./decks/irregular-verbs.json";
import INSEPARABLE_VERBS from "./decks/inseparable-verbs.json";
import HAUSHALT from "./decks/haushalt.json";
import VERKEHR from "./decks/verkehr.json";
import KLEIDUNG from "./decks/kleidung.json";
import EXTRA_TOPICS from "./decks/extra-topics.json";
import DECK_META from "./decks/_deck-manifest.json";
import STATIC_TRANSLATIONS from "./translations/static-table.json";
import GRAMMAR_TOPICS from "./grammar/topics.json";
import GRAMMAR_EXERCISES from "./grammar/exercises.json";
import READING_TEXTS from "./reading/texts.json";
import DTZ_SETS from "./exam/dtz-sets.json";
import DTZ_WRITING from "./exam/dtz-schreiben.json";
import DTZ_SPEAKING from "./exam/dtz-sprechen.json";
import CHUNK_SETS from "./speaking/chunks.json";
import WORD_LISTS from "./lists/lists.json";

export {
  IRREGULAR_VERBS,
  INSEPARABLE_VERBS,
  HAUSHALT,
  VERKEHR,
  KLEIDUNG,
  EXTRA_TOPICS,
  DECK_META,
  STATIC_TRANSLATIONS,
  GRAMMAR_TOPICS,
  GRAMMAR_EXERCISES,
  READING_TEXTS,
  DTZ_SETS,
  DTZ_WRITING,
  DTZ_SPEAKING,
  CHUNK_SETS,
  WORD_LISTS,
};

// Deck registry for the multi-topic (combined) mode - maps each deck key to
// its underlying data array. This is wiring, not data, so it stays as code
// rather than JSON: it composes the imports above rather than duplicating them.
export const DECK_SOURCE = {
  kleidung: KLEIDUNG,
  verkehr: VERKEHR,
  haushalt: HAUSHALT,
  irregular: IRREGULAR_VERBS,
  inseparable: INSEPARABLE_VERBS,
};

export const EXTRA_KEYS = EXTRA_TOPICS.map((t) => t.key);
export const EXTRA_BY_KEY = Object.fromEntries(EXTRA_TOPICS.map((t) => [t.key, t]));

// 📋 Word lists from other books (data/lists/lists.json): each row names
// existing cards by id ("deck::front"), so a list is a way to fetch words
// from wherever they live - never a copy. Studying a list trains the same
// cards (and progress) as their chapters; the list's book is added to each
// named card's sources, so the source filter finds them in every chapter.
// The first id of a row is the card the list studies.
export const LIST_BY_KEY = Object.fromEntries(WORD_LISTS.map((l) => [l.key, l]));
const LIST_SOURCES = new Map();
WORD_LISTS.forEach((l) => l.rows.forEach((r) => r.cards.forEach((id) => {
  LIST_SOURCES.set(id, [...new Set([...(LIST_SOURCES.get(id) || []), l.source])]);
})));
// every source of a card: its own `source` first, then the books of its lists
export const sourcesOf = (deck, front, source) => {
  const extra = LIST_SOURCES.get(`${deck}::${front}`);
  if (!extra) return source ? [source] : [];
  return [...new Set([source, ...extra].filter(Boolean))];
};

// Every card in the app, across ALL decks and topics, in one flat shape:
// { deck, front, type, gender?, english, sub?, grammar?, example?,
// exampleEn?, note?, level?, source?, sources }. The irregular and inseparable decks
// get the same `sub` text their cards display. Used to link cards to grammar
// topics (both directions, see engine/grammarLinks.js) and for the app-wide
// search, which shows each result as a full card.
const details = (c) => ({ example: c.example, exampleEn: c.exampleEn, note: c.note, level: c.level, source: c.source });
const ALL_CARDS_RAW = [
  ...IRREGULAR_VERBS.map((v) => ({ deck: "irregular", front: v.infinitiv, type: "v", english: v.english, sub: `${v.präteritum} · ${v.hilfsverb} ${v.partizip}`, grammar: v.grammar, ...details(v) })),
  ...INSEPARABLE_VERBS.map((v) => ({ deck: "inseparable", front: v.infinitiv, type: "v", english: v.english, sub: `hat ${v.partizip}`, grammar: v.grammar, ...details(v), note: v.tip })),
  ...[["haushalt", HAUSHALT], ["verkehr", VERKEHR], ["kleidung", KLEIDUNG]].flatMap(([deck, cards]) =>
    cards.map((w) => ({ deck, front: w.front, type: w.type, gender: w.gender, english: w.english, sub: w.sub, grammar: w.grammar, ...details(w) }))),
  ...EXTRA_TOPICS.flatMap((t) => t.cards.map((c) => ({ deck: t.key, front: c.front, type: c.type, gender: c.gender, english: c.english, sub: c.sub, grammar: c.grammar, ...details(c) }))),
];
export const ALL_CARDS = ALL_CARDS_RAW.map((c) => ({ ...c, sources: sourcesOf(c.deck, c.front, c.source) }));

// A flat index of every single vocabulary word in the app - {front,
// english, deck} - spanning ALL decks and ALL topics, not just whatever's
// currently selected. Computed once at module load since it doesn't depend
// on any component state. Exists specifically so Cloze mode can tell the
// difference between "you typed nonsense" and "you typed a real German
// word you learned elsewhere, just not the one this sentence uses" - see
// modes/cloze/buildRound.js's findAlternateWordMatch.
export const ALL_WORDS = ALL_CARDS.map(({ front, english, deck }) => ({ front, english, deck }));
