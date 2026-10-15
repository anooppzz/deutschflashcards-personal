// 🧱 Sätze: ready-made sentences and dialogues per chapter
// (src/data/speaking/chunks.json) to listen to, say along, say from the
// English, and record. A set without a deck ("Alltag") fits every selection.
import { hashStr } from "./storage";

// The sets for the chosen chapters: the everyday sets first, then chapter
// sets in file order.
export const setsForDecks = (sets, decks) => [
  ...sets.filter((s) => !s.deck),
  ...sets.filter((s) => s.deck && decks.includes(s.deck)),
];

// A line's recording id: built from the German text, so recordings stay with
// their sentence when lines are reordered or added.
export const lineId = (setKey, de) => `chunk::${setKey}::${hashStr(de)}`;

// Every line of a set: { id, de, en, who?, dialogue? }
export const linesOf = (set) => [
  ...set.sentences.map((l) => ({ ...l, id: lineId(set.key, l.de) })),
  ...set.dialogues.flatMap((d, di) => d.lines.map((l) => ({ ...l, dialogue: di, id: lineId(set.key, l.de) }))),
];

// A: the other person (the phone speaks it as a woman), B: the learner (a man's
// voice when the phone has one) – engine/speech.js voices.
export const VOICE_OF = { A: "f", B: "m" };
