// 🎓 DTZ trainer logic (format: docs/DTZ_FORMAT.md, sets: src/data/exam/dtz-sets.json).
// Hören items 1–20 and Lesen items 21–45 count together: from 20 right → A2,
// from 33 → B1 (official DTZ thresholds).

export const PARTS = { hoeren: "Hören", lesen: "Lesen" };
export const A2_FROM = 20;
export const B1_FROM = 33;

export const itemsOf = (teil) => teil.groups.flatMap((g) => g.items);
export const itemsOfPart = (set, part) => set[part].flatMap(itemsOf);

// The choices for one item: { key, label }
export const choicesFor = (teil, item) => {
  if (item.type === "rf") return [{ key: "richtig", label: "richtig" }, { key: "falsch", label: "falsch" }];
  if (item.type === "mc") return ["a", "b", "c"].map((k) => ({ key: k, label: item.options[k] }));
  const source = teil.sentences
    ? Object.entries(teil.sentences).map(([k, v]) => ({ key: k, label: v }))
    : (teil.ads || []).map((ad) => ({ key: ad.id, label: ad.title }));
  return teil.allowX ? [...source, { key: "x", label: "keine passende Anzeige" }] : source;
};

export const scoreItems = (items, answers) => ({
  right: items.filter((it) => answers[it.n] === it.answer).length,
  total: items.length,
});

// Level for Hören + Lesen together (45 items). Only meaningful for the full test.
export const levelFor = (right) => (right >= B1_FROM ? "B1" : right >= A2_FROM ? "A2" : "unter A2");

export const range = (items) => `${items[0].n}–${items[items.length - 1].n}`;

export const formatClock = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
