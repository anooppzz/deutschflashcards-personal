import { useEffect, useRef, useState } from "react";

// The phone's back button / back swipe (Android) and the browser's back
// button step back inside the app instead of leaving it.
//
// onBack: what "back" does right now (close a dialog, leave search, return
// to Karten …), or null when there is nothing left to go back to - then
// back leaves the app as usual.
//
// How: while there is somewhere to go back to, extra history entries
// ("guards") sit on top of the page. Back pops one (popstate) and onBack
// runs. When the app returns to its start screen some other way (a tap),
// the guards are removed again, so the next back leaves the app right away.
//
// Why a stock of GUARDS guards and not one: Chrome skips history entries a
// page added without a tap (its protection against pages that trap the back
// button). A guard put back right after a back press has no tap behind it,
// so Chrome marked the page under it "skippable" and the NEXT back left the
// app. So guards are added while the learner taps (user activation), enough
// for several backs in a row; only if all are used up without a tap in
// between is one added without it.
const GUARDS = 8;

// how many of our guards are below and including the current entry
const depthOf = (state) => (state && typeof state.appBack === "number" ? state.appBack : 0);
const activated = () => {
  const ua = typeof navigator !== "undefined" && navigator.userActivation;
  return ua ? ua.isActive : true;
};

export function useBackButton(onBack) {
  const handler = useRef(onBack);
  handler.current = onBack;
  const depth = useRef(depthOf(window.history.state));
  const skipPops = useRef(0); // popstates caused by our own history.go()
  const [pops, setPops] = useState(0);
  const active = Boolean(onBack);

  // add guards: a full stock while the learner is tapping, else just one
  const topUp = useRef(() => {});
  topUp.current = () => {
    if (!handler.current) return;
    const target = activated() ? GUARDS : Math.max(depth.current, 1);
    while (depth.current < target) {
      depth.current += 1;
      window.history.pushState({ appBack: depth.current }, "");
    }
  };

  useEffect(() => {
    if (active) topUp.current();
    else if (depth.current > 0) {
      // back at the start screen: drop the guards, so back leaves the app
      skipPops.current += 1;
      window.history.go(-depth.current);
      depth.current = 0;
    }
  }, [active, pops]);

  useEffect(() => {
    const onPop = (e) => {
      depth.current = depthOf(e.state);
      if (skipPops.current > 0) { skipPops.current -= 1; return; }
      if (handler.current) handler.current();
      setPops((n) => n + 1);
    };
    // every tap (a user activation) refills the stock
    const onTap = () => topUp.current();
    // Our entries are guards, not pages: the browser must not jump back to
    // the scroll position it saved with one - the app scrolls to what back
    // shows (e.g. a closed grammar topic's row) itself.
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.addEventListener("popstate", onPop);
    window.addEventListener("pointerup", onTap, true);
    window.addEventListener("keyup", onTap, true);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pointerup", onTap, true);
      window.removeEventListener("keyup", onTap, true);
    };
  }, []);
}
