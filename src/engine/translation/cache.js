// General live-translation cache (step 4 of the priority chain). Separate
// namespace from the manual-correction cache on purpose - see
// correctionCache.js for why the two must never be collapsed into one store.
import { storage, hashStr } from "../storage";

const translationMemCache = new Map();

// Hash both lang + cacheKey together so an arbitrary typed language name
// (which may contain spaces, accents, etc. - disallowed raw in a storage
// key) is always safe.
const translationKey = (cacheKey, lang) => `tr_${hashStr(lang + "::" + cacheKey)}`;

export const getCachedTranslation = async (cacheKey, lang) => {
  const memKey = lang + "::" + cacheKey;
  if (translationMemCache.has(memKey)) return translationMemCache.get(memKey);
  try {
    const r = await storage.get(translationKey(cacheKey, lang));
    if (r && r.value) {
      translationMemCache.set(memKey, r.value);
      return r.value;
    }
  } catch {}
  return null;
};

export const setCachedTranslation = (cacheKey, lang, value) => {
  translationMemCache.set(lang + "::" + cacheKey, value);
  try { storage.set(translationKey(cacheKey, lang), value); } catch {}
};
