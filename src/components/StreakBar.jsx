import PropTypes from "prop-types";

function StreakBar({ streak, count, goal, recordStreak, onCycleGoal }) {
  const metToday = count >= goal;
  const pct = Math.min(100, Math.round((count / goal) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 12px", borderRadius: 12, background: "#161d24", border: "1px solid #2c3a47" }}>
      <div aria-hidden="true" style={{ fontSize: 22 }}>{metToday ? "🔥" : "🕯️"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 11, color: "#7d8d9c", marginBottom: 4 }}>
          <span>
            {streak > 0 ? `${streak} Tage Streak` : "Starte deinen Streak"}
            {recordStreak > streak && recordStreak > 0 ? ` · Rekord ${recordStreak}` : ""}
          </span>
          <button onClick={onCycleGoal} aria-label={`Tagesziel: ${count} von ${goal}. Zum Ändern tippen.`} style={{ background: "none", border: "none", color: "#9ab0c2", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>
            {count}/{goal} heute
          </button>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tagesziel-Fortschritt"
          style={{ height: 6, borderRadius: 4, background: "#1e2630", overflow: "hidden" }}
        >
          <div style={{ width: `${pct}%`, height: "100%", background: metToday ? "#5fa85f" : "#e0833b", transition: "width .3s" }} />
        </div>
      </div>
    </div>
  );
}

StreakBar.propTypes = {
  streak: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  goal: PropTypes.number.isRequired,
  recordStreak: PropTypes.number,
  onCycleGoal: PropTypes.func.isRequired,
};

export default StreakBar;
