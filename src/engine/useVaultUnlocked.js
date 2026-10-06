import { useEffect, useState } from "react";
import { isUnlocked, onVaultChange } from "./aiVault";

// Whether the AI keys are unlocked right now (engine/aiVault.js); re-renders
// on unlock/lock and notices the idle lock within half a minute.
export function useVaultUnlocked() {
  const [unlocked, setUnlocked] = useState(() => isUnlocked());
  useEffect(() => {
    const check = () => setUnlocked(isUnlocked());
    const off = onVaultChange(check);
    const t = setInterval(check, 30000);
    return () => { off(); clearInterval(t); };
  }, []);
  return unlocked;
}
