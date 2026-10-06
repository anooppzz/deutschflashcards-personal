// 🤖 KI-Assistent: ask an AI about a card or a grammar topic inside the app.
// It is OFF by default and only does anything once the learner switches it on
// and enters their own API key. Two providers:
// - Gemini (Google): free tier with daily limits; Google may use free-tier
//   prompts to improve its products. Called with plain fetch (Google's REST API).
// - Claude (Anthropic): prepaid, pay per question. Called with the official
//   SDK, loaded only when the first question is sent.
// The settings live under DEVICE_ONLY_KEYS.AI: on this phone only, never in
// the code, the repo or the backup file. The API keys inside are encrypted
// (engine/aiVault.js: password and/or fingerprint). The app calls the
// provider straight from the browser - there is no server in between.
import { DEVICE_ONLY_KEYS } from "../constants";

export const PROVIDERS = { GEMINI: "gemini", CLAUDE: "claude" };

// Prices in US$ per million tokens (input / output). est = a typical short
// answer (≈500 tokens in, ≈900 out incl. thinking), for the settings screen.
export const CLAUDE_MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", note: "beste Erklärungen", in: 4, out: 20, effort: true, fallbacks: true },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "gut und halb so teuer", in: 2, out: 10, effort: true, fallbacks: true },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", note: "am günstigsten", in: 1, out: 5 },
];
export const DEFAULT_CLAUDE_MODEL = CLAUDE_MODELS[0].id;

// "-latest" names follow Google's newest model of that kind, so they keep
// working when Google retires a version. The free daily limit differs per
// model: if one is used up, switch to the other.
export const GEMINI_MODELS = [
  { id: "gemini-flash-latest", label: "Gemini Flash", note: "kostenlos (Tageslimit)" },
  { id: "gemini-flash-lite-latest", label: "Gemini Flash-Lite", note: "kostenlos, höheres Tageslimit" },
];
export const DEFAULT_GEMINI_MODEL = GEMINI_MODELS[0].id;

export const KEY_PAGES = {
  [PROVIDERS.GEMINI]: "https://aistudio.google.com/apikey",
  [PROVIDERS.CLAUDE]: "https://console.anthropic.com/settings/keys",
};

// a conversation is capped so a forgotten chat can't keep growing the bill
export const MAX_QUESTIONS = 10;
const MAX_TOKENS = 8000;

export const defaultAiSettings = () => ({
  enabled: false,
  provider: PROVIDERS.GEMINI,
  models: { [PROVIDERS.GEMINI]: DEFAULT_GEMINI_MODEL, [PROVIDERS.CLAUDE]: DEFAULT_CLAUDE_MODEL },
  vault: null, // encrypted keys (engine/aiVault.js)
  legacyKeys: null, // plain keys saved before the vault existed - to be locked away
});

const isVault = (v) => Boolean(v && v.v === 1 && v.data?.ct && v.pin?.ct && v.hints && typeof v.hints === "object");

// Reads the settings, filling in anything missing or broken with the
// defaults (so a damaged entry means "off", never a crash).
export const loadAiSettings = (store = globalThis.localStorage) => {
  const d = defaultAiSettings();
  let saved = null;
  try { saved = JSON.parse(store.getItem(DEVICE_ONLY_KEYS.AI) || "null"); } catch { saved = null; }
  if (!saved || typeof saved !== "object") return d;
  const provider = Object.values(PROVIDERS).includes(saved.provider) ? saved.provider : d.provider;
  const str = (v, fallback) => (typeof v === "string" && v.trim() ? v.trim() : fallback);
  return {
    enabled: saved.enabled === true,
    provider,
    models: {
      [PROVIDERS.GEMINI]: str(saved.models?.[PROVIDERS.GEMINI], d.models[PROVIDERS.GEMINI]),
      [PROVIDERS.CLAUDE]: CLAUDE_MODELS.some((m) => m.id === saved.models?.[PROVIDERS.CLAUDE]) ? saved.models[PROVIDERS.CLAUDE] : d.models[PROVIDERS.CLAUDE],
    },
    vault: isVault(saved.vault) ? saved.vault : null,
    legacyKeys: legacyOf(saved, str),
  };
};

// plain keys from before the vault (first version stored "keys" in clear)
const legacyOf = (saved, str) => {
  if (isVault(saved.vault)) return null;
  const keys = { [PROVIDERS.GEMINI]: str(saved.keys?.[PROVIDERS.GEMINI], ""), [PROVIDERS.CLAUDE]: str(saved.keys?.[PROVIDERS.CLAUDE], "") };
  return keys[PROVIDERS.GEMINI] || keys[PROVIDERS.CLAUDE] ? keys : null;
};

