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
  GRAMMAR: "grammar",
};

// Tab definitions for the mode switcher: [MODE key, display label].
// Artikel, Cloze, and Wortgitter labels include a live count (how many
// cards in the current selection are actually usable for that mode), so
// the function takes all three. Grammar is deliberately NOT scoped to the
// topic selector - it's a fixed reference, independent of which
// vocabulary topics are currently selected, so it carries no count.
export const MODE_TABS = (articleNounsCount, clozeCount, wordSearchCount) => [
  [MODE.CARDS, "🃏 Karten"],
  [MODE.ARTICLE, `🎯 Artikel (${articleNounsCount})`],
  [MODE.QUIZ, "📝 Quiz"],
  [MODE.REVERSE, "↔️ Reverse"],
  [MODE.CLOZE, `✏️ Lücke (${clozeCount})`],
  [MODE.WORDSEARCH, `🔤 Wortgitter (${wordSearchCount})`],
  [MODE.GRAMMAR, "📖 Grammatik"],
];
