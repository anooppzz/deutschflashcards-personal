// Cache for AI-generated example sentences. Kept as a passive read-only
// cache for V1 (zero-backend choice: there's no key to safely call
// Anthropic's API from a publicly hosted static page with). Cards with a
// hand-written static example still show it instantly; cards without one
// show a plain "no example available" note instead of an active button
// that could only ever fail.
import { storage, hashStr } from "../storage";

const aiExampleMemCache = new Map(); // in-memory, instant within this session
const aiExampleKey = (cardId) => `aiex_${hashStr(cardId)}`;

export const getCachedAiExample = async (cardId) => {
  if (!cardId) return null;
  if (aiExampleMemCache.has(cardId)) return aiExampleMemCache.get(cardId);
  try {
    const r = await storage.get(aiExampleKey(cardId));
    if (r && r.value) {
      const parsed = JSON.parse(r.value);
      aiExampleMemCache.set(cardId, parsed);
      return parsed;
    }
  } catch {}
  return null;
};
