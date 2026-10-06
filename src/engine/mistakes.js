// 📕 Fehlerheft: every wrong answer, from every trainer and from the grammar
// exercises, lands here and stays until it has been answered right on two
// different days (a lucky guess the same day doesn't clear it; a new mistake
// starts the count again).
//
// book: { [id]: { wrong, rightDays: ["YYYY-MM-DD", …], last: "YYYY-MM-DD" } }
// ids:  card ids ("deck::front", see idOf) and grammar questions
//       ("grammar::<topic key>::<question>", see grammarMistakeId).
export const CLEAR_AFTER_DAYS = 2;

const GRAMMAR_PREFIX = "grammar::";
export const grammarMistakeId = (topicKey, q) => `${GRAMMAR_PREFIX}${topicKey}::${q}`;
export const isGrammarMistakeId = (id) => id.startsWith(GRAMMAR_PREFIX);
export const parseGrammarMistakeId = (id) => {
  const [topic, ...rest] = id.slice(GRAMMAR_PREFIX.length).split("::");
  return { topic, q: rest.join("::") };
};

// The book after one answer. Returns the same object when nothing changed,
// so callers can skip saving.
export const recordAnswer = (book, id, correct, today) => {
  if (!id) return book;
  const entry = book[id];
  if (!correct) {
    return { ...book, [id]: { wrong: (entry ? entry.wrong : 0) + 1, rightDays: [], last: today } };
  }
  if (!entry || entry.rightDays.includes(today)) return book;
  const rightDays = [...entry.rightDays, today];
  if (rightDays.length >= CLEAR_AFTER_DAYS) {
    const next = { ...book };
    delete next[id];
    return next;
  }
  return { ...book, [id]: { ...entry, rightDays } };
};

// Entries sorted for the list: most mistakes first, then most recent.
export const sortedEntries = (book) =>
  Object.entries(book)
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => b.wrong - a.wrong || (b.last || "").localeCompare(a.last || ""));
