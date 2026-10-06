import PropTypes from "prop-types";

// 🎯 Heute lernen (engine/dailyPlan.js): today's steps on the start screen.
// steps: [{ key, icon, label, detail, done, action, onStart, extra }] – App
// builds them; a done step shows ✓ but can still be opened. The card folds
// to its header row (remembered for the day).

const GREEN = "#5fa85f";
const ACCENT = "#e0833b";

function DailyPlan({ steps, collapsed, onToggle }) {
  const done = steps.filter((s) => s.done).length;
  const all = done === steps.length;
  return (
    <div style={{ marginBottom: 12, borderRadius: 12, border: `1px solid ${all ? GREEN : ACCENT}`, background: all ? "rgba(95,168,95,.08)" : "rgba(224,131,59,.08)", overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 14px", background: "none", border: "none", color: "#f2f5f8", fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
      >
        <span>{all ? "🎉 Heute geschafft!" : "🎯 Heute lernen"}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: all ? GREEN : ACCENT, whiteSpace: "nowrap" }}>
          {done}/{steps.length} ✓
          <span aria-hidden="true" style={{ color: "#7d8d9c", transform: collapsed ? "none" : "rotate(180deg)", transition: "transform .2s" }}>▾</span>
        </span>
      </button>
      {!collapsed && (
        <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          {steps.map((s) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: "#161d24", border: "1px solid #2c3a47" }}>
              <span aria-hidden="true" style={{ fontSize: 18, width: 24, textAlign: "center" }}>{s.done ? "✅" : s.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: s.done ? "#9ab0c2" : "#f2f5f8" }}>{s.label}</span>
                <span style={{ display: "block", fontSize: 11, color: "#7d8d9c", marginTop: 1 }}>{s.detail}{s.extra}</span>
              </span>
              {s.onStart && (
                <button
                  type="button"
                  onClick={s.onStart}
                  style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", border: s.done ? "1px solid #2c3a47" : "none", background: s.done ? "transparent" : ACCENT, color: s.done ? "#9ab0c2" : "#0e1419" }}
                >{s.action || "Start"} →</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

DailyPlan.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    detail: PropTypes.node,
    done: PropTypes.bool,
    action: PropTypes.string,
    onStart: PropTypes.func,
    extra: PropTypes.node,
  })).isRequired,
  collapsed: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};

export default DailyPlan;
