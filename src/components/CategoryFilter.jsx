import PropTypes from "prop-types";

// Generic array toggle: add key if absent, remove if present.
const toggle = (arr, key) =>
  arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];

/* Multi-select category filter with a Select-all toggle */
function CategoryFilter({ cats, active, onChange, setIdx, colorFor, allKeys }) {
  const allOn = allKeys.every((k) => active.includes(k));
  const chip = (on, color, content, onClick, key, label) => (
    <button
      key={key}
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      style={{
        padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
        border: on ? "none" : "1px solid #2c3a47",
        background: on ? color : "#1e2630",
        color: on ? "#fff" : "#9aa7b3",
        display: "inline-flex", alignItems: "center", gap: 5,
      }}
    >{content}</button>
  );
  return (
    <div role="group" aria-label="Filter" style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 18, flexWrap: "wrap" }}>
      {chip(
        allOn, "#e0833b",
        <><span aria-hidden="true">{allOn ? "✓" : "▢"}</span> Alle</>,
        () => { onChange(allOn ? [] : [...allKeys]); setIdx(0); },
        "__all__",
        allOn ? "Alle ausgewählt, zum Abwählen tippen" : "Alle auswählen"
      )}
      {cats.map(([key, lbl]) => {
        const on = active.includes(key);
        return chip(
          on, colorFor(key),
          <>{on && <span aria-hidden="true">✓</span>} {lbl}</>,
          () => { onChange(toggle(active, key)); setIdx(0); },
          key,
          `${lbl}${on ? ", ausgewählt" : ""}`
        );
      })}
    </div>
  );
}

CategoryFilter.propTypes = {
  cats: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  active: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  setIdx: PropTypes.func.isRequired,
  colorFor: PropTypes.func.isRequired,
  allKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default CategoryFilter;
