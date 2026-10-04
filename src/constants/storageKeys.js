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
};
