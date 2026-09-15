import PropTypes from "prop-types";
import { ctrlBtn } from "./cardStyles";

function Controls({ index, total, onPrev, onNext, onShuffle, isShuffled }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
      <button onClick={onPrev} aria-label="Vorherige Karte" style={ctrlBtn}>← Prev</button>
      <span aria-live="polite" style={{ fontSize: 13, color: "#7d8d9c", minWidth: 64, textAlign: "center" }}>
        {total ? index + 1 : 0} / {total}
        {isShuffled && <span style={{ display: "block", fontSize: 10, color: "#e0833b", marginTop: 2 }}>🔀 gemischt</span>}
      </span>
      <button onClick={onNext} aria-label="Nächste Karte" style={ctrlBtn}>Next →</button>
      <button
        onClick={onShuffle}
        aria-pressed={isShuffled}
        style={{
          ...ctrlBtn,
          borderColor: "#e0833b",
          background: isShuffled ? "#e0833b" : "transparent",
          color: isShuffled ? "#0e1419" : "#e0833b",
        }}
      >{isShuffled ? "↻ Zurücksetzen" : "⤮ Shuffle"}</button>
    </div>
  );
}

Controls.propTypes = {
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onShuffle: PropTypes.func.isRequired,
  isShuffled: PropTypes.bool,
};

export default Controls;
