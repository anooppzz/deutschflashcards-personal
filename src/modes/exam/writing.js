// ✍️ DTZ Schreiben (format: docs/DTZ_FORMAT.md, tasks: src/data/exam/dtz-schreiben.json).
// 30 minutes, task A or B, 4 Leitpunkte, Anrede + Gruß. Rated on four
// criteria, 0–5 points each (5/4 = B1 gut erfüllt/erfüllt, 3/2 = A2, 1 = A1):
// from 7 of 20 → A2, from 15 → B1 (official DTZ thresholds).

export const WRITING_MINUTES = 30;
export const WRITING_A2_FROM = 7;
export const WRITING_B1_FROM = 15;

export const writingLevel = (points) => (points >= WRITING_B1_FROM ? "B1" : points >= WRITING_A2_FROM ? "A2" : "unter A2");

// the four official criteria with short descriptions for self-rating
export const CRITERIA = [
  {
    key: "task", de: "Aufgabenbewältigung", en: "Task completion",
    levels: { B1: "Alle 4 Leitpunkte genau bearbeitet.", A2: "3 Punkte gut – oder alle 4, aber manches unklar.", A1: "Nur 1–2 Punkte bearbeitet." },
  },
  {
    key: "communication", de: "Kommunikative Gestaltung", en: "Communicative design",
    levels: { B1: "Passende Anrede/Gruß, höflich, Sätze gut verbunden (weil, deshalb, dass …).", A2: "Einfache Sätze, mit und / aber / weil verbunden.", A1: "Nur Begrüßung und Abschied, Wörter mit und / dann." },
  },
  {
    key: "accuracy", de: "Korrektheit", en: "Accuracy",
    levels: { B1: "Fehler kommen vor, aber alles ist klar.", A2: "Viele Grundfehler (Verbform, Zeitform), meist verständlich.", A1: "Nur auswendig gelernte Sätze richtig." },
  },
  {
    key: "vocabulary", de: "Wortschatz", en: "Vocabulary",
    levels: { B1: "Genug Wörter für das Thema, manchmal umschrieben.", A2: "Alltagswörter reichen für einfache Dinge.", A1: "Nur einzelne Wörter und Wendungen." },
  },
];

// the point buttons per criterion
export const POINT_STEPS = [
  { points: 5, label: "B1+" }, { points: 4, label: "B1" }, { points: 3, label: "A2+" },
  { points: 2, label: "A2" }, { points: 1, label: "A1" }, { points: 0, label: "0" },
];

// Aufgabenbewältigung from the ticked Leitpunkte (the learner can change it)
export const suggestTaskPoints = (ticked) => Math.min(4, Math.max(0, ticked));

