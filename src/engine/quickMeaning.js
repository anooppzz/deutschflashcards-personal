// ⚡ Kurz erklärt: a one-line meaning for a word the search didn't find in
// the app (modes/search/SearchResults.jsx). Uses MyMemory, the free
// translation service the app already uses for card translations (no key,
// browser-friendly). German → English first; if that comes back unchanged,
// the word was probably English, so English → German. Results are kept in
// memory for the session. Only called once the learner stops typing and
// nothing in the app matched.

const MAX_LEN = 80;
const cache = new Map();

const same = (a, b) => a.toLowerCase().replace(/[^\p{L}\d]/gu, "") === b.toLowerCase().replace(/[^\p{L}\d]/gu, "");

// one MyMemory answer → the translation, or null when there is none
export const readMyMemory = (data, q) => {
  if (!data || Number(data.responseStatus) !== 200) return null;
  const text = (data.responseData?.translatedText || "").trim();
  if (!text || /MYMEMORY WARNING|INVALID|QUERY LENGTH/i.test(text) || same(text, q)) return null;
  return text;
};

const ask = async (q, pair, fetchFn) => {
  const res = await fetchFn(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${pair}`);
  return readMyMemory(await res.json(), q);
};

// → { from: "de" | "en", text } · null (nothing found) · throws when offline
export const quickMeaning = async (query, fetchFn = globalThis.fetch) => {
  const q = (query || "").trim().slice(0, MAX_LEN);
  if (q.length < 2) return null;
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const de = await ask(q, "de|en", fetchFn);
  const result = de ? { from: "de", text: de } : await ask(q, "en|de", fetchFn).then((t) => (t ? { from: "en", text: t } : null));
  cache.set(key, result);
  return result;
};

export const clearQuickMeaningCache = () => cache.clear();
