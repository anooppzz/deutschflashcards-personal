import { useEffect, useRef, useState } from "react";

// The phone's back button / back swipe (Android) and the browser's back
// button step back inside the app instead of leaving it.
//
// onBack: what "back" does right now (close a dialog, leave search, return
// to Karten …), or null when there is nothing left to go back to - then
// back leaves the app as usual.
//
// How: while there is somewhere to go back to, one extra history entry sits
// on top. Back pops it (popstate), and onBack runs; if there is still
// somewhere to go back to, the entry is put back. When the app returns to
// its start screen some other way (a tap), the entry is removed again, so
// the next back leaves the app right away.
export function useBackButton(onBack) {
  const handler = useRef(onBack);
  handler.current = onBack;
  const guard = useRef(false); // our entry is on top of the history
  const skipPop = useRef(false); // the next popstate is our own history.back()
  const [pops, setPops] = useState(0);
  const active = Boolean(onBack);

  useEffect(() => {
    if (active && !guard.current) {
      window.history.pushState({ appBack: true }, "");
      guard.current = true;
    } else if (!active && guard.current) {
      guard.current = false;
      skipPop.current = true;
      window.history.back();
    }
  }, [active, pops]);

  useEffect(() => {
    const onPop = () => {
      if (skipPop.current) { skipPop.current = false; return; }
      guard.current = false;
      if (handler.current) handler.current();
      setPops((n) => n + 1);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
}
