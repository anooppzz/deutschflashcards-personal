// All color coding lives here. Gender colors especially are a UI convention
// used throughout the app (der=blue, die=red, das=gold) — if this changes,
// it only needs to change in one place.

export const GENDER_COLORS = { der: "#4f86c6", die: "#c6534f", das: "#c69a3b" };
// a noun with two genders ("der/die Bekannte") takes the colour of its first one
export const genderColor = (gender) => GENDER_COLORS[gender] || GENDER_COLORS[String(gender || "").split("/")[0]];

export const TYPE_META = {
  v: { color: "#5fa85f", label: "Verb" },
  adj: { color: "#9c6cc4", label: "Adjektiv" },
  sonst: { color: "#3ba39b", label: "Sonstige" },
};

// Colors for irregular verb Rhythmusliste groups (e.g. "a – i – a").
export const GROUP_COLORS = {
  "a – i – a": "#e0833b",
  "a – u – a": "#c6534f",
  "e – a – e": "#4f86c6",
  "e – a – o": "#7e6cc4",
  "i – a – u": "#3ba39b",
  "ie – o – o": "#c69a3b",
  "ei – ie – ie": "#5fa85f",
  "Mischverben": "#9c6cc4",
};
