// Pure text helpers for the grammar view (kept out of the .jsx files so
// those only export components).

// Grammar text is per-language: { de, en, ... } with a fallback to en,
// then de. Table cells may also be plain strings - German forms are the
// same in every language.
export const localize = (field, lang) =>
  typeof field === "string" ? field : field[lang] || field.en || field.de;

// Inline markup: **x** highlights x.
// "wohn**st**" -> [{ text: "wohn", hl: false }, { text: "st", hl: true }]
export const parseHighlights = (text) => {
  const parts = [];
  text.split("**").forEach((chunk, i) => {
    if (chunk) parts.push({ text: chunk, hl: i % 2 === 1 });
  });
  return parts;
};
