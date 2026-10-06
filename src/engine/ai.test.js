import { describe, it, expect } from "vitest";
import {
  loadAiSettings, saveAiSettings, defaultAiSettings, aiReady, claudeParams, claudeCost, geminiBody,
  parseSse, geminiChunk, geminiError, askAi, formatUsd, PROVIDERS, CLAUDE_MODELS, SYSTEM_PROMPT,
} from "./ai";
import { createVault, lockVault } from "./aiVault";
import { collectBackup, restoreBackup, parseBackup } from "./backup";
import { DEVICE_ONLY_KEYS, STORAGE_KEYS } from "../constants";

const memStore = (init = {}) => {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
};

describe("AI settings", () => {
  it("are off by default and with no key", () => {
    const s = loadAiSettings(memStore());
    expect(s).toEqual(defaultAiSettings());
    expect(s.enabled).toBe(false);
    expect(aiReady(s)).toBe(false);
  });

  it("round-trip with a vault and need on + a locked-away key to be ready", async () => {
    const store = memStore();
    const vault = await createVault({ gemini: "", claude: "sk-ant-x1234" }, "geheim1", { iter: 1000 });
    lockVault();
    saveAiSettings({ ...defaultAiSettings(), enabled: true, provider: PROVIDERS.CLAUDE, vault }, store);
    const raw = store.getItem(DEVICE_ONLY_KEYS.AI);
    expect(raw).not.toContain("sk-ant-x1234");
    const back = loadAiSettings(store);
    expect(back.vault.hints.claude).toBe("…1234");
    expect(back.legacyKeys).toBe(null);
    expect(aiReady(back)).toBe(true);
    expect(aiReady({ ...back, enabled: false })).toBe(false);
    expect(aiReady({ ...back, provider: PROVIDERS.GEMINI })).toBe(false);
  });

  it("find plain keys from the first version and keep them until locked away", () => {
    const store = memStore({ [DEVICE_ONLY_KEYS.AI]: JSON.stringify({ enabled: true, provider: "gemini", keys: { gemini: "AIza-old", claude: "" } }) });
    const s = loadAiSettings(store);
    expect(s.legacyKeys).toEqual({ gemini: "AIza-old", claude: "" });
    expect(aiReady(s)).toBe(false); // not usable until protected
    saveAiSettings(s, store);
    expect(loadAiSettings(store).legacyKeys.gemini).toBe("AIza-old");
    saveAiSettings({ ...s, legacyKeys: null, vault: { v: 1, data: { ct: "x" }, pin: { ct: "y" }, hints: { gemini: "…-old" } } }, store);
    expect(store.getItem(DEVICE_ONLY_KEYS.AI)).not.toContain("AIza-old");
  });

  it("treat a damaged entry as off and drop unknown Claude models", () => {
    expect(loadAiSettings(memStore({ [DEVICE_ONLY_KEYS.AI]: "{oops" })).enabled).toBe(false);
    const s = loadAiSettings(memStore({ [DEVICE_ONLY_KEYS.AI]: JSON.stringify({ enabled: "yes", provider: "x", models: { claude: "gpt" } }) }));
    expect(s.enabled).toBe(false);
    expect(s.provider).toBe(PROVIDERS.GEMINI);
    expect(s.models.claude).toBe(CLAUDE_MODELS[0].id);
  });

  it("never go into the backup file and survive a restore", () => {
    expect(Object.values(STORAGE_KEYS)).not.toContain(DEVICE_ONLY_KEYS.AI);
    const store = memStore({ [STORAGE_KEYS.PROGRESS]: "{}", [DEVICE_ONLY_KEYS.AI]: JSON.stringify({ keys: { claude: "sk-ant-secret" } }) });
    const backup = collectBackup(store);
    expect(JSON.stringify(backup)).not.toContain("sk-ant-secret");
    restoreBackup(parseBackup(JSON.stringify({ ...backup, data: { [DEVICE_ONLY_KEYS.AI]: "{}", [STORAGE_KEYS.PROGRESS]: "{}" } })), store);
    expect(store.getItem(DEVICE_ONLY_KEYS.AI)).toContain("sk-ant-secret");
  });
});