// Only these fields are written: once a vault exists, no plain key is saved.
export const saveAiSettings = (settings, store = globalThis.localStorage) => {
  const { enabled, provider, models, vault, legacyKeys } = settings;
  const out = { enabled, provider, models, vault: vault || null, ...(!vault && legacyKeys ? { keys: legacyKeys } : {}) };
  try { store.setItem(DEVICE_ONLY_KEYS.AI, JSON.stringify(out)); } catch { /* storage blocked: the settings last until reload */ }
};

// on, and a locked-away key for the chosen provider (unlocking comes later)
export const aiReady = (s) => Boolean(s?.enabled && s.vault?.hints?.[s.provider]);
export const claudeModel = (id) => CLAUDE_MODELS.find((m) => m.id === id) || CLAUDE_MODELS[0];
export const modelLabel = (s) => (s.provider === PROVIDERS.CLAUDE
  ? claudeModel(s.models[PROVIDERS.CLAUDE]).label
  : GEMINI_MODELS.find((m) => m.id === s.models[PROVIDERS.GEMINI])?.label || s.models[PROVIDERS.GEMINI]);

// US$ for one answer from its token usage
export const claudeCost = (modelId, usage) => {
  if (!usage) return 0;
  const m = claudeModel(modelId);
  return ((usage.input_tokens || 0) * m.in + (usage.output_tokens || 0) * m.out) / 1e6;
};
export const typicalCost = (m) => (500 * m.in + 900 * m.out) / 1e6;
// "1.4 US-ct" below a dollar (most answers), "$1.20" above
export const formatUsd = (usd) => {
  if (usd < 0.001) return "< 0.1 US-ct";
  return usd < 1 ? `${(usd * 100).toFixed(1)} US-ct` : `$${usd.toFixed(2)}`;
};

export const SYSTEM_PROMPT = [
  "You are a friendly German tutor inside a flashcard app.",
  "The learner is at level A2 (textbook Menschen A2) and is preparing for the DTZ exam (Deutsch-Test für Zuwanderer, A2–B1).",
  "Explain in simple English. Give German examples with English translations.",
  "Keep answers short and clear: about 200 words unless the learner asks for more.",
  "Format with simple Markdown only: **bold**, bullet lists, short headings, small tables of at most 3 columns.",
  "If the learner writes German with mistakes, correct it kindly and explain why.",
].join(" ");

// Ready-made questions for the chat; the first one is the full explanation
// (engine/lookup.js), the others build on it.
export const followUps = (kind) => (kind === "topic"
  ? ["Gib mir 5 neue Übungssätze mit Lösungen.", "Erkläre es noch einfacher.", "Wie kommt das in der DTZ-Prüfung vor?"]
  : ["Gib mir 3 weitere Beispielsätze.", "Wie benutze ich das im Gespräch (DTZ Sprechen)?", "Welche Wörter gehören dazu?"]);

// ---- Claude (Anthropic SDK) ----

// Opus/Sonnet 5.5: effort "low" for quick chat answers (their default is
// "medium"); Haiku 4.5 has no effort setting. Server-side fallbacks: if the
// model is overloaded or declines, Anthropic's default backup model answers.
export const claudeParams = (modelId, system, messages) => {
  const m = claudeModel(modelId);
  return {
    model: m.id,
    max_tokens: MAX_TOKENS,
    system,
    messages,
    ...(m.effort ? { output_config: { effort: "low" } } : {}),
    ...(m.fallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
  };
};

const claudeError = (Anthropic, e) => {
  if (e instanceof Anthropic.APIUserAbortError) return null;
  if (e instanceof Anthropic.AuthenticationError) return "Der Claude-Schlüssel ist ungültig. Prüfe ihn in den KI-Einstellungen.";
  if (e instanceof Anthropic.PermissionDeniedError) return "Dieser Claude-Schlüssel darf das Modell nicht benutzen.";
  if (e instanceof Anthropic.RateLimitError) return "Zu viele Fragen in kurzer Zeit. Warte eine Minute.";
  if (e instanceof Anthropic.APIConnectionError) return "Keine Verbindung zu Claude. Bist du online?";
  if (e instanceof Anthropic.APIError) {
    if (/credit balance/i.test(e.message || "")) return "Dein Claude-Guthaben ist leer. Lade es in der Anthropic Console auf.";
    if (e.status >= 500) return "Claude ist gerade überlastet. Versuch es gleich noch einmal.";
    return `Claude-Fehler ${e.status || ""}: ${e.message}`.trim();
  }
  return `Fehler: ${e?.message || e}`;
};

const askClaude = async ({ apiKey, model, messages, onText, onFallback, signal }) => {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  // the key belongs to the learner and stays on their phone - browser use is intended here
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
  try {
    const stream = client.beta.messages.stream(claudeParams(model, SYSTEM_PROMPT, messages), { signal });
    let text = "";
    for await (const ev of stream) {
      if (ev.type === "content_block_start" && ev.content_block.type === "fallback") onFallback?.(ev.content_block.to?.model);
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
        text += ev.delta.text;
        onText(text);
      }
    }
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") return { text, refused: true, cost: claudeCost(model, msg.usage) };
    return { text, cost: claudeCost(model, msg.usage), truncated: msg.stop_reason === "max_tokens" };
  } catch (e) {
    const error = claudeError(Anthropic, e);
    if (error === null) return { aborted: true };
    return { error };
  }
};

