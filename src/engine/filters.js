// Global level (A1/A2) and source (book · chapter) filtering. These are
// crosscutting facets, not a navigation hierarchy - a card's topic, level,
// and source are independent axes (see project conversation history for
// the reasoning). This module intersects all three against a card.

// All distinct levels present in a set of cards, in a fixed sensible order.
export const distinctLevels = (cards) => {
  const present = new Set(cards.map((c) => c.level).filter(Boolean));
  return ["A1", "A2"].filter((l) => present.has(l));
};

// A card's sources: its own `source` plus the books whose word lists
// name it (data/lists, see data/index.js sourcesOf) - one card can come
// from two books ("Menschen A2 · Einheit 7" and "Grammatik aktiv").
export const cardSources = (card) => card.sources || (card.source ? [card.source] : []);

// The source chip for cards without any source (most older chapters).
export const NO_SOURCE = "";

// All distinct sources present in a set of cards, sorted for stable chip
// ordering, plus NO_SOURCE last when some cards have none - so "only
// Grammatik aktiv" inside an older, untagged chapter is possible. Only
// meaningful once 2+ values exist - the UI layer decides whether to render
// this row at all.
export const distinctSources = (cards) => {
  const present = new Set(cards.flatMap(cardSources));
  const untagged = cards.some((c) => cardSources(c).length === 0);
  return [...[...present].sort(), ...(untagged ? [NO_SOURCE] : [])];
};

// A card passes the level filter if its level is in the active set. Follows
// the same convention as every other filter in this app (see
// CategoryFilter): the active set defaults to "everything selected", and
// deselecting a chip actively excludes that value - it does not mean
// "unrestricted". Consistent, predictable behavior across all filter rows.
export const passesLevelFilter = (card, levelFilter) =>
  !card.level || levelFilter.includes(card.level);

// A card passes the source filter if ANY of its sources is selected; a card
// without a source passes while the NO_SOURCE chip is on (it is on by
// default, as every chip is).
export const passesSourceFilter = (card, sourceFilter) => {
  const sources = cardSources(card);
  return sources.length ? sources.some((s) => sourceFilter.includes(s)) : sourceFilter.includes(NO_SOURCE);
};

export const passesGlobalFilters = (card, levelFilter, sourceFilter) =>
  passesLevelFilter(card, levelFilter) && passesSourceFilter(card, sourceFilter);
