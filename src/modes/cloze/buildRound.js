// Cloze deletion: blank the target word out of its OWN example sentence.
// Reuses the example-sentence data already authored for every deck rather
// than needing new content - see project conversation history.
//
// The hard part is finding WHERE the word actually appears in the
// sentence, since `front` isn't always the literal string that shows up:
// nouns carry an article prefix ("die Banane" vs. "Banane" in the
// sentence), separable verbs use a middot ("an·bieten"), some verbs are
// conjugated differently than their infinitive ("kaufen" -> "kauft"),
// and a few entries are full idiomatic phrases. Rather than guess wrong
// and show a broken blank, a card that can't be confidently matched is
// simply EXCLUDED from the Cloze pool - fewer cards, but every one that
// appears is trustworthy.
import { STORAGE_KEYS, ROUND_SIZE } from "../../constants";
import { storage, idOf, weightedSample, shuffled, validateGermanWord, bareForm } from "../../engine";

// A regular verb's infinitive stem (strip -en or -n) - used to catch
// conjugated forms like "kauft"/"kaufe" from the infinitive "kaufen"
// without needing a full conjugation table. Deliberately conservative:
// only used as a fallback, and only for words long enough that a 3+
// letter stem match is meaningfully specific rather than coincidental.
const verbStem = (word) => {
  if (word.length < 5) return null;
  if (word.endsWith("en")) return word.slice(0, -2);
  if (word.endsWith("n")) return word.slice(0, -1);
  return null;
};

// Find the exact span of the target word within the example sentence.
// Returns { matched: "the literal text found in the sentence", index } or
// null if nothing confident was found. Tries, in order: the bare form as a
// whole-word literal match, then (for likely verbs) a stem-based match
// against individual words in the sentence.
export const findClozeSpan = (front, example) => {
  if (!front || !example) return null;
  const bare = bareForm(front);
  if (!bare) return null;
  // A front that ends like a sentence ("Achtung!", "Ich komme gleich.") is a
  // whole phrase - typing it back, punctuation included, isn't a gap-fill.
  if (/[.!?]$/.test(bare)) return null;

  // 1. literal whole-word match (handles nouns, adjectives, most phrases).
  //    Word edges are Unicode-aware: JavaScript's \b only knows A-Z, so it
  //    never matched words starting or ending in Ä/Ö/Ü/ß (das Öl, groß).
  const escaped = bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const literalRe = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "iu");
  const literalMatch = example.match(literalRe);
  if (literalMatch) return { matched: literalMatch[0], index: literalMatch.index };

  // 2. stem match against each word in the sentence (handles conjugated
  //    regular verbs whose infinitive doesn't appear literally)
  const stem = verbStem(bare);
  if (stem) {
    const wordRe = /[A-Za-zÄÖÜäöüß]+/g;
    let m;
    while ((m = wordRe.exec(example))) {
      if (m[0].toLowerCase().startsWith(stem.toLowerCase()) && m[0].length >= stem.length) {
        return { matched: m[0], index: m.index };
      }
    }
  }
  return null;
};

// Build the display sentence with the match replaced by a blank, plus the
// text that was actually removed (what the person needs to type back).
export const buildCloze = (card) => {
  const span = findClozeSpan(card.front, card.example);
  if (!span) return null;
  const before = card.example.slice(0, span.index);
  const after = card.example.slice(span.index + span.matched.length);
  return {
    ...card,
    clozeBefore: before,
    clozeAfter: after,
    clozeAnswer: span.matched,
  };
};

// The usable pool: every card with an example sentence AND a confident
// cloze match. Computed once per selection change, not per round, since
// it only depends on the underlying cards, not on progress/shuffling.
export const buildClozePool = (cards) =>
  cards.map(buildCloze).filter(Boolean);

// Round builder - same never-seen-first + weighted-sampling shape as
// Article/Reverse mode, for consistency across the app.
export const buildClozeRound = (pool, progress, n) => {
  const neverSeen = pool.filter((c) => !progress[idOf(c.deck, c.front)]);
  const rest = pool.filter((c) => progress[idOf(c.deck, c.front)]);
  if (neverSeen.length >= n) return shuffled(neverSeen).slice(0, n);
  const filled = weightedSample(rest, Math.min(n - neverSeen.length, rest.length), progress);
  return shuffled([...neverSeen, ...filled]);
};

export const saveClozeSizePref = (v) => {
  try { storage.set(STORAGE_KEYS.CLOZE_SIZE, JSON.stringify(v)); } catch {}
};

export const resolveClozeRoundSize = (pref, poolLen) => {
  if (pref === "all") return poolLen;
  if (pref === "auto" || pref == null) return Math.min(ROUND_SIZE, poolLen);
  return Math.min(pref, poolLen);
};

// ---- Grading nuance (see project conversation history for the full
// design discussion: strict-by-default recall practice, with two
// deliberate, bounded exceptions rather than a blanket loosening) ----

// Tier 2: a card can optionally declare acceptableAlternates - genuine
// synonyms (mostly regional variants already curated elsewhere in the
// data's `sub` field, e.g. "CH: Couch" for Sofa) that should ALSO grade
// as correct. This is a curated exception list, not "accept anything
// plausible": most cards have none, and that's the intended default.
// Cloze mode's job is recalling THIS specific word, not producing any
// grammatically valid German sentence - a real synonym is the one
// deliberate exception to that, not a general loosening of grading.
export const isClozeCorrect = (input, card) => {
  if (validateGermanWord(input, card.clozeAnswer)) return true;
  if (Array.isArray(card.acceptableAlternates)) {
    return card.acceptableAlternates.some((alt) => validateGermanWord(input, alt));
  }
  return false;
};

// Tier 1: when an answer is graded wrong, check whether it's actually a
// REAL German word from somewhere else in the app - not gibberish, just
// the wrong word for this particular sentence (e.g. typing "Hemd" for a
// sentence that uses "T-Shirt" - both real, different garments). This
// does NOT change the score; it only lets the feedback screen say
// something more specific than a flat "wrong" when that's genuinely what
// happened. `allWords` should be the full cross-deck index (see
// data/index.js's ALL_WORDS), not just the current topic selection - the
// person may have learned the word elsewhere in the app.
export const findAlternateWordMatch = (input, allWords) => {
  if (!input || !input.trim() || !Array.isArray(allWords)) return null;
  return allWords.find((w) => validateGermanWord(input, bareForm(w.front))) || null;
};
