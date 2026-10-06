import { addDaysStr } from "./streak";

// 📅 Grammar topics come back like cards: finishing a topic's ✏️ Üben
// schedules its next review. At least 80% right → the gap grows (3 days,
// then ×2.5, up to 60 days); below that → tomorrow again.
// schedule: { [topicKey]: { interval, due: "YYYY-MM-DD", last: "YYYY-MM-DD" } }
export const PASS_RATIO = 0.8;
export const FIRST_INTERVAL = 3;
export const MAX_INTERVAL = 60;

export const scheduleTopic = (entry, right, total, today) => {
  const passed = total > 0 && right / total >= PASS_RATIO;
  const interval = !passed ? 1
    : entry && entry.interval >= FIRST_INTERVAL ? Math.min(MAX_INTERVAL, Math.round(entry.interval * 2.5))
    : FIRST_INTERVAL;
  return { interval, due: addDaysStr(today, interval), last: today };
};

export const isTopicDue = (entry, today) => Boolean(entry && entry.due <= today);

// Today's grammar step: the most overdue topic, else the first topic (in
// reference order) that has exercises and was never practised.
export const nextGrammarTopic = (topics, exercises, schedule, today) => {
  const due = topics
    .filter((t) => isTopicDue(schedule[t.key], today))
    .sort((a, b) => schedule[a.key].due.localeCompare(schedule[b.key].due));
  if (due.length) return { key: due[0].key, due: true };
  const fresh = topics.find((t) => (exercises[t.key] || []).length && !schedule[t.key]);
  return fresh ? { key: fresh.key, due: false } : null;
};
