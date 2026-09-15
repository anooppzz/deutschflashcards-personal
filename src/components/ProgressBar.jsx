import PropTypes from "prop-types";

/* Per-deck progress bar (known cards / total + how many are due for review) */
function ProgressBar({ known, total, due }) {
  const pct = total ? Math.round((known / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#7d8d9c", marginBottom: 4 }}>
        <span>Fortschritt{typeof due === "number" ? ` · 📅 ${due} fällig` : ""}</span>
        <span>{known} / {total} gekonnt ({pct}%)</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${known} von ${total} Wörtern gekonnt`}
        style={{ height: 6, borderRadius: 4, background: "#1e2630", overflow: "hidden" }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: "#5fa85f", transition: "width .3s" }} />
      </div>
    </div>
  );
}

ProgressBar.propTypes = {
  known: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  due: PropTypes.number,
};

export default ProgressBar;
