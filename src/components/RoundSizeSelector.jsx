import PropTypes from "prop-types";

// The "🔢 Runde: N" button shown in Article, Reverse, and Cloze mode. All
// three share the same round-size presets (see constants/roundSizes.js) and
// the same cycle-through-presets interaction; this component exists so that
// behavior and styling can't drift between call sites.
function RoundSizeSelector({ onCycle, label }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
      <button
        onClick={onCycle}
        aria-label={`Rundengröße: ${label}. Zum Ändern tippen.`}
        style={{ background: "none", border: "1px solid #2c3a47", borderRadius: 8, padding: "4px 10px", color: "#9ab0c2", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
      >🔢 Runde: {label}</button>
    </div>
  );
}

RoundSizeSelector.propTypes = {
  onCycle: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

export default RoundSizeSelector;
