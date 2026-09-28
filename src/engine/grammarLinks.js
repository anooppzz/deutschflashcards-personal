// Links vocabulary cards to grammar topics, in both directions: a card's 📖
// chips, and a topic's list of the learner's own words.
//
// A card is linked to a topic in one of two ways:
// 1. The topic's `match` rule covers it (one rule, or a list where any rule
//    may match). A rule can check `type`, `gender`, `decks`, `endings` (the
//    bare word ends in one of them) and `subPattern` (a regex tested against
//    the card's sub line, e.g. its Perfekt form "hat reserviert"). Rules live
//    in the grammar data (topics.json), so covering more words is a data
//    change. A gender rule only links a card whose own gender agrees with
//    it: "der Sprung" ends in -ung but is masculine (the -ung belongs to the
//    stem, it isn't the suffix), so it gets no link rather than a tip that
//    contradicts the card.
// 2. The card is tagged by hand: `"grammar": ["modalverben"]`.
import { bareForm } from "./wordForm";
import { idOf } from "./fsrs";

// "Perfekt (Vergangenheit)" -> "Perfekt" - short enough for a chip
const shortTitle = (topic) => (topic.title.de || topic.title.en).replace(/\s*\([^)]*\)\s*$/, "");

// Does one rule cover the card? Returns { ending } (null when the rule
// doesn't check endings) on a match, or null.
const ruleMatch = (rule, card, word) => {
  if (rule.type && card.type !== rule.type) return null;
  if (rule.gender && card.gender !== rule.gender) return null;
  if (rule.decks && !rule.decks.includes(card.deck)) return null;
  if (rule.subPattern && !new RegExp(rule.subPattern).test(card.sub || "")) return null;
  if (rule.endings) {
    // longest ending first, and the word must be longer than the ending
    const ending = [...rule.endings]
      .sort((a, b) => b.length - a.length)
      .find((e) => word.length > e.length && word.endsWith(e));
    return ending ? { ending } : null;
  }
  return { ending: null };
};

export const grammarLinksFor = (card, topics) => {
  if (!card || !card.front || !Array.isArray(topics)) return [];
  const word = bareForm(card.front).split(/\s+/).pop().toLowerCase();
  const tags = Array.isArray(card.grammar) ? card.grammar : [];
  const links = [];
  for (const topic of topics) {
    const rules = Array.isArray(topic.match) ? topic.match : topic.match ? [topic.match] : [];
    let hit = null;
    let rule = null;
    for (const r of rules) {
      hit = ruleMatch(r, card, word);
      if (hit) { rule = r; break; }
    }
    if (hit && hit.ending) {
      links.push({
        key: topic.key,
        ending: hit.ending,
        label: rule.gender ? `-${hit.ending} → ${rule.gender}` : `-${hit.ending}`,
      });
    } else if (hit || tags.includes(topic.key)) {
      links.push({ key: topic.key, label: shortTitle(topic) });
    }
  }
  return links;
};

// All links, computed once over every card: linksById maps a card id (see
// idOf) to its links; wordsByTopic maps a topic key to the words it covers,
// one entry per distinct word (a word in several decks is listed once, with
// all its decks), sorted alphabetically ignoring the article.
export const buildGrammarIndex = (cards, topics) => {
  const linksById = {};
  const byTopic = {};
  for (const card of cards) {
    const links = grammarLinksFor(card, topics);
    if (!links.length) continue;
    linksById[idOf(card.deck, card.front)] = links;
    for (const l of links) {
      const words = (byTopic[l.key] = byTopic[l.key] || new Map());
      const seen = words.get(card.front);
      if (seen) seen.decks.push(card.deck);
      else words.set(card.front, { front: card.front, english: card.english, decks: [card.deck] });
    }
  }
  const wordsByTopic = {};
  for (const [key, words] of Object.entries(byTopic)) {
    wordsByTopic[key] = [...words.values()].sort((a, b) =>
      bareForm(a.front).localeCompare(bareForm(b.front), "de", { sensitivity: "base" }));
  }
  return { linksById, wordsByTopic };
};

// The one-line tip for a link, e.g. "Nomen auf -ung sind immer feminin: die."
// Topic hints are per-language like the rest of the grammar data, with
// "{ending}" filled in from the link; falls back to en, then de. Only
// topics with a `hint` have one (currently the gender-by-ending rule).
export const grammarHintFor = (link, topics, lang = "en") => {
  const topic = Array.isArray(topics) ? topics.find((t) => t.key === link.key) : null;
  if (!topic || !topic.hint) return null;
  const text = topic.hint[lang] || topic.hint.en || topic.hint.de;
  return text ? text.replace(/\{ending\}/g, link.ending || "") : null;
};
