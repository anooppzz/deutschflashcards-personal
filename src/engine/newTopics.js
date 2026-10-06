// "🆕 Neues Kapitel": a chapter carries "added": "YYYY-MM-DD" in
// extra-topics.json when it is created. For NEW_TOPIC_DAYS after that, the
// app offers it on the start screen until the learner opens it, dismisses it
// or already has it selected - new chapters are not ticked automatically, so
// without this they are easy to miss.
export const NEW_TOPIC_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;

export const newTopicsOf = (topics, { seen = [], selected = [], now = Date.now() } = {}) =>
  topics.filter((t) => {
    if (!t.added || seen.includes(t.key) || selected.includes(t.key)) return false;
    const age = now - Date.parse(t.added);
    return age >= -DAY_MS && age < NEW_TOPIC_DAYS * DAY_MS;
  });
