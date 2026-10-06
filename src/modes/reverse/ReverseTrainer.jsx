import { useState, useEffect, useRef } from "react";
import { genderColor, TYPE_META } from "../../constants";
import { DECK_META } from "../../data";
import { idOf, translateText, checkReverseAnswer, checkDictation, speakableText } from "../../engine";
import { speak } from "../../engine/speech";
import { faceStyle, badgeStyle } from "../../components/cardStyles";
import { FloatingNext } from "../../components";

/* Reverse Mode: Show meaning, user types German, flip to reveal & validate.
   prompt "audio" (🎧 Hören): the phone says the word instead and the meaning
   stays hidden until asked for - listening + spelling practice. */
const SLOW = 0.6;
const toggleBtn = (on) => ({
  flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
  border: on ? "none" : "1px solid #2c3a47", background: on ? "#e0833b" : "#1a232b", color: on ? "#0e1419" : "#9ab0c2",
});
const roundBtn = { padding: "10px 16px", borderRadius: 12, border: "1px solid #e0833b", background: "rgba(224,131,59,.12)", color: "#f2f5f8", fontSize: 15, fontWeight: 700, cursor: "pointer" };

function ReverseTrainer({ cards, idx, input, flipped, score, onInput, onSubmit, onNext, totalAvailable, lang = "en", prompt = "meaning", onPromptChange }) {
  const card = cards.length ? cards[idx % cards.length] : null;
  const [transMeaning, setTransMeaning] = useState(null);
  const listening = prompt === "audio";
  const [showMeaning, setShowMeaning] = useState(false);
  const [audioErr, setAudioErr] = useState(false);
  const inputRef = useRef(null);
  // the card's fields as plain values, so the effect re-runs exactly when the card changes
  const cardDeck = card ? card.deck : null;
  const cardFront = card ? card.front : null;
  const cardEnglish = card ? card.english : null;

  useEffect(() => {
    setTransMeaning(null);
    if (!cardFront || lang === "en" || !cardEnglish) return;
    let cancelled = false;
    translateText(cardEnglish, lang, idOf(cardDeck, cardFront)).then((t) => { if (!cancelled) setTransMeaning(t); });
    return () => { cancelled = true; };
  }, [cardDeck, cardFront, cardEnglish, lang]);

  useEffect(() => {
    if (!flipped && inputRef.current) inputRef.current.focus();
  }, [flipped, idx]);

  // 🎧 a new card speaks itself
  useEffect(() => {
    setShowMeaning(false);
    if (!listening || !cardFront) return;
    setAudioErr(false);
    speak(speakableText(cardFront), () => setAudioErr(true));
  }, [listening, cardFront, idx]);
  const say = (rate) => { setAudioErr(false); speak(speakableText(card.front), () => setAudioErr(true), rate); };

  const promptToggle = onPromptChange && (
    <div role="group" aria-label="Aufgabe" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <button type="button" aria-pressed={!listening} onClick={() => onPromptChange("meaning")} style={toggleBtn(!listening)}>📖 Lesen</button>
      <button type="button" aria-pressed={listening} onClick={() => onPromptChange("audio")} style={toggleBtn(listening)}>🎧 Hören</button>
    </div>
  );

  if (!card) {
    return (
      <div>
        {promptToggle}
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#7d8d9c" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{listening ? "🎧" : "↔️"}</div>
          <div style={{ fontSize: 15, color: "#cdd8e2", fontWeight: 600 }}>Keine Karten in dieser Auswahl</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Wähle ein Thema, um Reverse Mode zu starten.</div>
        </div>
      </div>
    );
  }

  const displayMeaning = lang !== "en" && transMeaning ? transMeaning : card.english;
  const result = flipped ? (listening ? checkDictation : checkReverseAnswer)(input, card.front) : null;
  const isCorrect = result ? result.correct : null;
  const verdict = !result ? "" : result.correct ? "✓ Richtig!"
    : result.reason === "wrong-article" ? "✗ Falscher Artikel"
    : result.reason === "missing-article" ? "✗ Artikel fehlt"
    : "✗ Nicht ganz";
  // nouns shown with an article must be typed with it
  const needsArticle = /^(der|die|das)[\s/]/.test(card.front);
  const statusColor = isCorrect ? "#5fa85f" : isCorrect === false ? "#c6534f" : "#7d8d9c";

  // Compute accent color based on card type/gender (like FlipCard does)
  const cardAccent = card ? (
    card.type === "n" ? genderColor(card.gender) : TYPE_META[card.type]?.color || "#7d8d9c"
  ) : "#7d8d9c";

  // Card category badge (deck · type · gender) - uppercase for badge style
  const cardBadge = card ? (
    `${DECK_META[card.deck]?.label || card.deck}${card.type === "n" ? " · NOMEN" : ""} · ${card.gender || ""}`.trim()
  ) : "";

  return (
    <div>
      {promptToggle}
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
            minHeight: listening ? 380 : 300, // Hören has more on its front
            transformStyle: "preserve-3d",
            transition: "transform .5s cubic-bezier(.4,.2,.2,1)",
            transform: flipped ? "rotateY(180deg)" : "none",
          }}
        >
          {/* FRONT - Input side */}
          <div style={{ ...faceStyle("#2c3a47"), backfaceVisibility: "hidden" }}>
            {cardBadge && <span style={badgeStyle(cardAccent)}>{cardBadge}</span>}
            {listening ? (
              <>
                <div style={{ fontSize: 13, color: "#7d8d9c", marginBottom: 14, textAlign: "center" }}>Hör zu und schreib, was du hörst:</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <button type="button" onClick={() => say()} aria-label="Nochmal hören" style={roundBtn}>🔊 Nochmal</button>
                  <button type="button" onClick={() => say(SLOW)} aria-label="Langsam hören" style={roundBtn}>🐢 Langsam</button>
                </div>
                <div style={{ minHeight: 40, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                  {showMeaning || audioErr ? (
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#cdd8e2" }}>{displayMeaning}</span>
                  ) : (
                    <button type="button" onClick={() => setShowMeaning(true)} style={{ background: "none", border: "none", color: "#8fb8d8", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>💡 Bedeutung zeigen</button>
                  )}
                </div>
                {audioErr && (
                  <div style={{ fontSize: 11, color: "#c6925a", marginBottom: 10, textAlign: "center" }}>🔇 Kein Ton – hier ist die Bedeutung. Deutsche Stimme in den Handy-Einstellungen prüfen.</div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#7d8d9c", marginBottom: 20, textAlign: "center" }}>Schreib das Wort:</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#f2f5f8", textAlign: "center", marginBottom: 20, minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {displayMeaning}
                </div>
              </>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { e.preventDefault(); onSubmit(); } }}
              placeholder={needsArticle ? "mit Artikel: der / die / das …" : "Deutsches Wort …"}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "2px solid #2c3a47",
                background: "#16202a",
                color: "#f2f5f8",
                fontSize: 16, // 16px: smaller makes iPhones zoom in on focus
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
              {verdict}
            </div>
            <div style={{ fontSize: 14, color: "#f2f5f8", marginBottom: 10, textAlign: "center" }}>Deine Antwort:</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f2f5f8", textAlign: "center", marginBottom: 20, padding: "10px", borderRadius: 8, background: "rgba(255,255,255,.1)" }}>
              {input}
            </div>
            <div style={{ fontSize: 14, color: "#f2f5f8", marginBottom: 10, textAlign: "center" }}>Korrekt:</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: statusColor, textAlign: "center", marginBottom: 20, padding: "10px", borderRadius: 8, background: "rgba(0,0,0,.2)", border: `1px solid ${statusColor}` }}>
              {card.front}
            </div>
            {listening && (
              <div style={{ fontSize: 13, color: "#cdd8e2", textAlign: "center", marginTop: -10, marginBottom: 6 }}>{displayMeaning}</div>
            )}
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
