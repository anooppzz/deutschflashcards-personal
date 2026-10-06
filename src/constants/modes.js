// Training mode identifiers. Every mode === "..." comparison in the app
// should reference this object instead of a raw string literal - it's the
// single source of truth for what modes exist and prevents typos silently
// breaking a comparison (e.g. "article" vs "artikel").
export const MODE = {
  CARDS: "cards",
  ARTICLE: "article",
  QUIZ: "quiz",
  REVERSE: "reverse",
  CLOZE: "cloze",
  WORDSEARCH: "wordsearch",
  FORMS: "forms",
  GRAMMAR: "grammar",
  SATZBAU: "satzbau",
  READING: "reading",
};

// Tab definitions for the mode switcher: { mode, icon, label, count }.
// Modes that only use part of the selection (Artikel: nouns, Lücke, Wortgitter,
// Formen, Satzbau: usable sentences, Lesen: texts) carry a live count for the
// current selection; it shows as a small corner badge, not in the label, so
// every button keeps the same shape. Grammar is deliberately NOT scoped to
// the topic selector - it's a fixed reference, independent of which
// vocabulary topics are currently selected, so it carries no count.
export const MODE_TABS = (counts = {}) => [
  { mode: MODE.CARDS, icon: "🃏", label: "Karten" },
  { mode: MODE.ARTICLE, icon: "🎯", label: "Artikel", count: counts.article },
  { mode: MODE.QUIZ, icon: "📝", label: "Quiz" },
  { mode: MODE.REVERSE, icon: "↔️", label: "Reverse" },
  { mode: MODE.CLOZE, icon: "✏️", label: "Lücke", count: counts.cloze },
  { mode: MODE.WORDSEARCH, icon: "🔤", label: "Wortgitter", count: counts.wordsearch },
  { mode: MODE.FORMS, icon: "🔁", label: "Formen", count: counts.forms },
  { mode: MODE.SATZBAU, icon: "🧩", label: "Satzbau", count: counts.satzbau },
  { mode: MODE.READING, icon: "📰", label: "Lesen", count: counts.reading },
  { mode: MODE.GRAMMAR, icon: "📖", label: "Grammatik" },
];
