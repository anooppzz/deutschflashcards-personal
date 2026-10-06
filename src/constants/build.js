/* global __BUILD__ */
// Which deploy is running: set at build time in vite.config.js, shown at the
// bottom of the app so the learner can check a phone has the newest version.
export const BUILD = typeof __BUILD__ !== "undefined" ? __BUILD__ : { date: null, commit: "dev" };

export const buildLabel = (build = BUILD) => {
  const date = build.date ? new Date(build.date).toLocaleDateString("de-DE", { day: "numeric", month: "numeric", year: "numeric" }) : null;
  return `Version ${date ? `${date} · ` : ""}${build.commit}`;
};
