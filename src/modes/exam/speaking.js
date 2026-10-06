// 🗣 DTZ Sprechen (format: docs/DTZ_FORMAT.md, content: src/data/exam/dtz-sprechen.json).
// The app plays the examiner (Teil 1, 2) and the partner (Teil 3) with the
// phone's voice; the learner answers aloud. A session is a list of turns:
// { id, teil: "1A" | "1B" | "2A" | "2B" | "3", say, sayEn, who: "examiner" |
//   "partner", info?, model?: [{de, en}], record: bool }
// Scoring (handbook 7.1.2.4): every criterion is rated B1+/B1/A2+/A2/A1/0 =
// 5/4/3/2/1/0 × its weight; 100 points, A2 from 35, B1 from 75.

export const SPEAKING_MINUTES = 16;
export const SPEAKING_A2_FROM = 35;
export const SPEAKING_B1_FROM = 75;

export const speakingLevel = (points) => (points >= SPEAKING_B1_FROM ? "B1" : points >= SPEAKING_A2_FROM ? "A2" : "unter A2");

export const SPEAK_CRITERIA = [
  { key: "t1a", de: "Teil 1A · sich vorstellen", weight: 1, levels: { B1: "Stellt sich ausführlich und mit Details vor.", A2: "Gibt kurze, allgemeine Informationen.", A1: "Nennt Informationen ohne Verbindung." } },
  { key: "t1b", de: "Teil 1B · auf Nachfragen antworten", weight: 1, levels: { B1: "Antwortet relativ spontan und ausführlich.", A2: "Antwortet knapp, teilweise verständlich.", A1: "Antwortet mit einzelnen Wörtern." } },
  { key: "t2a", de: "Teil 2A · Foto beschreiben", weight: 2, levels: { B1: "Nennt die Hauptinhalte und auch Einzelheiten.", A2: "Nennt die Hauptinhalte knapp und allgemein.", A1: "Deutet die Hauptinhalte mit sehr wenigen Wörtern an." } },
  { key: "t2b", de: "Teil 2B · über Erfahrungen berichten", weight: 2, levels: { B1: "Berichtet über eigene Erfahrungen teilweise detailliert.", A2: "Berichtet knapp und allgemein.", A1: "Antwortet mit einzelnen Wörtern, sehr knapp." } },
  { key: "t3", de: "Teil 3 · gemeinsam planen", weight: 4, levels: { B1: "Hält das Gespräch in Gang, macht Vorschläge, reagiert spontan.", A2: "Äußert Ideen, Meinungen und Vorschläge auf einfache Weise.", A1: "Stellt einfachste Fragen, Ideen nur stichwortartig." } },
  { key: "pron", de: "Aussprache / Intonation", weight: 2, levels: { B1: "Klar genug trotz Akzent; man fragt selten nach.", A2: "Meist verständlich, man muss manchmal nachfragen.", A1: "Nur auswendig gelernte Wörter, mit Mühe verständlich." } },
  { key: "fluency", de: "Flüssigkeit", weight: 2, levels: { B1: "Spricht verständlich weiter, auch mit Pausen.", A2: "Kurze Gespräche gelingen, oft Stocken und Neuansetzen.", A1: "Sehr kurze Äußerungen mit vielen Pausen." } },
  { key: "accuracy", de: "Korrektheit", weight: 3, levels: { B1: "Einfache Strukturen meist richtig, Fehler stören wenig.", A2: "Grundfehler (Zeitformen, Verbformen), aber meist klar.", A1: "Nur wenige auswendig gelernte Strukturen." } },
  { key: "vocabulary", de: "Wortschatz", weight: 3, levels: { B1: "Genug Wörter für Alltagsthemen, manchmal umschrieben.", A2: "Genug für einfache Alltagsbedürfnisse.", A1: "Nur einzelne Wörter zu konkreten Situationen." } },
];

export const SPEAK_STEPS = [
  { step: 5, label: "B1+" }, { step: 4, label: "B1" }, { step: 3, label: "A2+" },
  { step: 2, label: "A2" }, { step: 1, label: "A1" }, { step: 0, label: "0" },
];

// steps: { criterionKey: 0–5 } → points out of 100
export const speakingPoints = (steps) => SPEAK_CRITERIA.reduce((s, c) => s + (steps[c.key] ?? 0) * c.weight, 0);

// n different items, in random order
export const sample = (list, n, rng = Math.random) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};

// ---- turns ----