// ---- Gemini (REST) ----

export const geminiBody = (system, messages) => ({
  systemInstruction: { parts: [{ text: system }] },
  contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
  generationConfig: { maxOutputTokens: MAX_TOKENS },
});

// Splits a server-sent-events buffer into the JSON payloads of its complete
// "data:" lines; rest is the unfinished tail to keep for the next chunk.
export const parseSse = (buffer) => {
  const lines = buffer.split(/\r?\n/);
  const rest = lines.pop();
  const events = [];
  lines.forEach((line) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    try { events.push(JSON.parse(data)); } catch { /* not JSON: skip */ }
  });
  return { events, rest };
};

// text and stop signals from one Gemini stream chunk
export const geminiChunk = (ev) => {
  const cand = ev?.candidates?.[0];
  const text = (cand?.content?.parts || []).map((p) => (p.thought ? "" : p.text || "")).join("");
  const blocked = Boolean(ev?.promptFeedback?.blockReason) || ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "RECITATION"].includes(cand?.finishReason);
  return { text, blocked, truncated: cand?.finishReason === "MAX_TOKENS" };
};

export const geminiError = (status, message = "") => {
  if (status === 400 && /api key/i.test(message)) return "Der Gemini-Schlüssel ist ungültig. Prüfe ihn in den KI-Einstellungen.";
  if (status === 403) return "Dieser Gemini-Schlüssel ist nicht freigeschaltet (403).";
  if (status === 404) return "Dieses Gemini-Modell gibt es nicht (mehr). Wähle in den KI-Einstellungen ein anderes.";
  if (status === 429) return "Das kostenlose Gemini-Limit ist erreicht. Warte etwas oder wähle das andere Gemini-Modell.";
  if (status >= 500) return "Gemini ist gerade überlastet. Versuch es gleich noch einmal.";
  return `Gemini-Fehler ${status}: ${message}`.trim();
};

const askGemini = async ({ apiKey, model, messages, onText, signal, fetchFn = globalThis.fetch }) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  let res;
  try {
    res = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(geminiBody(SYSTEM_PROMPT, messages)),
      signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") return { aborted: true };
    return { error: "Keine Verbindung zu Gemini. Bist du online?" };
  }
  if (!res.ok) {
    let message = "";
    try { message = (await res.json())?.error?.message || ""; } catch { /* no JSON body */ }
    return { error: geminiError(res.status, message) };
  }
  let text = "";
  let refused = false;
  let truncated = false;
  try {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      buffer += done ? "\n" : decoder.decode(value, { stream: true });
      const { events, rest } = parseSse(buffer);
      buffer = rest;
      events.forEach((ev) => {
        const c = geminiChunk(ev);
        if (c.text) { text += c.text; onText(text); }
        if (c.blocked) refused = true;
        if (c.truncated) truncated = true;
      });
      if (done) break;
    }
  } catch (e) {
    if (e?.name === "AbortError") return { aborted: true, text };
    return { error: "Die Verbindung zu Gemini ist abgebrochen.", text };
  }
  return { text, refused: refused && !text, truncated, cost: 0 };
};

// Sends the conversation ([{ role: "user" | "assistant", content }]) with
// apiKey (just read from the unlocked vault) and streams the answer into
// onText(fullTextSoFar). Resolves to
// { text, cost?, refused?, truncated?, error?, aborted? } - never throws.
export const askAi = (settings, { apiKey, messages, onText, onFallback, signal, fetchFn }) => {
  const provider = settings.provider;
  const model = settings.models[provider];
  if (!settings.enabled || !apiKey) return Promise.resolve({ error: "Der KI-Assistent ist aus." });
  return provider === PROVIDERS.CLAUDE
    ? askClaude({ apiKey, model, messages, onText, onFallback, signal })
    : askGemini({ apiKey, model, messages, onText, signal, fetchFn });
};
