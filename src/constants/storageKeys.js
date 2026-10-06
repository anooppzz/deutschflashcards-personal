// Every localStorage key the app uses, in one place. Centralizing these
// prevents accidental key collisions and makes it obvious at a glance what
// gets persisted. If you add a new piece of persisted state, add its key
// here rather than inlining a string literal at the call site.
export const STORAGE_KEYS = {
  PROGRESS: "progress:v1",
  STREAK: "streak:v1",
  LANG: "lang:v1",
  CUSTOM_LANGS: "customLangs:v1",
  WELCOME_SEEN: "welcomeSeen:v1",
  ARTICLE_SIZE: "articleSize:v1",
  CLOZE_SIZE: "clozeSize:v1",
  TABS: "tabs:v1", // selected topics, restored on reload
  MODE: "mode:v1", // last study mode
  BACKUP_AT: "backupAt:v1", // when the learner last saved a backup file
  FORMS_KIND: "formsKind:v1", // Formen trainer: "perfekt" or "plural"
  GRAMMAR_SCORES: "grammarScores:v1", // best ✏️ Üben score per grammar topic
  MISTAKES: "mistakes:v1", // 📕 Fehlerheft: wrong answers until fixed (engine/mistakes.js)
  SEEN_NEW: "seenNewTopics:v1", // new chapters already opened or dismissed (engine/newTopics.js)
  REVERSE_PROMPT: "reversePrompt:v1", // Reverse mode: "meaning" (read) or "audio" (🎧 Hören)
  READING_SCORES: "readingScores:v1", // 📰 Lesen: best question score per text
  DAILY: "daily:v1", // 🎯 Heute lernen: what was done today (engine/dailyPlan.js)
  NEW_PER_DAY: "newPerDay:v1", // 🎯 daily goal for new words
  GRAMMAR_REVIEW: "grammarReview:v1", // 📅 when each grammar topic is due again (engine/grammarReview.js)
  DTZ_RESULTS: "dtzResults:v1", // 🎓 DTZ trainer: last results [{ at, mode, label, right, total }]
};