export const teil1Turns = (content, { questions = 3, rng } = {}) => {
  const t1 = content.teil1;
  return [
    { id: "1A", teil: "1A", who: "examiner", say: t1.say, info: { kind: "keywords", items: t1.keywords }, model: t1.model, record: true },
    ...sample(t1.questions, questions, rng).map((q, i) => ({
      id: `1B-${i}`, teil: "1B", who: "examiner", say: q.q.de, sayEn: q.q.en, model: [q.model], record: true,
    })),
  ];
};

export const teil2Turns = (content, topic, { a2 = 3, b1 = 3, rng } = {}) => {
  const t2 = content.teil2;
  const questions = [...sample(topic.a2, a2, rng), ...sample(topic.b1, b1, rng)];
  return [
    { id: "2A", teil: "2A", who: "examiner", say: t2.say, info: { kind: "photo", title: topic.title, de: topic.photo.de, en: topic.photo.en }, model: topic.model, record: true },
    ...questions.map((q, i) => ({
      id: `2B-${i}`, teil: "2B", who: "examiner", say: i === 0 ? `${t2.sayB} ${q.de}` : q.de, sayEn: q.en,
      level: i < Math.min(a2, topic.a2.length) ? "A2" : "B1", record: true,
    })),
  ];
};

// The learner is A, the app is partner B: each A line is a turn, introduced
// by B's line before it (or, first, by the examiner); B's last line closes.
export const teil3Turns = (content, task) => {
  const turns = [];
  const info = { kind: "plan", title: task.title, de: task.situation.de, en: task.situation.en, notes: task.notes };
  task.dialogue.forEach((line, i) => {
    if (line.who !== "A") return;
    const before = task.dialogue[i - 1];
    turns.push(before
      ? { id: `3-${i}`, teil: "3", who: "partner", say: before.de, sayEn: before.en, info, model: [{ de: line.de, en: line.en }], record: true }
      : { id: `3-${i}`, teil: "3", who: "examiner", say: `${content.teil3.say}`, info, model: [{ de: line.de, en: line.en }], record: true });
  });
  const last = task.dialogue[task.dialogue.length - 1];
  if (last.who === "B") turns.push({ id: "3-end", teil: "3", who: "partner", say: last.de, sayEn: last.en, info, record: false });
  return turns;
};

// the whole oral exam, about 16 minutes: 1A + 2 questions, a photo + 3
// questions (2 A2, 1 B1), a planning talk
export const simulationTurns = (content, rng = Math.random) => {
  const [topic] = sample(content.teil2.topics, 1, rng);
  const [task] = sample(content.teil3.tasks, 1, rng);
  return [
    ...teil1Turns(content, { questions: 2, rng }),
    ...teil2Turns(content, topic, { a2: 2, b1: 1, rng }),
    ...teil3Turns(content, task),
  ];
};

export const TEIL_TITLES = {
  "1A": "Teil 1A · Über sich sprechen", "1B": "Teil 1B · Nachfragen",
  "2A": "Teil 2A · Über ein Foto sprechen", "2B": "Teil 2B · Über Erfahrungen sprechen",
  3: "Teil 3 · Gemeinsam etwas planen",
};

// What an AI is asked for answers transcribed by speech recognition.
export const speakingReviewPrompt = (turns, transcripts) => {
  const answered = turns.filter((t) => transcripts[t.id]?.trim());
  return [
    "I'm preparing for the DTZ oral exam (Deutsch-Test für Zuwanderer, A2–B1). Below are the examiner's or my partner's lines and my spoken answers, written down by speech recognition – it may have misheard words; ignore punctuation and capital letters.",
    "",
    ...answered.flatMap((t) => [
      `${TEIL_TITLES[t.teil]} – ${t.who === "partner" ? "Partner" : "Examiner"}: ${t.say}`,
      ...(t.info?.kind === "photo" ? [`(Photo: ${t.info.de})`] : []),
      ...(t.info?.kind === "plan" && t.id === answered[0]?.id ? [`(Task: ${t.info.de} Notes: ${t.info.notes.join(", ")})`] : []),
      `Me: ${transcripts[t.id].trim()}`,
      "",
    ]),
    "Please rate it like a DTZ examiner: for each part, task completion on the scale B1 well done / B1 / A2 well done / A2 / A1 / not done, with one short reason; then Korrektheit and Wortschatz on the same scale (pronunciation and fluency can't be judged from text – leave them out).",
    "Then: my most important mistakes as a table „what I said → correct → why“ (why in simple English), a better B1 version of each of my answers that keeps my ideas, and 3 tips for the exam.",
  ].join("\n");
};