describe("Claude request", () => {
  const msgs = [{ role: "user", content: "Hallo?" }];
  it("uses low effort and server-side fallbacks on the 5.5 models", () => {
    const p = claudeParams("claude-opus-5-5", SYSTEM_PROMPT, msgs);
    expect(p).toMatchObject({ model: "claude-opus-5-5", output_config: { effort: "low" }, fallbacks: "default", betas: ["server-side-fallback-2026-07-01"], messages: msgs });
    expect(p.max_tokens).toBeGreaterThanOrEqual(4000);
  });
  it("sends no effort or fallbacks to Haiku", () => {
    const p = claudeParams("claude-haiku-4-5-20251001", SYSTEM_PROMPT, msgs);
    expect(p.output_config).toBeUndefined();
    expect(p.fallbacks).toBeUndefined();
  });
  it("prices an answer from its usage", () => {
    expect(claudeCost("claude-opus-5-5", { input_tokens: 1e6, output_tokens: 1e6 })).toBe(24);
    expect(claudeCost("claude-haiku-4-5-20251001", { input_tokens: 500, output_tokens: 1000 })).toBeCloseTo(0.0055);
    expect(formatUsd(0.0136)).toBe("1.4 US-ct");
    expect(formatUsd(0.0002)).toBe("< 0.1 US-ct");
    expect(formatUsd(1.2)).toBe("$1.20");
  });
});

describe("Gemini", () => {
  it("maps the chat to Gemini roles", () => {
    const b = geminiBody("sys", [{ role: "user", content: "a" }, { role: "assistant", content: "b" }]);
    expect(b.systemInstruction.parts[0].text).toBe("sys");
    expect(b.contents.map((c) => c.role)).toEqual(["user", "model"]);
  });

  it("splits SSE data lines and keeps the unfinished tail", () => {
    const { events, rest } = parseSse('data: {"a":1}\n\ndata: {"b":2}\r\ndata: {"c"');
    expect(events).toEqual([{ a: 1 }, { b: 2 }]);
    expect(rest).toBe('data: {"c"');
  });

  it("reads text, skips thoughts and spots blocks", () => {
    expect(geminiChunk({ candidates: [{ content: { parts: [{ text: "x", thought: true }, { text: "Hallo" }] } }] }).text).toBe("Hallo");
    expect(geminiChunk({ promptFeedback: { blockReason: "SAFETY" } }).blocked).toBe(true);
    expect(geminiChunk({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [] } }] }).truncated).toBe(true);
  });

  it("explains errors in German", () => {
    expect(geminiError(429)).toMatch(/Limit/);
    expect(geminiError(400, "API key not valid")).toMatch(/ungültig/);
    expect(geminiError(404)).toMatch(/Modell/);
  });

  const sseResponse = (chunks) => ({
    ok: true,
    body: {
      getReader: () => {
        const enc = new TextEncoder();
        let i = 0;
        return { read: async () => (i < chunks.length ? { done: false, value: enc.encode(chunks[i++]) } : { done: true }) };
      },
    },
  });

  it("streams an answer (chunks split anywhere) with the key in a header, not the URL", async () => {
    const calls = [];
    const fetchFn = async (url, init) => {
      calls.push({ url, init });
      return sseResponse(['data: {"candidates":[{"content":{"parts":[{"text":"Gu', 'ten "}]}}]}\n\ndata: {"candidates":[{"content":{"parts":[{"text":"Tag"}]}}]}\n']);
    };
    const seen = [];
    const settings = { ...defaultAiSettings(), enabled: true };
    const r = await askAi(settings, { apiKey: "AIza-test", messages: [{ role: "user", content: "Hi" }], onText: (t) => seen.push(t), fetchFn });
    expect(r).toMatchObject({ text: "Guten Tag", cost: 0 });
    expect(seen.at(-1)).toBe("Guten Tag");
    expect(calls[0].url).toContain("gemini-flash-latest:streamGenerateContent?alt=sse");
    expect(calls[0].url).not.toContain("AIza-test");
    expect(calls[0].init.headers["x-goog-api-key"]).toBe("AIza-test");
  });

  it("returns the error message of a failed request", async () => {
    const fetchFn = async () => ({ ok: false, status: 429, json: async () => ({ error: { message: "quota" } }) });
    const settings = { ...defaultAiSettings(), enabled: true };
    expect((await askAi(settings, { apiKey: "k", messages: [], onText: () => {}, fetchFn })).error).toMatch(/Limit/);
  });

  it("sends nothing while switched off", async () => {
    let called = false;
    const settings = defaultAiSettings();
    const r = await askAi(settings, { apiKey: "k", messages: [], onText: () => {}, fetchFn: async () => { called = true; } });
    expect(called).toBe(false);
    expect(r.error).toBeTruthy();
  });
});