export const wordCount = (text) => (text.match(/[\p{L}\d][\p{L}\d'’-]*/gu) || []).length;

const lines = (text) => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const FORMAL_ANREDE = /^(sehr geehrte[rs]?|guten tag)\b/i;
const INFORMAL_ANREDE = /^(liebe[rs]?|hallo|hi)\b/i;
const GRUSS = /(mit freundlichen grüßen|freundliche grüße|viele grüße|liebe grüße|herzliche grüße|beste grüße|schöne grüße|bis bald|lg\b)/i;
const DU = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner|deines)\b/gi;
const CONNECTORS = ["weil", "dass", "deshalb", "denn", "wenn", "aber", "obwohl", "damit", "trotzdem", "darum", "deswegen", "außerdem", "dann", "oder", "ob"];

// What the checklist shows while writing / after handing in:
// [{ key, ok: true | false | null (hint only), de, en }]
export const writingChecks = (text, register) => {
  const ls = lines(text);
  const first = ls[0] || "";
  const words = wordCount(text);
  const checks = [];

  const anyAnrede = FORMAL_ANREDE.test(first) || INFORMAL_ANREDE.test(first);
  const rightAnrede = register === "formal" ? FORMAL_ANREDE.test(first) : INFORMAL_ANREDE.test(first);
  checks.push(!anyAnrede
    ? { key: "anrede", ok: false, de: "Anrede fehlt (erste Zeile).", en: register === "formal" ? "Start with e.g. „Sehr geehrte Frau …,“" : "Start with e.g. „Liebe Sabine,“ / „Lieber Tom,“" }
    : rightAnrede
      ? { key: "anrede", ok: true, de: "Anrede", en: first }
      : { key: "anrede", ok: false, de: register === "formal" ? "Anrede zu persönlich – hier formell schreiben." : "Anrede zu formell – an Freunde: „Liebe …“ / „Lieber …“.", en: first });

  if (/sehr geehrte\s+herr\b/i.test(text)) checks.push({ key: "geehrter", ok: false, de: "„Sehr geehrte**r** Herr …“ – mit r.", en: "Herr → geehrter (with r)." });
  if (/sehr geehrter\s+frau\b/i.test(text)) checks.push({ key: "geehrte", ok: false, de: "„Sehr geehrte Frau …“ – ohne r.", en: "Frau → geehrte (no r)." });
  if (/\bliebe\s+herr\b/i.test(text)) checks.push({ key: "lieber", ok: false, de: "„Lieber Herr …“ – mit r.", en: "Herr → Lieber." });
  if (/\blieber\s+frau\b/i.test(text)) checks.push({ key: "liebe", ok: false, de: "„Liebe Frau …“ – ohne r.", en: "Frau → Liebe." });
  if (anyAnrede && !/,\s*$/.test(first)) checks.push({ key: "komma", ok: false, de: "Nach der Anrede kommt ein Komma.", en: "Put a comma after the greeting line." });

  checks.push(GRUSS.test(ls.slice(-4).join(" "))
    ? { key: "gruss", ok: true, de: "Gruß", en: "Sign-off found." }
    : { key: "gruss", ok: false, de: "Gruß fehlt (am Ende).", en: register === "formal" ? "End with „Mit freundlichen Grüßen“ + your name." : "End with „Viele Grüße“ / „Liebe Grüße“ + your name." });

  if (register === "formal") {
    const du = [...new Set((text.match(DU) || []).map((w) => w.toLowerCase()))];
    if (du.length) checks.push({ key: "sie", ok: false, de: `Formell: Sie / Ihnen / Ihr statt ${du.join(", ")}.`, en: "Formal letter: use Sie, not du." });
  }

  const used = CONNECTORS.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(text));
  const strong = used.filter((c) => !["aber", "dann", "oder"].includes(c));
  checks.push({ key: "connectors", ok: strong.length >= 2 ? true : null, de: `Verbindungswörter: ${used.length ? used.join(", ") : "keine"}`, en: strong.length >= 2 ? "Good – linked sentences." : "Link sentences with weil, dass, deshalb, wenn … (B1)." });

  checks.push({ key: "words", ok: words >= 80 ? true : null, de: `${words} Wörter`, en: words >= 80 ? "Good length for B1." : "No official minimum – „Schreiben Sie möglichst viel.“ About 80+ words for B1." });
  return checks;
};

// the model answer as one text (for display and the AI prompt)
export const modelText = (task) => [task.model.anrede, ...task.model.parts, task.model.gruss].join("\n\n");

// The request for an AI to rate the text like a DTZ examiner (in-app chat or
// a website link). English explanations, German corrections.
export const writingReviewPrompt = (task, text) => [
  "I'm preparing for the DTZ exam (Deutsch-Test für Zuwanderer, A2–B1), part Schreiben. Please rate my text like a DTZ examiner.",
  "",
  `Task (${task.register === "formal" ? "formal, Sie" : "informal, du"}): ${task.situation} ${task.instruction}`,
  "Leitpunkte (all four must be covered):",
  ...task.points.map((p, i) => `${i + 1}. ${p.de}`),
  "",
  "My text:",
  '"""',
  text.trim(),
  '"""',
  "",
  "Rate the four official criteria with 0–5 points each (5 = B1 well done, 4 = B1, 3 = A2 well done, 2 = A2, 1 = A1, 0 = not done):",
  "Aufgabenbewältigung (were the 4 Leitpunkte covered?), Kommunikative Gestaltung (greeting, sign-off, register, linking sentences), Korrektheit (grammar, spelling), Wortschatz.",
  "Then give: the total out of 20 and the level (A2 from 7, B1 from 15); which Leitpunkte are missing or unclear; my 5 most important mistakes as a table „my text → correct → why“ (why in simple English); a corrected version of my text that keeps my ideas; 2 tips to reach the next level.",
].join("\n");
