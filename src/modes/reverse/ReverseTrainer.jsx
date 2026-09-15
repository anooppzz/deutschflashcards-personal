import { useState, useEffect, useRef } from "react";
import { GENDER_COLORS, TYPE_META } from "../../constants";
import { DECK_META } from "../../data";
import { idOf, translateText, validateGermanWord } from "../../engine";
import { faceStyle, badgeStyle } from "../../components/cardStyles";
import { FloatingNext } from "../../components";

/* Reverse Mode: Show meaning, user types German, flip to reveal & validate */
function ReverseTrainer({ cards, idx, input, flipped, score, onInput, onSubmit, onNext, totalAvailable, lang = "en" }) {
  const card = cards.length ? cards[idx % cards.length] : null;
  const [transMeaning, setTransMeaning] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setTransMeaning(null);
    if (!card || lang === "en" || !card.english) return;
    let cancelled = false;
    translateText(card.english, lang, idOf(card.deck, card.front)).then((t) => { if (!cancelled) setTransMeaning(t); });
    return () => { cancelled = true; };
  }, [card && card.deck, card && card.front, card && card.english, lang]);

  useEffect(() => {
    if (!flipped && inputRef.current) inputRef.current.focus();
  }, [flipped, idx]);

  if (!card) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px", color: "#7d8d9c" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>↔️</div>
        <div style={{ fontSize: 15, color: "#cdd8e2", fontWeight: 600 }}>Keine Karten in dieser Auswahl</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Wähle ein Thema, um Reverse Mode zu starten.</div>
      </div>
    );
  }

  const displayMeaning = lang !== "en" && transMeaning ? transMeaning : card.english;
  const isCorrect = flipped ? validateGermanWord(input, card.front) : null;
  const statusColor = isCorrect ? "#5fa85f" : isCorrect === false ? "#c6534f" : "#7d8d9c";

  // Compute accent color based on card type/gender (like FlipCard does)
  const cardAccent = card ? (
    card.type === "n" ? GENDER_COLORS[card.gender] : TYPE_META[card.type]?.color || "#7d8d9c"
  ) : "#7d8d9c";

  // Card category badge (deck · type · gender) - uppercase for badge style
  const cardBadge = card ? (
    `${DECK_META[card.deck]?.label || card.deck}${card.type === "n" ? " · NOMEN" : ""} · ${card.gender || ""}`.trim()
  ) : "";

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
            position: "relative",
            width: "100%",
            minHeight: 300,
            transformStyle: "preserve-3d",
            transition: "transform .5s cubic-bezier(.4,.2,.2,1)",
            transform: flipped ? "rotateY(180deg)" : "none",
          }}
        >
          {/* FRONT - Input side */}
          <div style={{ ...faceStyle("#2c3a47"), backfaceVisibility: "hidden" }}>
            {cardBadge && <span style={badgeStyle(cardAccent)}>{cardBadge}</span>}
            <div style={{ fontSize: 13, color: "#7d8d9c", marginBottom: 20, textAlign: "center" }}>Schreib das Wort:</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#f2f5f8", textAlign: "center", marginBottom: 20, minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {displayMeaning}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { e.preventDefault(); onSubmit(); } }}
              placeholder="German word..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "2px solid #2c3a47",
                background: "#16202a",
                color: "#f2f5f8",
                fontSize: 14,
                fontFamily: "inherit",
                boxSizing: "border-box",
                marginBottom: 14,
              }}
            />
            <button
              onClick={onSubmit}
              disabled={!input.trim()}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                background: input.trim() ? "#e0833b" : "#1a232b",
                color: input.trim() ? "#0e1419" : "#7d8d9c",
                fontSize: 13,
                fontWeight: 700,
                cursor: input.trim() ? "pointer" : "default",
              }}
            >
              ✓ Prüfen
            </button>
          </div>

          {/* BACK - Reveal side (styled like FlipCard back) */}
          <div style={{ ...faceStyle(statusColor), transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
            <div style={{ fontSize: 13, color: statusColor, marginBottom: 20, textAlign: "center", fontWeight: 600 }}>
              {isCorrect ? "✓ Richtig!" : "✗ Nicht ganz"}
            </div>
            <div style={{ fontSize: 14, color: "#f2f5f8", marginBottom: 10, textAlign: "center" }}>Deine Antwort:</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f2f5f8", textAlign: "center", marginBottom: 20, padding: "10px", borderRadius: 8, background: "rgba(255,255,255,.1)" }}>
              {input}
            </div>
            <div style={{ fontSize: 14, color: "#f2f5f8", marginBottom: 10, textAlign: "center" }}>Korrekt:</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: statusColor, textAlign: "center", marginBottom: 20, padding: "10px", borderRadius: 8, background: "rgba(0,0,0,.2)", border: `1px solid ${statusColor}` }}>
              {card.front}
            </div>
            {card.example && (
              <div style={{ fontSize: 12, color: "#9ab0c2", fontStyle: "italic", textAlign: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid #2c3a47" }}>
                „{card.example}"
              </div>
            )}
          </div>
        </div>
      </div>

      {flipped && <FloatingNext onNext={onNext} autoFocus={true} />}
    </div>
  );
}

export default ReverseTrainer;
