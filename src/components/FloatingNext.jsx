import { useRef, useEffect } from "react";
import PropTypes from "prop-types";

/* Fixed bottom bar for the "Weiter →" action - stays visible regardless of
   how tall the answered content above gets, so there's never a need to
   scroll to find it. */
function FloatingNext({ onNext, label = "Weiter →", autoFocus = false, onKeyDown = null }) {
  const buttonRef = useRef(null);

  // Auto-focus for keyboard-driven workflows (e.g., Reverse Mode)
  useEffect(() => {
    if (autoFocus && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onNext();
    }
    // Allow custom onKeyDown if provided
    if (onKeyDown) onKeyDown(e);
  };

  // Sticky, not fixed: a fixed-to-viewport button stays pinned to the literal
  // bottom of the browser window regardless of how tall that window is - on a
  // large desktop screen that can mean a long, inconvenient mouse trip from
  // the card down to the button. Sticky instead only "sticks" within the
  // bounds of its own container: if the question/answer block is shorter
  // than the viewport (the common large-screen case), the button simply
  // renders right after the content, in its natural place - no special-casing
  // needed for screen size, the CSS itself adapts.
  return (
    <div style={{ position: "sticky", bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", paddingTop: 14, marginTop: 14, zIndex: 50 }}>
      <button
        ref={buttonRef}
        onClick={onNext}
        onKeyDown={handleKeyDown}
        style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: "#e0833b", color: "#0e1419", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,.4)" }}
      >{label}</button>
    </div>
  );
}

export default FloatingNext;

FloatingNext.propTypes = {
  onNext: PropTypes.func.isRequired,
  label: PropTypes.string,
  autoFocus: PropTypes.bool,
  onKeyDown: PropTypes.func,
};
