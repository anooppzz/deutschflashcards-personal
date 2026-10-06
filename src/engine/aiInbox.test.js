import { describe, it, expect } from "vitest";
import { addInboxItem, parseInbox, removeInboxItems, markExported, inboxMarkdown, inboxFileName, MAX_INBOX } from "./aiInbox";

const t = (s) => new Date(`2026-10-06T${s}:00`);
const entry = (title, answer, extra = {}) => ({ title, kind: "word", question: "Erklär mir", answer, source: "Gemini Flash", wants: ["cards"], ...extra });

describe("KI-Eingang", () => {
  it("adds entries on top, trims text, keeps known wants only", () => {
    let items = addInboxItem([], entry("die Rechnung", "  Antwort 1 "), t("10:00"));
    items = addInboxItem(items, entry("Perfekt", "Antwort 2", { kind: "topic", wants: ["exercises", "bogus", "grammar"], note: " mehr Beispiele " }), t("11:00"));
    expect(items.map((i) => i.title)).toEqual(["Perfekt", "die Rechnung"]);
    expect(items[1].answer).toBe("Antwort 1");
    expect(items[0].wants).toEqual(["grammar", "exercises"]);
    expect(items[0].note).toBe("mehr Beispiele");
    expect(items[0].exportedAt).toBe(null);
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
  });

  it("ignores empty answers and caps the list", () => {
    expect(addInboxItem([], entry("x", "   "))).toEqual([]);
    let items = [];
    for (let i = 0; i < MAX_INBOX + 5; i++) items = addInboxItem(items, entry(`w${i}`, "a"));
    expect(items).toHaveLength(MAX_INBOX);
    expect(items[0].title).toBe(`w${MAX_INBOX + 4}`);
  });

  it("reads stored data defensively", () => {
    expect(parseInbox(null)).toEqual([]);
    expect(parseInbox([{ id: "a", answer: "x" }, { id: 3 }, "junk", { id: "b", answer: "" }])).toHaveLength(1);
  });

  it("marks exported and removes", () => {
    let items = addInboxItem([], entry("a", "1"));
    items = addInboxItem(items, entry("b", "2"));
    const ids = [items[0].id];
    items = markExported(items, ids, t("12:00"));
    expect(items[0].exportedAt).toBeTruthy();
    expect(items[1].exportedAt).toBe(null);
    expect(removeInboxItems(items, ids).map((i) => i.title)).toEqual(["a"]);
  });

  it("exports oldest first, answers quoted so their headings can't break the file", () => {
    let items = addInboxItem([], entry("die Rechnung", "## Bedeutung\n**bill**\n\n- Plural: die Rechnungen"), t("10:00"));
    items = addInboxItem(items, { title: "Pasted", kind: "other", answer: "Text von ChatGPT", source: "ChatGPT (Website)", wants: [], note: "Zeile 1\nZeile 2" }, t("11:00"));
    const md = inboxMarkdown(items, t("12:00"));
    expect(md).toMatch(/^# KI-Eingang – 2026-10-06 \(2 Einträge\)/);
    expect(md).toContain("docs/ai-inbox/README.md");
    expect(md.indexOf("## 1. Karte: die Rechnung")).toBeLessThan(md.indexOf("## 2. Thema: Pasted"));
    expect(md).toContain("> ## Bedeutung\n> **bill**\n>\n> - Plural: die Rechnungen");
    expect(md).toContain("- Learner wants: new flashcards");
    expect(md).toContain("- Learner wants: (not said – decide)");
    expect(md).toContain("- Learner's note: Zeile 1 Zeile 2");
    expect(md).toContain("Source: ChatGPT (Website)");
    expect(md.match(/^## /gm)).toHaveLength(2);
    expect(inboxFileName(t("12:00"))).toBe("ki-eingang-2026-10-06.md");
  });
});
