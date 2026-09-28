// Links a vocabulary card to the grammar topics whose `match` rule covers
// it - e.g. a noun ending in -ung -> the "Genus nach Endung" topic. The
// rules live in the grammar data (topics.json), not here, so covering a new
// ending is a data change. A rule only links a card whose own gender agrees
// with it: "der Sprung" ends in -ung but is masculine (the -ung belongs to
// the stem, it isn't the suffix), so it gets no link rather than a tip that
// contradicts the card.
import { bareForm } from "./wordForm";

export const grammarLinksFor = (card, topics) => {
  if (!card || !card.front || !Array.isArray(topics)) return [];
  const word = bareForm(card.front).split(/\s+/).pop().toLowerCase();
  const links = [];
  for (const topic of topics) {
    const m = topic.match;
    if (!m) continue;
    if (m.type && card.type !== m.type) continue;
    if (m.gender && card.gender !== m.gender) continue;
    // longest ending first, and the word must be longer than the ending
    const ending = [...(m.endings || [])]
      .sort((a, b) => b.length - a.length)
      .find((e) => word.length > e.length && word.endsWith(e));
    if (!ending) continue;
    links.push({
      key: topic.key,
      ending,
      label: m.gender ? `-${ending} → ${m.gender}` : `-${ending}`,
    });
  }
  return links;
};

// The one-line tip for a link, e.g. "Nomen auf -ung sind immer feminin: die."
// Topic hints are per-language like the rest of the grammar data, with
// "{ending}" filled in from the link; falls back to en, then de.
export const grammarHintFor = (link, topics, lang = "en") => {
  const topic = Array.isArray(topics) ? topics.find((t) => t.key === link.key) : null;
  if (!topic || !topic.hint) return null;
  const text = topic.hint[lang] || topic.hint.en || topic.hint.de;
  return text ? text.replace(/\{ending\}/g, link.ending) : null;
};
