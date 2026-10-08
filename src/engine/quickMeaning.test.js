import { describe, it, expect, beforeEach } from "vitest";
import { quickMeaning, readMyMemory, clearQuickMeaningCache } from "./quickMeaning";

const reply = (text, status = 200) => ({ json: async () => ({ responseStatus: status, responseData: { translatedText: text } }) });

beforeEach(() => clearQuickMeaningCache());

describe("quick meaning", () => {
  it("translates German to English", async () => {
    const urls = [];
    const r = await quickMeaning(" Fernweh ", async (u) => { urls.push(u); return reply("wanderlust"); });
    expect(r).toEqual({ from: "de", text: "wanderlust" });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("q=Fernweh&langpair=de|en");
  });

  it("tries English → German when the word comes back unchanged", async () => {
    const r = await quickMeaning("breakfast", async (u) => reply(u.includes("de|en") ? "Breakfast" : "das Frühstück"));
    expect(r).toEqual({ from: "en", text: "das Frühstück" });
  });

  it("returns null when nothing is found, and remembers it", async () => {
    let calls = 0;
    const fetchFn = async () => { calls++; return reply("xyzq"); };
    expect(await quickMeaning("xyzq", fetchFn)).toBe(null);
    expect(await quickMeaning("XYZQ", fetchFn)).toBe(null);
    expect(calls).toBe(2); // de|en and en|de once, then from memory
  });

  it("ignores very short input", async () => {
    expect(await quickMeaning("a", async () => { throw new Error("no call"); })).toBe(null);
  });

  it("throws when offline (the panel shows that)", async () => {
    await expect(quickMeaning("Haus", async () => { throw new TypeError("Failed to fetch"); })).rejects.toThrow();
  });

  it("filters MyMemory warnings and errors", () => {
    expect(readMyMemory({ responseStatus: 200, responseData: { translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS" } }, "x")).toBe(null);
    expect(readMyMemory({ responseStatus: 403, responseData: { translatedText: "house" } }, "Haus")).toBe(null);
    expect(readMyMemory({ responseStatus: "200", responseData: { translatedText: " house " } }, "Haus")).toBe("house");
    expect(readMyMemory(null, "x")).toBe(null);
  });
});
