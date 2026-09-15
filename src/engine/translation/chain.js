// Multilingual support - V1 client-side translation engine.
//
// Priority chain, in order - see project conventions: this order is
// deliberate and order-dependent. Reordering or merging steps changes
// correctness, not just performance. DO NOT reorder without explicit
// instruction.
//   1. Manual correction (see "✗ falsch?" in FlipCard/ArticleTrainer) -
//      always wins, since a person said so directly.
//   2. A small, hand-reviewed static table (real content work, not a live
//      guess) - covers the words seeded so far.
//   3. A hard-to-translate guard - slash-separated dual meanings and short
//      idioms/function words are where MyMemory's real test results
//      actually broke (e.g. "than" → a whole unrelated sentence in Hindi).
//      Skip live translation for these rather than risk a confident wrong
//      answer; show English instead.
//   4. A previously-fetched live result (localStorage cache) - so the same
//      word+language never needs a second network round-trip.
//   5. MyMemory's free API - works for both curated and custom languages,
//      same mechanism, no key required.
import { HARD_TRANSLATE_TERMS } from "../../constants";
import { STATIC_TRANSLATIONS } from "../../data";
import { getCorrection } from "./correctionCache";
import { getCachedTranslation, setCachedTranslation } from "./cache";

// Step 3: skip live translation for known-risky phrasing. Evidence-based,
// not theoretical - every category here is something MyMemory's real test
// actually got wrong (e.g. "than" → "then you came" in Hindi). Showing
// English is strictly safer than a confident, fluent-looking wrong answer.
export const isHardToTranslate = (text) =>
  text.includes("/") || HARD_TRANSLATE_TERMS.has(text.trim().toLowerCase());

// Step 5: MyMemory's free translation API. No key, CORS-enabled, callable
// directly from the browser.
export const fetchMyMemory = async (text, lang) => {
  try {
    const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=en|" + lang;
    const res = await fetch(url);
    const data = await res.json();
    return (data && data.responseData && data.responseData.translatedText) || null;
  } catch (e) {
    console.warn("[translate] MyMemory request failed for", lang, ":", e);
    return null;
  }
};

// Translate arbitrary English text into the target language, cached by a
// stable key (usually the card id). Walks the 5-step priority chain above.
export const translateText = async (text, lang, cacheKey) => {
  if (!text || !lang || lang === "en") return text;

  // 1. a manual correction always wins, permanently, over everything below
  const corrected = await getCorrection(cacheKey, lang);
  if (corrected) return corrected;

  // 2. hand-reviewed static table - checked before the live-fetch cache on
  //    purpose, so extending this table later actually overrides an old
  //    cached MyMemory guess, not just future lookups for words never seen before
  const staticEntry = STATIC_TRANSLATIONS[text];
  if (staticEntry && staticEntry[lang]) return staticEntry[lang];

  // 3. known-risky phrasing - don't guess, show English
  if (isHardToTranslate(text)) {
    console.warn("[translate] skipping live translation for a known-hard phrase:", JSON.stringify(text), "-> showing English for", lang);
    return text;
  }

  // 4. a previously-fetched live result, so the same word+language never needs a second network round-trip
  const cached = await getCachedTranslation(cacheKey, lang);
  if (cached) return cached;

  // 5. MyMemory
  const translated = await fetchMyMemory(text, lang);
  if (!translated) {
    console.warn("[translate] no translation available for", JSON.stringify(text), "->", lang, "- showing English instead");
    return text;
  }
  setCachedTranslation(cacheKey, lang, translated);
  return translated;
};
