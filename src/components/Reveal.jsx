import { useEffect, useRef } from "react";
import PropTypes from "prop-types";

// Something that opens below what was tapped (a word's card under a text, a
// grammar topic or a search result): when it appears, scroll just enough to
// show it – no scroll if it is already on screen.
function Reveal({ children, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !el.scrollIntoView) return;
    // after the browser has laid it out (the card's height is known)
    const t = requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    return () => cancelAnimationFrame(t);
  }, []);
  return <div ref={ref} style={{ scrollMarginBottom: 12, ...style }}>{children}</div>;
}

Reveal.propTypes = { children: PropTypes.node, style: PropTypes.object };

export default Reveal;
