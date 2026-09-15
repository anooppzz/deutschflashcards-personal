// Strip an article prefix ("die Banane" -> "Banane"), a separable-verb
// middot ("an·bieten" -> "anbieten"), and a trailing reflexive/parenthetical
// marker ("interessieren (sich)" -> "interessieren"). Shared by any mode
// that needs the "bare" spelling of a card's front value rather than its
// full display form - originally built for Cloze's sentence-matching, now
// also used by Word Search's grid placement.
export const bareForm = (front) =>
  front
    .replace(/^(der|die|das)(\/(der|die|das))?\s+/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/·/g, "")
    .trim();
