// Curated language configuration. Adding a new curated language means
// extending the static translation table (see engine/translation/) AND
// adding it here — see project conventions: don't add live-API calls for
// curated languages as a shortcut.

// [code, short label, flag emoji] - drives the language switcher UI.
export const LANGUAGES = [
  ["en", "EN", "🇬🇧"],
  ["sq", "SQ", "🇦🇱"],
  ["ar", "AR", "🇸🇦"],
  ["uk", "UK", "🇺🇦"],
  ["hi", "HI", "🇮🇳"],
];

// Friendly labels only; not used by the translation engine itself.
export const LANG_NAMES = { sq: "Albanian", ar: "Arabic", uk: "Ukrainian", hi: "Hindi" };

// Flags shown in the in-app help modal (includes German/UI language, unlike LANGUAGES).
export const HELP_FLAGS = { en: "🇬🇧", de: "🇩🇪", sq: "🇦🇱", ar: "🇸🇦", uk: "🇺🇦", hi: "🇮🇳" };

// Terms where live machine translation is known to misfire (e.g. "than" can
// flip verb tense in Hindi) - these skip live translation and fall back to
// showing English instead. See translation priority chain, step 3.
export const HARD_TRANSLATE_TERMS = new Set(["than", "for example"]);
