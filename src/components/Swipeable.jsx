import { useRef } from "react";
import PropTypes from "prop-types";

// Swipe left / right on a card to go to the next / previous one (phones).
// A tap still flips the card; up/down still scrolls the page (pan-y). A
// swipe swallows the click that the browser sends after it, so swiping
// doesn't also flip the card.
const MIN_DISTANCE = 50; // px

function Swipeable({ onNext, onPrev, children }) {
  const start = useRef(null);
  const swiped = useRef(false);
  return (
    <div
      style={{ touchAction: "pan-y" }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        start.current = { x: t.clientX, y: t.clientY };
        swiped.current = false;
      }}
      onTouchEnd={(e) => {
        if (!start.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.current.x;
        const dy = t.clientY - start.current.y;
        start.current = null;
        if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        swiped.current = true;
        if (dx < 0) onNext(); else onPrev();
      }}
      onClickCapture={(e) => {
        if (!swiped.current) return;
        swiped.current = false;
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      {children}
    </div>
  );
}

Swipeable.propTypes = {
  onNext: PropTypes.func.isRequired,
  onPrev: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default Swipeable;
