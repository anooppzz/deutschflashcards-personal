// Generic substring search across a card's string fields - powers the
// search box on every deck view (Cards mode's typed topics, irregular
// verbs, combined mode, etc.). Case-insensitive, matches any string field.
export const matches = (obj, q) => {
  if (!q) return true;
  const t = q.toLowerCase();
  return Object.values(obj).some(
    (v) => typeof v === "string" && v.toLowerCase().includes(t)
  );
};
