// Round-building logic for Article (der/die/das) mode: how many nouns per
// round, which ones, and in what order. Kept separate from ArticleTrainer's
// rendering so the selection algorithm can be reasoned about (and tested)
// independently of any JSX.
import { STORAGE_KEYS, ROUND_SIZE, ARTICLE_FULL_THRESHOLD } from "../../constants";
import { storage, idOf, weightedSample, shuffled } from "../../engine";

// A10: only truncate a round when the pool is meaningfully bigger than one
// round - a small deck (e.g. 18 nouns) should just run in full rather than
// arbitrarily losing a few words to a cap that barely shortens anything.
const articleRoundSize = (poolLen) => (poolLen <= ARTICLE_FULL_THRESHOLD ? poolLen : ROUND_SIZE);

// A11: never-studied nouns are guaranteed a slot before weighted sampling
// fills the rest - otherwise a brand-new word can get unlucky and sit out
// of several rounds in a row purely by chance.
export const buildArticleRound = (nouns, progress, n) => {
  const neverSeen = nouns.filter((c) => !progress[idOf(c.deck, c.front)]);
  const rest = nouns.filter((c) => progress[idOf(c.deck, c.front)]);
  if (neverSeen.length >= n) return shuffled(neverSeen).slice(0, n);
  const filled = weightedSample(rest, Math.min(n - neverSeen.length, rest.length), progress);
  return shuffled([...neverSeen, ...filled]); // shuffle so new words aren't always first in the round
};

// A13: when multiple topics are selected, give every represented deck a fair,
// adaptively-recomputed share of the round instead of letting one big or
// heavily-overdue deck crowd a smaller one out entirely. Falls back to the
// plain builder above when only one deck is actually present.
export const buildArticleRoundStratified = (nouns, progress, n) => {
  const decks = [...new Set(nouns.map((c) => c.deck))];
  if (decks.length <= 1) return buildArticleRound(nouns, progress, n);
  let decksLeft = shuffled(decks); // randomize order so no deck is systematically favored or shortchanged
  let remaining = n;
  let pool = [...nouns];
  const result = [];
  while (decksLeft.length && remaining > 0) {
    const d = decksLeft[0];
    decksLeft = decksLeft.slice(1);
    const share = Math.max(1, Math.ceil(remaining / (decksLeft.length + 1))); // fair split of what's left
    const deckNouns = pool.filter((c) => c.deck === d);
    const take = Math.min(share, deckNouns.length, remaining);
    if (take > 0) {
      const picked = buildArticleRound(deckNouns, progress, take);
      result.push(...picked);
      pool = pool.filter((c) => !picked.includes(c));
      remaining -= picked.length;
    }
  }
  if (remaining > 0 && pool.length) result.push(...buildArticleRound(pool, progress, Math.min(remaining, pool.length)));
  return shuffled(result);
};

// A14: let the person override the automatic round-size behaviour
export const saveArticleSizePref = (v) => {
  try { storage.set(STORAGE_KEYS.ARTICLE_SIZE, JSON.stringify(v)); } catch {}
};

export const resolveArticleRoundSize = (pref, poolLen) => {
  if (pref === "all") return poolLen;
  if (pref === "auto" || pref == null) return articleRoundSize(poolLen);
  return Math.min(pref, poolLen);
};

export const articleSizeLabel = (pref) => (pref === "auto" ? "Auto" : pref === "all" ? "Alle" : String(pref));
