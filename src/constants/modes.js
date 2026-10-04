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
};

// Tab definitions for the mode switcher: { mode, icon, label, count }.
// Artikel, Cloze, Wortgitter and Formen carry a live count (how many cards in the
// current selection are actually usable for that mode), so the function
// takes all three; the count shows as a small badge, not in the label, so
// every button keeps the same shape. Grammar is deliberately NOT scoped to
// the topic selector - it's a fixed reference, independent of which
// vocabulary topics are currently selected, so it carries no count.
export const MODE_TABS = (articleNounsCount, clozeCount, wordSearchCount, formsCount) => [
  { mode: MODE.CARDS, icon: "🃏", label: "Karten" },
  { mode: MODE.ARTICLE, icon: "🎯", label: "Artikel", count: articleNounsCount },
  { mode: MODE.QUIZ, icon: "📝", label: "Quiz" },
  { mode: MODE.REVERSE, icon: "↔️", label: "Reverse" },
  { mode: MODE.CLOZE, icon: "✏️", label: "Lücke", count: clozeCount },
  { mode: MODE.WORDSEARCH, icon: "🔤", label: "Wortgitter", count: wordSearchCount },
  { mode: MODE.FORMS, icon: "🔁", label: "Formen", count: formsCount },
  { mode: MODE.GRAMMAR, icon: "📖", label: "Grammatik" },
];
