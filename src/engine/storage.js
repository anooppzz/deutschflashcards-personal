// Storage adapter (V1 rewrite step 1): localStorage instead of window.storage.
// Same async shape ({key, value} from .get, void from .set) so every call
// site that already does `await storage.get(...)` keeps working unchanged -
// only the underlying mechanism moved from the Claude-artifact-specific API
// to a standard browser one. No more "shared vs personal" flag either:
// localStorage is always scoped to one browser on one device, so two people
// studying from two different phones simply can never see each other's
// data - there's no setting that could get that wrong. The tradeoff, stated
// plainly: progress does not follow a person across devices, only across
// sessions on the same one.
export const storage = {
  get: async (key) => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? null : { key, value: v };
    } catch (e) {
      return null; // private-browsing / storage disabled - degrade to in-memory only, same as before
    }
  },
  set: async (key, value) => {
    try {
      localStorage.setItem(key, value);
      return { key, value };
    } catch (e) {
      return null;
    }
  },
  remove: async (key) => {
    try { localStorage.removeItem(key); } catch (e) {}
  },
};

// Generic string hash, used to build safe storage keys from arbitrary text
// (e.g. a custom typed language name, which may contain spaces/accents that
// aren't safe raw in a storage key).
export const hashStr = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};
