// Distractor generation for Quiz mode's multiple-choice questions.
import { ROUND_SIZE } from "../../constants";
import { weightedSample, shuffled } from "../../engine";

export const buildQuiz = (cards, progress, distractorCards) => {
  const pool = cards.filter((c) => c.english && c.front);
  const dPool = (distractorCards || cards).filter((c) => c.english && c.front);
  const n = Math.min(ROUND_SIZE, pool.length);
  const chosen = weightedSample(pool, n, progress || {});
  return chosen.map((c) => {
    const distractors = [];
    const addFrom = (list) => {
      const unique = shuffled([...new Set(list.map((o) => o.english))].filter((e) => e !== c.english && !distractors.includes(e)));
      for (const e of unique) {
        if (distractors.length >= 3) break;
        distractors.push(e);
      }
    };
    // Q4: same deck + same type first - hardest, most topically plausible wrong answers
    addFrom(dPool.filter((o) => o.deck === c.deck && o.type === c.type));
    // Q1 fallback: same type, any deck (e.g. small or single-deck selections)
    if (distractors.length < 3) addFrom(dPool.filter((o) => o.type === c.type));
    // final fallback: whatever's left in the pool
    if (distractors.length < 3) addFrom(dPool);
    return {
      front: c.front, deck: c.deck, type: c.type, answer: c.english,
      example: c.example, exampleEn: c.exampleEn,
      options: shuffled([c.english, ...distractors]),
    };
  });
};
