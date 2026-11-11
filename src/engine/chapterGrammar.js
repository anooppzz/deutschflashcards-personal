// 📌 "Zu diesem Kapitel": the grammar a textbook chapter teaches, picked by
// hand in extra-topics.json – "grammarTopics": ["indirekte-fragen",
// "praep-ort#im-haus"]. A ref is a topic key, optionally with "#" and the id
// of one of its sections (topics.json: a section's "id"), so a link can open
// the part of a long topic that belongs to the chapter.
//
// Section refs are also what a 🔍 search result carries: a number (the
// section's index) there, an id here – sectionIndex() takes both.

export const parseGrammarRef = (ref) => {
  const [key, section = null] = String(ref).split("#");
  return { key, section };
};

// index of a section in a topic, from its id or its index; null if none
export const sectionIndex = (topic, section) => {
  if (!topic || section == null || section === "") return null;
  const sections = topic.sections || [];
  if (typeof section === "number") return section >= 0 && section < sections.length ? section : null;
  const i = sections.findIndex((s) => s.id === section);
  return i >= 0 ? i : null;
};

// the DOM id of a section on its topic page (GrammarSections.jsx)
export const sectionDomId = (topicKey, index) => `grammar-sec-${topicKey}-${index}`;

// one chapter's links, resolved: [{ key, section (index | null), topic, label }]
// label: the section's title (or the topic's title for a whole topic)
export const chapterGrammarOf = (chapter, topics) => {
  const byKey = new Map(topics.map((t) => [t.key, t]));
  return (chapter?.grammarTopics || []).map((ref) => {
    const { key, section } = parseGrammarRef(ref);
    const topic = byKey.get(key);
    if (!topic) return null;
    const index = section == null ? null : sectionIndex(topic, section);
    if (section != null && index == null) return null;
    const label = index != null && topic.sections[index].title ? topic.sections[index].title : topic.title;
    return { ref, key, section: index, topic, label };
  }).filter(Boolean);
};

// the selected chapters that name their grammar, in selection order
export const chapterGrammarFor = (chapterKeys, chaptersByKey, topics) =>
  chapterKeys
    .map((k) => chaptersByKey[k])
    .filter(Boolean)
    .map((chapter) => ({ chapter, items: chapterGrammarOf(chapter, topics) }))
    .filter((c) => c.items.length > 0);
