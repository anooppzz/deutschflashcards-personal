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
// Why one guard per tap: Chrome skips history entries a page added without
// a tap of its own (its protection against pages that trap the back
// button) - and it trusts only ONE new entry per tap. A guard put back after
// a back press, or a second one from the same tap, made Chrome jump over
// the app's entries, so the next back left the app. So every tap while
// something is open adds one guard (up to MAX_GUARDS); every screen is
// opened by a tap, so there is a guard for every step back. Only when they
// are all used up is one added without a tap.
const MAX_GUARDS = 30;

// how many of our guards are below and including the current entry
const depthOf = (state) => (state && typeof state.appBack === "number" ? state.appBack : 0);

export function useBackButton(onBack) {
  const handler = useRef(onBack);
  handler.current = onBack;
  const depth = useRef(depthOf(window.history.state));
  const skipPops = useRef(0); // popstates caused by our own history.go()
  const [pops, setPops] = useState(0);
  const active = Boolean(onBack);

  const push = () => {
    depth.current += 1;
    window.history.pushState({ appBack: depth.current }, "");
  };
  // a tap (user activation): one more guard while something is open
  const onTapRef = useRef(() => {});
  onTapRef.current = () => {
    if (handler.current && depth.current < MAX_GUARDS) push();
  };

  useEffect(() => {
    // the tap that opened something adds the first guard (its pointerup
    // came before the click, when nothing was open yet)
    if (active && depth.current === 0) push();
    else if (!active && depth.current > 0) {
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
    const onTap = () => onTapRef.current();
    // Our entries are guards, not pages: the browser must not jump back to
    // the scroll position it saved with one - the app scrolls to what back
    // shows (e.g. a closed grammar topic's row) itself.
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.addEventListener("popstate", onPop);
    window.addEventListener("pointerup", onTap, true);
    window.addEventListener("keydown", onTap, true);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pointerup", onTap, true);
      window.removeEventListener("keydown", onTap, true);
    };
  }, []);
}
