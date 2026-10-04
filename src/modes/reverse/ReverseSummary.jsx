/* Reverse Mode end-of-round summary - score + what was typed incorrectly */
function ReverseSummary({ score, mistakes, onRestart, onRetryMistakes }) {
  const pct = score.total ? Math.round((score.right / score.total) * 100) : 0;
  const emoji = pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📚";
  return (
    <div style={{ textAlign: "center", padding: "10px 4px" }}>
      <div style={{ fontSize: 44, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#f2f5f8" }}>
        {score.right} / {score.total} richtig ({pct}%)
      </div>
      {mistakes.length > 0 ? (
        <>
          <div style={{ marginTop: 18, fontSize: 12, color: "#9ab0c2", textAlign: "left" }}>Falsch geschrieben:</div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {mistakes.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 12px", borderRadius: 10, background: "#161d24", border: "1px solid #2c3a47", fontSize: 12 }}>
                <div style={{ color: "#f2f5f8", fontWeight: 600 }}>
                  {m.english}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ color: "#c6534f" }}>Du: {m.userInput}{m.reason === "wrong-article" ? " (Artikel!)" : m.reason === "missing-article" ? " (ohne Artikel)" : ""}</span>
                  <span style={{ color: "#5fa85f" }}>Korrekt: {m.front}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ marginTop: 18, fontSize: 13, color: "#5fa85f", fontWeight: 600 }}>Alles richtig! 🎉</div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        {mistakes.length >= 2 && (
          <button
            onClick={onRetryMistakes}
            style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #e0833b", background: "transparent", color: "#e0833b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >↻ Fehler üben ({mistakes.length})</button>
        )}
        <button
          onClick={onRestart}
          style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: "#e0833b", color: "#0e1419", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >🔁 Neue Runde</button>
      </div>
    </div>
  );
}

export default ReverseSummary;
