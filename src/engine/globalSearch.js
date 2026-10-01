// App-wide search: every card in every deck (whatever topics are selected)
// plus the text of every grammar topic. Matching is forgiving the way a
// learner types on a phone: case, umlauts and ß don't matter, and the
// ae/oe/ue spellings work too - "fruhstuck", "fruehstueck" and "Frühstück"
// all find "frühstücken".

// Folds one string for matching. Returns the folded text plus, for every
// folded character, the index of the original character it came from - so
// a match in the folded text can be highlighted in the original.
export const foldWithMap = (s) => {
  const chars = [];
  const map = [];
  for (let i = 0; i < s.length; i++) {
    // NFD splits ä into a + combining diaeresis; dropping the combining
    // marks leaves the base letter (also for é, à …)
    const base = s[i].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    for (const ch of base === "ß" ? "ss" : base) {
      // ae / oe / ue are how umlauts are typed without them: fold to a / o / u
      if (ch === "e" && chars.length && "aou".includes(chars[chars.length - 1]) && map[map.length - 1] === i - 1) continue;
      chars.push(ch);
      map.push(i);
    }
  }
  return { folded: chars.join(""), map };
};

export const fold = (s) => foldWithMap(s || "").folded;

// Where q occurs in text, as [start, end) ranges in the ORIGINAL text.
export const matchRanges = (text, q) => {
  const fq = fold(q.trim());
  if (!text || !fq) return [];
  const { folded, map } = foldWithMap(text);
  const ranges = [];
  let from = 0;
  for (;;) {
    const at = folded.indexOf(fq, from);
    if (at < 0) break;
    const last = at + fq.length - 1;
    ranges.push([map[at], map[last] + 1]);
    from = at + fq.length;
  }
  return ranges;
};

const ARTICLE = /^(der|die|das|der\/die)\s+/;
// true when q starts a word in text ("kunde" in "der Kunde", "fahr" in "Rad fahren")
const startsWord = (text, q) => {
  const at = text.indexOf(q);
  if (at < 0) return false;
  if (at === 0 || !/[a-z0-9]/.test(text[at - 1])) return true;
  return startsWord(text.slice(at + 1), q);
};

// How well one card matches; 0 = not at all. The German word itself counts
// most, then its forms (plural, Perfekt), then the meaning, then the note and
// the example sentence.
export const scoreCard = (card, fq) => {
  const front = fold(card.front);
  const bare = front.replace(ARTICLE, "");
  if (bare === fq || front === fq) return 100;
  if (bare.startsWith(fq)) return 85;
  if (startsWord(front, fq)) return 75;
  if (front.includes(fq)) return 65;
  const sub = fold(card.sub);
  if (startsWord(sub, fq)) return 55;
  const english = fold(card.english);
  if (startsWord(english, fq)) return 50;
  if (sub.includes(fq)) return 45;
  if (english.includes(fq)) return 40;
  if (fold(card.note).includes(fq)) return 25;
  if (fq.length >= 3 && (fold(card.example).includes(fq) || fold(card.exampleEn).includes(fq))) return 15;
  return 0;
};

// Several words ("hat gemacht", "take care"): if the whole phrase isn't
// found, a card still counts when every word appears somewhere on it.
const scoreAllWords = (card, words) => {
  const all = fold([card.front, card.sub, card.english, card.note, card.example, card.exampleEn].filter(Boolean).join(" "));
  return words.every((w) => all.includes(w)) ? 10 : 0;
};

export const MIN_QUERY = 2;

export const searchCards = (cards, q) => {
  const fq = fold(q.trim());
  if (fq.length < MIN_QUERY) return [];
  const words = fq.split(/\s+/).filter(Boolean);
  return cards
    .map((card, i) => ({ card, i, score: scoreCard(card, fq) || (words.length > 1 ? scoreAllWords(card, words) : 0) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.card.front.length - b.card.front.length || a.i - b.i)
    .map((r) => r.card);
};

// ---- grammar ----

const textsOf = (field) => (typeof field === "string" ? [field] : field ? Object.values(field) : []);
const plain = (s) => s.replace(/\*\*/g, "");

// Every piece of text in a topic, with a weight for where it sits: the title
// matters most, then the one-line rule, section titles, the body (tables,
// bullets, warnings) and finally the example sentences. Both languages are
// indexed, so "dative" and "Dativ" both find the Dativ topic.
export const buildGrammarSearchIndex = (topics) =>
  topics.map((t) => {
    const entries = [];
    const add = (field, weight) => textsOf(field).forEach((text) => entries.push({ text: plain(text), folded: fold(plain(text)), weight }));
    add(t.title, 100);
    add(t.summary, 60);
    (t.sections || []).forEach((s) => {
      add(s.title, 50);
      (s.head || []).forEach((h) => add(h, 30));
      (s.rows || []).forEach((row) => row.forEach((cell) => add(cell, 30)));
      (s.items || []).forEach((item) => add(item, 30));
      add(s.text, 30);
    });
    (t.examples || []).forEach((ex) => add(ex, 20));
    return { topic: t, entries };
  });

// Matching topics, best first, each with the text that matched (for a
// snippet). Among equally good texts, one in the reader's language wins.
export const searchGrammar = (index, q, lang = "en") => {
  const fq = fold(q.trim());
  if (fq.length < MIN_QUERY) return [];
  const words = fq.split(/\s+/).filter(Boolean);
  const results = [];
  for (const { topic, entries } of index) {
    let best = null;
    for (const e of entries) {
      let score = 0;
      if (e.folded.includes(fq)) score = e.weight + (startsWord(e.folded, fq) ? 5 : 0);
      else if (words.length > 1 && words.every((w) => e.folded.includes(w))) score = e.weight / 2;
      if (!score) continue;
      if (!best || score > best.score) best = { score, text: e.text };
    }
    if (best) results.push({ topic, score: best.score, snippet: best.text });
  }
  // a snippet in the reader's language reads better: re-pick among the
  // matching texts of the same weight, preferring that language's version
  return results
    .map((r) => {
      const localized = localizedSnippet(r.topic, fq, lang, r.score);
      return localized ? { ...r, snippet: localized } : r;
    })
    .sort((a, b) => b.score - a.score);
};

// Same search over one language's texts only; null when nothing in that
// language matches as well as the best match did.
const localizedSnippet = (topic, fq, lang, score) => {
  const pick = (field) => (typeof field === "string" ? field : field && (field[lang] || field.en));
  const texts = [];
  const add = (field, weight) => { const s = pick(field); if (s) texts.push({ text: plain(s), weight }); };
  add(topic.title, 100);
  add(topic.summary, 60);
  (topic.sections || []).forEach((s) => {
    add(s.title, 50);
    (s.head || []).forEach((h) => add(h, 30));
    (s.rows || []).forEach((row) => row.forEach((c) => add(c, 30)));
    (s.items || []).forEach((i) => add(i, 30));
    add(s.text, 30);
  });
  (topic.examples || []).forEach((ex) => add(ex, 20));
  const hit = texts.find((t) => {
    const f = fold(t.text);
    return f.includes(fq) && t.weight + (startsWord(f, fq) ? 5 : 0) >= score;
  });
  return hit ? hit.text : null;
};
