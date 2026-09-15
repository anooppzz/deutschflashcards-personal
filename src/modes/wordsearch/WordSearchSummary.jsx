import PropTypes from "prop-types";
import { speak } from "../../engine/speech";
import { iconBtn } from "../../components/cardStyles";

/* Word Search end-of-round recap - every found word gets its meaning +
   example sentence shown, same reveal shape as FlipCard's back face.
   Words that were revealed but never actually found are shown separately
   and honestly labeled, not folded in as if they'd been "won". */
function WordSearchSummary({ placements, foundWords, onRestart }) {
  const found = placements.filter((p) => foundWords.has(p.word));
  const missed = placements.filter((p) => !foundWords.has(p.word));

  return (
    <div style={{ textAlign: "center", padding: "10px 4px" }}>
      <div style={{ fontSize: 44, marginBottom: 6 }}>{missed.length === 0 ? "🏆" : "🔤"}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#f2f5f8", marginBottom: 18 }}>
        {found.length} / {placements.length} gefunden
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
        {found.map((p) => (
          <div key={p.word} style={{ padding: "10px 14px", borderRadius: 10, background: "#161d24", border: "1px solid #2c3a47" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#5fa85f" }}>{p.card.front}</span>
              <button onClick={() => speak(p.card.front)} aria-label={`Aussprechen: ${p.card.front}`} style={{ ...iconBtn, fontSize: 14 }}>🔊</button>
            </div>
            <div style={{ fontSize: 12, color: "#9ab0c2", marginTop: 2 }}>{p.card.english}</div>
            {p.card.example && (
              <div style={{ fontSize: 12, color: "#7d8d9c", fontStyle: "italic", marginTop: 6 }}>
                {p.card.example}{p.card.exampleEn && <span style={{ display: "block", color: "#5a6b78" }}>{p.card.exampleEn}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {missed.length > 0 && (
        <>
          <div style={{ marginTop: 18, fontSize: 12, color: "#9ab0c2", textAlign: "left" }}>Nicht gefunden:</div>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {missed.map((p) => (
              <span key={p.word} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, background: "#241a1a", color: "#c6925a", border: "1px solid #3a2a2a" }}>
                {p.card.front}
              </span>
            ))}
          </div>
        </>
      )}

      <button
        onClick={onRestart}
        style={{ width: "100%", marginTop: 20, padding: "12px 0", borderRadius: 12, border: "none", background: "#e0833b", color: "#0e1419", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >🔁 Neues Rätsel</button>
    </div>
  );
}

WordSearchSummary.propTypes = {
  placements: PropTypes.array.isRequired,
  foundWords: PropTypes.instanceOf(Set).isRequired,
  onRestart: PropTypes.func.isRequired,
};

export default WordSearchSummary;
