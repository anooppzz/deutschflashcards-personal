// 🎯 Heute lernen: one plan for the day on the start screen –
//   📅 due reviews · 🆕 new words (daily limit) · 📕 Fehlerheft · ✏️ one grammar topic.
// What was done today is kept per day:
// daily: { date: "YYYY-MM-DD", newIds: [card ids first seen today], grammar: bool, collapsed: bool }
export const NEW_PER_DAY_PRESETS = [5, 10, 15, 20];
export const DEFAULT_NEW_PER_DAY = 10;

export const freshDaily = (saved, today) =>
  saved && saved.date === today
    ? { newIds: [], grammar: false, collapsed: false, ...saved }
    : { date: today, newIds: [], grammar: false, collapsed: false };

export const addNewId = (daily, id) => (daily.newIds.includes(id) ? daily : { ...daily, newIds: [...daily.newIds, id] });

// Cards never practised, the selected chapters first, then all others in
// chapter order - so the plan keeps going after a chapter is finished.
export const newCardsFor = (cards, progress, selected, idOf, limit) => {
  const fresh = cards.filter((c) => !progress[idOf(c.deck, c.front)]);
  const first = fresh.filter((c) => selected.includes(c.deck));
  const rest = fresh.filter((c) => !selected.includes(c.deck));
  return [...first, ...rest].slice(0, limit);
};
