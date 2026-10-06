// 🔎 Nachschlagen and 🤖 Frag Claude: links from a card or a grammar topic
// to free dictionaries, Google and Claude. All free, nothing is called from
// the app itself - each link just opens the site with the word filled in.
// Claude opens in the learner's own account (claude.ai/new?q=…); the same
// question is also copied, in case the app doesn't fill it in.

// The bare word to look up: no article, no separable dot, no "(sich)" or
// other brackets, the first of several alternatives ("Vielen Dank / …").
export const lookupTerm = (front) => {
  if (!front) return "";
  const first = front.split(/\s+\/\s+/)[0];
  return first
    .replace(/^(der\/die|der|die|das)\s+/i, "")
    .replace(/·/g, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*…\s*/g, " ")
    .replace(/[!?.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const enc = encodeURIComponent;

export const wordLinks = (front) => {
  const term = lookupTerm(front);
  if (!term) return [];
  return [
    { label: "Duden", url: `https://www.duden.de/suchen/dudenonline/${enc(term)}` },
    { label: "DWDS", url: `https://www.dwds.de/wb/${enc(term)}` },
    { label: "Verbformen", url: `https://www.verbformen.de/?w=${enc(term)}` },
    { label: "Reverso", url: `https://context.reverso.net/translation/german-english/${enc(term)}` },
    { label: "Leo", url: `https://dict.leo.org/german-english/${enc(term)}` },
    { label: "Google", url: `https://www.google.com/search?q=${enc(`${front} Deutsch Bedeutung`)}` },
  ];
};

export const topicLinks = (title) => [
  { label: "Google", url: `https://www.google.com/search?q=${enc(`${title} Deutsch Grammatik A2`)}` },
  { label: "YouTube", url: `https://www.youtube.com/results?search_query=${enc(`${title} Deutsch Grammatik A2`)}` },
];

const LEARNER = "I'm learning German at level A2 with the textbook Menschen A2.";

export const wordQuestion = ({ front, english, example }) => [
  `${LEARNER} Please explain „${front}“${english ? ` (${english})` : ""}.`,
  example ? `Example from my flashcards: ${example}` : null,
  "Give me: the meaning, the grammar (article and plural for a noun; Perfekt and the case it takes for a verb), 3 simple example sentences with English translations, and the mistakes learners often make. Keep it at A2 level.",
].filter(Boolean).join("\n");

export const topicQuestion = (title) => [
  `${LEARNER} Please explain the grammar topic „${title}“.`,
  "Give me: the rule in simple words, a small table if it helps, 5 example sentences with English translations and the mistakes learners often make. Then 5 short practice questions, with the answers at the end.",
].join("\n");

export const claudeUrl = (question) => `https://claude.ai/new?q=${enc(question)}`;
