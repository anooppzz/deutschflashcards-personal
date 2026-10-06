// 📰 Lesen: short texts per chapter (src/data/reading/texts.json).
// In a paragraph, [[surface|card front]] marks a word that opens its card
// ([[front]] when the text shows the front unchanged). A link resolves to the
// card with that front in the text's own chapter first, then in any deck.

const LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// "Ich [[komme aus|kommen aus …]] Graz." ->
// [{ text: "Ich " }, { text: "komme aus", front: "kommen aus …" }, { text: " Graz." }]
export const parseParagraph = (p) => {
  const out = [];
  let at = 0;
  for (const m of p.matchAll(LINK)) {
    if (m.index > at) out.push({ text: p.slice(at, m.index) });
    out.push({ text: m[1], front: m[2] || m[1] });
    at = m.index + m[0].length;
  }
  if (at < p.length) out.push({ text: p.slice(at) });
  return out;
};

// The paragraph as plain text (for reading it aloud).
export const plainParagraph = (p) => parseParagraph(p).map((s) => s.text).join("");

// cardsByFront: Map front -> [cards]
export const indexCardsByFront = (cards) => {
  const map = new Map();
  for (const c of cards) {
    if (!map.has(c.front)) map.set(c.front, []);
    map.get(c.front).push(c);
  }
  return map;
};

export const resolveLink = (front, deck, cardsByFront) => {
  const found = cardsByFront.get(front) || [];
  return found.find((c) => c.deck === deck) || found[0] || null;
};

// Texts for the chosen chapters, in chapter order.
export const textsForDecks = (texts, decks) => texts.filter((t) => decks.includes(t.deck));
