// #D: manual corrections get their OWN store, separate from the general
// live-fetch cache (cache.js) - deliberately, not just for tidiness. If
// corrections shared a slot with live-fetched results, there'd be no way to
// tell "a person fixed this on purpose" apart from "MyMemory guessed this
// once" - which matters once the static table grows over time: a new table
// entry needs to be able to override an old cached MyMemory guess, while a
// person's correction should still be able to override the table itself.
// Two stores, two distinct priorities, no ambiguity.
//
// Hard constraint (see project conventions): manual corrections always win.
// Never collapse this into the general translation cache.
import { storage, hashStr } from "../storage";

const correctionMemCache = new Map();
const correctionKey = (cacheKey, lang) => `corr_${hashStr(lang + "::" + cacheKey)}`;

export const getCorrection = async (cacheKey, lang) => {
  const memKey = lang + "::" + cacheKey;
  if (correctionMemCache.has(memKey)) return correctionMemCache.get(memKey);
  try {
    const r = await storage.get(correctionKey(cacheKey, lang));
    if (r && r.value) {
      correctionMemCache.set(memKey, r.value);
      return r.value;
    }
  } catch (e) {}
  return null;
};

export const submitCorrection = (cacheKey, lang, correctedText) => {
  correctionMemCache.set(lang + "::" + cacheKey, correctedText);
  try { storage.set(correctionKey(cacheKey, lang), correctedText); } catch (e) {}
};
