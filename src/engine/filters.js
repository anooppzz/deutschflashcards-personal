// Global level (A1/A2) and source (book · chapter) filtering. These are
// crosscutting facets, not a navigation hierarchy - a card's topic, level,
// and source are independent axes (see project conversation history for
// the reasoning). This module intersects all three against a card.

// All distinct levels present in a set of cards, in a fixed sensible order.
export const distinctLevels = (cards) => {
  const present = new Set(cards.map((c) => c.level).filter(Boolean));
  return ["A1", "A2"].filter((l) => present.has(l));
};

// All distinct source strings present in a set of cards, sorted for stable
// chip ordering. Only meaningful once 2+ distinct values exist - the UI
// layer decides whether to render this row at all.
export const distinctSources = (cards) => {
  const present = new Set(cards.map((c) => c.source).filter(Boolean));
  return [...present].sort();
};

// A card passes the level filter if its level is in the active set. Follows
// the same convention as every other filter in this app (see
// CategoryFilter): the active set defaults to "everything selected", and
// deselecting a chip actively excludes that value - it does not mean
// "unrestricted". Consistent, predictable behavior across all filter rows.
export const passesLevelFilter = (card, levelFilter) =>
  !card.level || levelFilter.includes(card.level);

// A card passes the source filter the same way. Cards with no source
// (the majority right now, predating source-tracking) always pass - a
// person filtering by level shouldn't lose untagged cards as a side
// effect. Only selecting a SPECIFIC source chip should narrow to that
// chapter; that's handled by the source row only offering real source
// values as chips, never an "untagged" option.
export const passesSourceFilter = (card, sourceFilter) =>
  !card.source || sourceFilter.includes(card.source);

export const passesGlobalFilters = (card, levelFilter, sourceFilter) =>
  passesLevelFilter(card, levelFilter) && passesSourceFilter(card, sourceFilter);
