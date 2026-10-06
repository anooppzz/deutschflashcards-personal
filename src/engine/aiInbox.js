// 📥 KI-Eingang: AI answers the learner wants in the app. Nothing goes into
// the app's data from here directly - the inbox is exported as one Markdown
// file, and a Claude Code session checks it and adds what fits
// (docs/ai-inbox/README.md). Entries come from the in-app chat
// ("📌 Für die App vorschlagen") or are pasted from Claude/ChatGPT/Gemini
// websites ("＋ Text einfügen"). Stored under STORAGE_KEYS.AI_INBOX (in the
// backup - it holds no secrets).
//
// item: { id, at, title, kind: "word" | "topic" | "other", question, answer,
//         source, wants: [key], note, exportedAt }

export const MAX_INBOX = 200;

export const WANTS = [
  { key: "cards", label: "🃏 Karten" },
  { key: "grammar", label: "📖 Grammatik-Text" },
  { key: "exercises", label: "✏️ Übungen" },
  { key: "other", label: "💡 Sonstiges" },
];
const WANT_EN = { cards: "new flashcards", grammar: "grammar explanation", exercises: "practice questions", other: "other / see note" };
const KIND_DE = { word: "Karte", topic: "Grammatik", other: "Thema" };

const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const validItem = (it) => it && typeof it === "object" && typeof it.id === "string" && clean(it.answer, 20000);

export const parseInbox = (raw) => (Array.isArray(raw) ? raw.filter(validItem) : []);

// a new entry on top; the oldest drop off past MAX_INBOX
export const addInboxItem = (items, entry, now = new Date()) => {
  const item = {
    id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: now.toISOString(),
    title: clean(entry.title, 200) || "Ohne Titel",
    kind: ["word", "topic"].includes(entry.kind) ? entry.kind : "other",
    question: clean(entry.question, 2000),
    answer: clean(entry.answer, 20000),
    source: clean(entry.source, 80),
    wants: WANTS.map((w) => w.key).filter((k) => (entry.wants || []).includes(k)),
    note: clean(entry.note, 2000),
    exportedAt: null,
  };
  if (!item.answer) return items;
  return [item, ...items].slice(0, MAX_INBOX);
};

export const removeInboxItems = (items, ids) => items.filter((it) => !ids.includes(it.id));
export const markExported = (items, ids, now = new Date()) => items.map((it) => (ids.includes(it.id) ? { ...it, exportedAt: now.toISOString() } : it));

const pad = (n) => String(n).padStart(2, "0");
const day = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const stamp = (iso) => { const d = new Date(iso); return `${day(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
// every line quoted, so headings inside an answer can't break the file's structure
const quote = (text) => text.split(/\r?\n/).map((l) => (l ? `> ${l}` : ">")).join("\n");

export const inboxFileName = (now = new Date()) => `ki-eingang-${day(now)}.md`;

// The export: oldest first, with the instructions for the session on top.
export const inboxMarkdown = (items, now = new Date()) => {
  const list = [...items].sort((a, b) => a.at.localeCompare(b.at));
  const head = [
    `# KI-Eingang – ${day(now)} (${list.length} ${list.length === 1 ? "Eintrag" : "Einträge"})`,
    "",
    "Exported from the flashcard app (📥 KI-Eingang). For the Claude Code session:",
    "follow `docs/ai-inbox/README.md` in the repo `anooppzz/deutschflashcards-personal` –",
    "check every entry (correct German? A2 level? already in the app?), add only what fits,",
    "and report per entry what was taken and what was not.",
  ];
  const entries = list.map((it, i) => [
    `## ${i + 1}. ${KIND_DE[it.kind] || "Thema"}: ${it.title}`,
    "",
    `- Saved: ${stamp(it.at)}${it.source ? ` · Source: ${it.source}` : ""}`,
    `- Learner wants: ${it.wants.length ? it.wants.map((k) => WANT_EN[k]).join(", ") : "(not said – decide)"}`,
    ...(it.note ? [`- Learner's note: ${it.note.replace(/\s*\n\s*/g, " ")}`] : []),
    ...(it.question ? [`- Question: ${it.question.replace(/\s*\n\s*/g, " ")}`] : []),
    "",
    "AI answer (unchecked):",
    "",
    quote(it.answer),
  ].join("\n"));
  return [head.join("\n"), ...entries].join("\n\n") + "\n";
};
