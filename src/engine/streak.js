// Daily goal & streak. "Review" = any graded action: a quiz/article answer,
// or a manual ✓/↻ mark. A day's goal is met once that day's review count
// reaches `goal`; streak increments exactly once per day at the moment the
// goal is crossed.
import { STORAGE_KEYS } from "../constants";
import { storage } from "./storage";

export const localDateStr = (d = new Date()) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const addDaysStr = (dateStr, delta) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return localDateStr(dt);
};

export const saveStreak = (data) => {
  try { storage.set(STORAGE_KEYS.STREAK, JSON.stringify(data)); } catch {}
};

// What to show right now without needing the user to act first (so a broken
// streak is visible immediately, the way it would be in any habit tracker).
export const effectiveStreakDisplay = (data) => {
  if (!data) return 0;
  const today = localDateStr();
  if (data.date === today) return data.streak;
  const yesterday = addDaysStr(today, -1);
  if (data.date === yesterday && data.count >= data.goal) return data.streak; // still valid, hasn't acted today yet
  return 0;
};
