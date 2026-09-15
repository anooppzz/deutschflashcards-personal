import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { GENDER_COLORS, TYPE_META } from "../../constants";
import { DECK_META, ALL_WORDS } from "../../data";
import { isClozeCorrect, findAlternateWordMatch } from "./buildRound";
import { faceStyle, badgeStyle } from "../../components/cardStyles";
import { FloatingNext } from "../../components";

/* Cloze Mode: the target word is blanked out of its own example sentence;
   type the missing word, flip to reveal & validate. Mirrors ReverseTrainer's
   interaction shape (input -> submit -> flip -> next) for consistency. */
function ClozeTrainer({ cards, idx, input, flipped, score, onInput, onSubmit, onNext, totalAvailable }) {
  const card = cards.length ? cards[idx % cards.length] : null;
  const inputRef = useRef(null);

  useEffect(() => {
    if (!flipped && inputRef.current) inputRef.current.focus();
  }, [flipped, idx]);

  if (!card) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px", color: "#7d8d9c" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✏️</div>
        <div style={{ fontSize: 15, color: "#cdd8e2", fontWeight: 600 }}>Keine Lückentext-Karten in dieser Auswahl</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Nur Karten mit passendem Beispielsatz sind hier verfügbar.</div>
      </div>
    );
  }

  const isCorrect = flipped ? isClozeCorrect(input, card) : null;
  // Tier 1: only relevant when wrong - is the typed word a REAL German
  // word from elsewhere in the app, just not the one this sentence uses?
  // Doesn't affect scoring, only the explanation shown.
  const altMatch = flipped && isCorrect === false ? findAlternateWordMatch(input, ALL_WORDS) : null;
  const statusColor = isCorrect ? "#5fa85f" : isCorrect === false ? "#c6534f" : "#7d8d9c";
  const cardAccent = card.type === "n" ? GENDER_COLORS[card.gender] : TYPE_META[card.type]?.color || "#7d8d9c";
  const cardBadge = `${DECK_META[card.deck]?.label || card.deck}${card.type === "n" ? " · NOMEN" : ""} · ${card.gender || ""}`.trim();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7d8d9c", marginBottom: 14 }}>
        <span>{idx + 1} / {cards.length}</span>
        <span>Punkte: {score.right} / {score.total}</span>
      </div>
      {typeof totalAvailable === "number" && totalAvailable > cards.length && (
        <div style={{ fontSize: 11, color: "#5a6b78", textAlign: "center", marginTop: -6, marginBottom: 14 }}>
          📊 {cards.length}/{totalAvailable} in dieser Runde
        </div>
      )}

      <div style={{ perspective: 1200, cursor: "pointer", userSelect: "none" }}>
        <div
          style={{
            position: "relative", width: "100%", minHeight: 300,
            transformStyle: "preserve-3d", transition: "transform .5s cubic-bezier(.4,.2,.2,1)",
            transform: flipped ? "rotateY(180deg)" : "none",
          }}
        >
          {/* FRONT - sentence with blank */}
          <div style={{ ...faceStyle("#2c3a47"), backfaceVisibility: "hidden" }}>
            {cardBadge && <span style={badgeStyle(cardAccent)}>{cardBadge}</span>}
            <div style={{ fontSize: 13, color: "#7d8d9c", marginBottom: 16, textAlign: "center" }}>Ergänze den Satz:</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#f2f5f8", textAlign: "center", lineHeight: 1.6, marginBottom: 10 }}>
              {card.clozeBefore}
              <span style={{ display: "inline-block", minWidth: 60, borderBottom: "2px solid #e0833b", margin: "0 4px" }}>&nbsp;</span>
              {card.clozeAfter}
            </div>
            {card.exampleEn && (
              <div style={{ fontSize: 12, color: "#5a6b78", fontStyle: "italic", textAlign: "center", marginBottom: 18 }}>{card.exampleEn}</div>
            )}
            <label htmlFor="cloze-answer-input" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
              Fehlendes Wort eingeben
            </label>
            <input
              id="cloze-answer-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { e.preventDefault(); onSubmit(); } }}
              placeholder="fehlendes Wort..."
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10,
                border: "2px solid #2c3a47", background: "#16202a", color: "#f2f5f8",
                fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 14,
              }}
            />
            <button
              onClick={onSubmit}
              disabled={!input.trim()}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                background: input.trim() ? "#e0833b" : "#1a232b", color: input.trim() ? "#0e1419" : "#7d8d9c",
                fontSize: 13, fontWeight: 700, cursor: input.trim() ? "pointer" : "default",
              }}
            >✓ Prüfen</button>
          </div>

          {/* BACK - reveal */}
          <div style={{ ...faceStyle(statusColor), transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
            <div role="status" aria-live="polite" style={{ fontSize: 13, color: statusColor, marginBottom: 18, textAlign: "center", fontWeight: 600 }}>
              {isCorrect ? "✓ Richtig!" : "✗ Nicht ganz"}
            </div>
            <div style={{ fontSize: 15, color: "#f2f5f8", textAlign: "center", lineHeight: 1.6, marginBottom: 18 }}>
              {card.clozeBefore}
              <span style={{ fontWeight: 800, color: statusColor }}>{card.clozeAnswer}</span>
              {card.clozeAfter}
            </div>
            {!isCorrect && (
              <div style={{ fontSize: 12, color: "#9ab0c2", textAlign: "center", marginBottom: 10 }}>
                Deine Antwort: <span style={{ color: "#c6534f" }}>{input || "(leer)"}</span>
                {altMatch && (
                  <div style={{ marginTop: 6, fontSize: 11, color: "#8fb8d8", fontStyle: "italic" }}>
                    „{input}" ist ein echtes Wort ({altMatch.english}) - hier passt aber „{card.clozeAnswer}".
                  </div>
                )}
              </div>
            )}
            {card.exampleEn && (
              <div style={{ fontSize: 12, color: "#9ab0c2", fontStyle: "italic", textAlign: "center", marginTop: 10, paddingTop: 10, borderTop: "1px solid #2c3a47" }}>
                {card.exampleEn}
              </div>
            )}
          </div>
        </div>
      </div>

      {flipped && <FloatingNext onNext={onNext} autoFocus={true} />}
    </div>
  );
}

export default ClozeTrainer;

ClozeTrainer.propTypes = {
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      deck: PropTypes.string,
      front: PropTypes.string,
      type: PropTypes.string,
      gender: PropTypes.string,
      exampleEn: PropTypes.string,
      clozeBefore: PropTypes.string,
      clozeAfter: PropTypes.string,
      clozeAnswer: PropTypes.string,
      acceptableAlternates: PropTypes.arrayOf(PropTypes.string),
    })
  ).isRequired,
  idx: PropTypes.number.isRequired,
  input: PropTypes.string.isRequired,
  flipped: PropTypes.bool.isRequired,
  score: PropTypes.shape({ right: PropTypes.number, total: PropTypes.number }).isRequired,
  onInput: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  totalAvailable: PropTypes.number,
};
