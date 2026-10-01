// Installable app + offline use, for the live site (GitHub Pages, https).
// The downloadable HTML file opened from file:// needs none of this - it is
// already self-contained - so nothing here runs there.
//
// - registers public/sw.js, which caches the app so it opens without internet
// - keeps Chrome/Android's install prompt so the backup panel can offer an
//   "App installieren" button (iPhones have no prompt: Share → Home Screen)
let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((f) => f());

export const initPwa = () => {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener("appinstalled", () => { deferredPrompt = null; notify(); });
  // secure context = https (or localhost while testing); never file://
  if (window.isSecureContext && location.protocol !== "file:" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
};

export const canPromptInstall = () => Boolean(deferredPrompt);
export const onInstallChange = (f) => { listeners.add(f); return () => listeners.delete(f); };

export const promptInstall = async () => {
  if (!deferredPrompt) return false;
  const e = deferredPrompt;
  deferredPrompt = null;
  e.prompt();
  const choice = await e.userChoice.catch(() => null);
  notify();
  return Boolean(choice && choice.outcome === "accepted");
};

export const isStandalone = () =>
  (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
  || (typeof navigator !== "undefined" && navigator.standalone === true);

export const isIos = () =>
  typeof navigator !== "undefined"
  && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// Asks the browser not to evict this site's storage under pressure. Only
// called after a learner action (saving a backup), because Firefox shows a
// permission prompt for it.
export const requestPersistentStorage = () => {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch { /* not supported */ }
};
