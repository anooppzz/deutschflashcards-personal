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

// Every card in the app, across ALL decks and topics, in one flat shape:
// { deck, front, type, gender?, english, sub?, grammar? }. The irregular and
// inseparable decks get the same `sub` text their cards display. Used to
// link cards to grammar topics (both directions) - see engine/grammarLinks.js.
export const ALL_CARDS = [
  ...IRREGULAR_VERBS.map((v) => ({ deck: "irregular", front: v.infinitiv, type: "v", english: v.english, sub: `${v.präteritum} · ${v.hilfsverb} ${v.partizip}`, grammar: v.grammar })),
  ...INSEPARABLE_VERBS.map((v) => ({ deck: "inseparable", front: v.infinitiv, type: "v", english: v.english, sub: `hat ${v.partizip}`, grammar: v.grammar })),
  ...[["haushalt", HAUSHALT], ["verkehr", VERKEHR], ["kleidung", KLEIDUNG]].flatMap(([deck, cards]) =>
    cards.map((w) => ({ deck, front: w.front, type: w.type, gender: w.gender, english: w.english, sub: w.sub, grammar: w.grammar }))),
  ...EXTRA_TOPICS.flatMap((t) => t.cards.map((c) => ({ deck: t.key, front: c.front, type: c.type, gender: c.gender, english: c.english, sub: c.sub, grammar: c.grammar }))),
];

// A flat index of every single vocabulary word in the app - {front,
// english, deck} - spanning ALL decks and ALL topics, not just whatever's
// currently selected. Computed once at module load since it doesn't depend
// on any component state. Exists specifically so Cloze mode can tell the
// difference between "you typed nonsense" and "you typed a real German
// word you learned elsewhere, just not the one this sentence uses" - see
// modes/cloze/buildRound.js's findAlternateWordMatch.
export const ALL_WORDS = ALL_CARDS.map(({ front, english, deck }) => ({ front, english, deck }));
