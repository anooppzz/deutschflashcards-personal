import PropTypes from "prop-types";
import WordSearchGrid from "./WordSearchGrid";

/* Word Search Mode: find German words hidden in a letter grid. The word
   list shows the ENGLISH meaning first - you have to recall the German
   spelling yourself before scanning for it. Tapping a not-yet-found word
   reveals its German spelling as a hint (not its location in the grid -
   that stays a distinct, stronger fallback via "Wörter anzeigen"). Full
   meaning + example sentence reveal happens in WordSearchSummary once the
   round ends. */
function WordSearchTrainer({ roundData, foundWords, onFound, hintedWords, onHint, onReveal, revealed, onFinish }) {
  const { grid, size, placements } = roundData;
  const allFound = placements.length > 0 && placements.every((p) => foundWords.has(p.word));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7d8d9c", marginBottom: 14 }}>
        <span>Gefunden: {foundWords.size} / {placements.length}</span>
        {!revealed && !allFound && (
          <button onClick={onReveal} style={{ background: "none", border: "none", color: "#7d8d9c", fontSize: 11, textDecoration: "underline", cursor: "pointer" }}>
            Wörter anzeigen
          </button>
        )}
      </div>

      <div style={{ overflowX: "auto", paddingBottom: 8, marginBottom: 16 }}>
        <WordSearchGrid
          grid={grid}
          size={size}
          placements={placements}
          foundWords={foundWords}
          onFound={onFound}
          revealed={revealed}
        />
      </div>

      <div style={{ fontSize: 11, color: "#5a6b78", textAlign: "center", marginBottom: 8 }}>
        Nicht sicher, wie es auf Deutsch heißt? Tippe zum Nachschlagen.
      </div>
      <div role="list" aria-label="Zu findende Wörter" style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 18 }}>
        {placements.map((p) => {
          const found = foundWords.has(p.word);
          const hinted = hintedWords.has(p.word);
          const showGerman = found || hinted || revealed;
          return (
            <button
              key={p.word}
              role="listitem"
              onClick={() => !found && onHint(p.word)}
              disabled={found}
              aria-label={showGerman ? `${p.card.english} - ${p.card.front}` : `${p.card.english}. Tippen, um das deutsche Wort zu sehen.`}
              style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: found ? "default" : "pointer",
                background: found ? "#1c2b1f" : hinted ? "#1e2a33" : "#161d24",
                color: found ? "#5fa85f" : hinted ? "#8fb8d8" : "#cdd8e2",
                border: `1px solid ${found ? "#5fa85f" : hinted ? "#4f86c6" : "#2c3a47"}`,
                textDecoration: found ? "line-through" : "none",
              }}
            >
              {p.card.english}
              {showGerman && <span style={{ opacity: 0.8 }}> → {p.card.front}</span>}
            </button>
          );
        })}
      </div>

      {(allFound || revealed) && (
        <button
          onClick={onFinish}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: "#e0833b", color: "#0e1419", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >{allFound ? "🎉 Alle gefunden - weiter" : "Weiter"}</button>
      )}
    </div>
  );
}

WordSearchTrainer.propTypes = {
  roundData: PropTypes.shape({
    grid: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
    size: PropTypes.number.isRequired,
    placements: PropTypes.array.isRequired,
  }).isRequired,
  foundWords: PropTypes.instanceOf(Set).isRequired,
  onFound: PropTypes.func.isRequired,
  hintedWords: PropTypes.instanceOf(Set).isRequired,
  onHint: PropTypes.func.isRequired,
  onReveal: PropTypes.func.isRequired,
  revealed: PropTypes.bool,
  onFinish: PropTypes.func.isRequired,
};

export default WordSearchTrainer;
