import { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { GENDER_COLORS, TYPE_META } from "../constants";
import { DECK_META, GRAMMAR_TOPICS } from "../data";
import { statusOfFsrs, dueLabel, submitCorrection, getCachedAiExample, translateText, grammarLinksFor } from "../engine";
import { speak } from "../engine/speech";
import { ProgressCtx } from "../context/ProgressCtx";
import { GrammarNavCtx } from "../context/GrammarNavCtx";
import { faceStyle, badgeStyle, iconBtn } from "./cardStyles";

function FlipCard({ front, sub, back, english, example, exampleEn, accent, badge, type, gender, deck, cardId, lang = "en", level, source, note }) {
  const { progress, mark } = useContext(ProgressCtx);
  const { openGrammar } = useContext(GrammarNavCtx);
  const entry = cardId ? progress[cardId] : undefined;
  const status = statusOfFsrs(entry);
  const [flipped, setFlipped] = useState(false);
  const [ai, setAi] = useState(null); // { de, en } - only ever populated from a static example or a vestigial cached value; V1 never generates one
  const [audioErr, setAudioErr] = useState(false);

  // support both old (back) and new (english) field names
  const meaning = english || back;
  const [transBack, setTransBack] = useState(meaning);
  const [transExEn, setTransExEn] = useState(null);
  const [correcting, setCorrecting] = useState(false);
  const [correctionText, setCorrectionText] = useState("");

  // compute accent if not provided (v1 normalized cards)
  const computedAccent = accent || (type === "n" ? GENDER_COLORS[gender] : TYPE_META[type]?.color || "#7d8d9c");

  // compute badge if not provided (v1 normalized cards) - matches the format
  // used by every other FlipCard call site: "{icon} {deckLabel} · Nomen · {gender}"
  // or "{icon} {deckLabel} · {typeLabel}" for non-nouns.
  const deckMeta = deck ? DECK_META[deck] : null;
  const computedBadge = badge || (deckMeta
    ? `${deckMeta.icon} ${deckMeta.label} · ${type === "n" ? `Nomen · ${gender}` : TYPE_META[type]?.label || type}`
    : null);

  useEffect(() => {
    setFlipped(false);
    setAi(null);
    setAudioErr(false);
    setCorrecting(false);
    setCorrectionText("");
    if (example || !cardId) return; // static example already exists, or no id to cache against
    let cancelled = false;
    getCachedAiExample(cardId).then((cached) => {
      if (!cancelled && cached) setAi(cached);
    });
    return () => { cancelled = true; };
  }, [front, meaning, cardId, example]);
  // #1+#4: translate the meaning shown on the back, in whatever language is selected
  useEffect(() => {
    setTransBack(meaning);
    if (!cardId || lang === "en") return;
    let cancelled = false;
    translateText(meaning, lang, cardId).then((t) => { if (!cancelled) setTransBack(t); });
    return () => { cancelled = true; };
  }, [meaning, lang, cardId]);
  // #D: a person's correction overrides everything else for this word+language, permanently
  const submitTransCorrection = () => {
    const text = correctionText.trim();
    if (!text || !cardId) { setCorrecting(false); return; }
    submitCorrection(cardId, lang, text);
    setTransBack(text);
    setCorrecting(false);
    setCorrectionText("");
  };

  // extract opposite from sub (old format) or use the opposite field directly (new format)
  const opposite = sub && sub.includes("↔") ? sub.split("↔").pop().trim() : null;
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  // grammar topics whose rule covers this word, e.g. -ung -> "Genus nach Endung"
  const grammarLinks = grammarLinksFor({ type, gender, front }, GRAMMAR_TOPICS);

  const shown = example ? { de: example, en: exampleEn } : ai;
  useEffect(() => {
    setTransExEn(null);
    if (!cardId || lang === "en" || !shown || !shown.en) return;
    let cancelled = false;
    translateText(shown.en, lang, cardId + ":ex").then((t) => { if (!cancelled) setTransExEn(t); });
    return () => { cancelled = true; };
  }, [shown && shown.en, lang, cardId]);

  return (
    <div
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped((f) => !f); } }}
      role="button"
      tabIndex={0}
      aria-label={flipped ? `Zeigt: ${meaning}. Zum Umdrehen drücken.` : `Zeigt: ${front}. Zum Umdrehen drücken.`}
      style={{ perspective: 1200, cursor: "pointer", userSelect: "none" }}
    >
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
        {/* FRONT */}
        <div style={faceStyle(computedAccent)}>
          {computedBadge && <span style={badgeStyle(computedAccent)}>{computedBadge}</span>}
          {level && (
            <span
              title={level === "A1" ? "CEFR A1 (beginner)" : "CEFR A2 (elementary)"}
              style={{
                position: "absolute", top: 14, right: 14, fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                color: level === "A1" ? "#5fa85f" : "#e0833b",
                border: `1px solid ${level === "A1" ? "#5fa85f" : "#e0833b"}`,
                borderRadius: 6, padding: "2px 8px",
              }}
            >{level}</span>
          )}
          <div style={{ fontSize: 32, fontWeight: 700, color: "#f2f5f8", textAlign: "center", lineHeight: 1.2 }}>
            {front}
            <button onClick={stop(() => speak(front, () => setAudioErr(true)))} title="Aussprechen" aria-label={`Aussprechen: ${front}`} style={{ ...iconBtn, fontSize: 18 }}>🔊</button>
          </div>
          {sub && <div style={{ marginTop: 12, fontSize: 14, color: computedAccent, fontWeight: 600, textAlign: "center" }}>{sub}</div>}
          {audioErr && <div style={{ marginTop: 10, fontSize: 11, color: "#c6925a", textAlign: "center" }}>🔇 Audio in dieser Umgebung blockiert</div>}
          {entry && (
            <div
              style={{
                marginTop: 10, fontSize: 11, fontWeight: 700, textAlign: "center",
                color: status === "known" ? "#5fa85f" : status === "review" ? "#e0833b" : "#7fb0d6",
              }}
            >
              {status === "known" ? "✓ gekonnt" : status === "review" ? "↻ üben" : `🧠 Intervall: ${Math.round(entry.stability)} Tg.`}
              {" · fällig "}{dueLabel(entry.due)}
            </div>
          )}
          <div style={{ position: "absolute", bottom: 14, fontSize: 10, color: "#5a6b78", letterSpacing: 1 }}>
            {source && <div style={{ marginBottom: 4, letterSpacing: 0, fontSize: 10, color: "#7d8d9c" }}>📖 {source}</div>}
            TAP TO FLIP
          </div>
        </div>
        {/* BACK */}
        <div style={{ ...faceStyle(computedAccent), transform: "rotateY(180deg)" }}>
          <div dir="auto" style={{ fontSize: 24, fontWeight: 700, color: "#f2f5f8", textAlign: "center" }}>{transBack}</div>
          {lang !== "en" && cardId && (
            correcting ? (
              <div onClick={stop(() => {})} style={{ display: "flex", gap: 4, marginTop: 6, alignItems: "center" }}>
                <input
                  autoFocus
                  dir="auto"
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitTransCorrection(); } if (e.key === "Escape") { setCorrecting(false); setCorrectionText(""); } }}
                  placeholder="richtige Übersetzung…"
                  style={{ flex: 1, minWidth: 0, padding: "4px 8px", borderRadius: 8, border: "1px solid #e0833b", background: "#161d24", color: "#f2f5f8", fontSize: 12, outline: "none" }}
                />
                <button onClick={stop(submitTransCorrection)} aria-label="Korrektur speichern" style={{ padding: "4px 9px", borderRadius: 8, border: "none", background: "#5fa85f", color: "#0e1419", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓</button>
                <button onClick={stop(() => { setCorrecting(false); setCorrectionText(""); })} aria-label="Korrektur abbrechen" style={{ padding: "4px 9px", borderRadius: 8, border: "1px solid #2c3a47", background: "transparent", color: "#7d8d9c", fontSize: 12, cursor: "pointer" }}>×</button>
              </div>
            ) : (
              <button
                onClick={stop(() => { setCorrecting(true); setCorrectionText(transBack); })}
                style={{ marginTop: 4, background: "none", border: "none", color: "#5a6b78", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
              >✗ falsch?</button>
            )
          )}
          {opposite && (
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: computedAccent, border: `1px solid ${computedAccent}`, borderRadius: 8, padding: "3px 10px" }}>
              Gegenteil: {opposite}
            </div>
          )}
          {note && (
            <div dir="auto" style={{ marginTop: 10, fontSize: 12, color: "#cdd8e2", textAlign: "center", lineHeight: 1.4 }}>💡 {note}</div>
          )}
          {grammarLinks.map((l) => (openGrammar ? (
            <button
              key={l.key}
              onClick={stop(() => openGrammar(l.key))}
              aria-label={`Grammatik öffnen: ${l.label}`}
              style={grammarChipStyle}
            >📖 {l.label}</button>
          ) : (
            <span key={l.key} style={grammarChipStyle}>📖 {l.label}</span>
          )))}
          {shown ? (
            <>
              <div style={{ marginTop: 16, fontSize: 14, color: "#cdd8e2", textAlign: "center", fontStyle: "italic", lineHeight: 1.5 }}>
                „{shown.de}"
                <button onClick={stop(() => speak(shown.de, () => setAudioErr(true)))} aria-label={`Aussprechen: ${shown.de}`} style={{ ...iconBtn, fontSize: 13 }}>🔊</button>
              </div>
              {shown.en && (
                <div dir="auto" style={{ marginTop: 6, fontSize: 12, color: "#7d8d9c", textAlign: "center", lineHeight: 1.4 }}>
                  {lang !== "en" && transExEn ? transExEn : shown.en}
                </div>
              )}
            </>
          ) : (
            <div style={{ marginTop: 16, fontSize: 11, color: "#5a6b78", textAlign: "center", fontStyle: "italic" }}>
              kein Beispielsatz für dieses Wort
            </div>
          )}
          {audioErr && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#c6925a", textAlign: "center" }}>
              🔇 Audio in dieser Umgebung blockiert
            </div>
          )}
          {cardId && (
            <div style={{ position: "absolute", bottom: 12, display: "flex", gap: 8 }}>
              <button
                onClick={stop(() => mark(cardId, status === "known" ? null : "known"))}
                aria-pressed={status === "known"}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid #5fa85f", background: status === "known" ? "#5fa85f" : "transparent", color: status === "known" ? "#0e1419" : "#5fa85f" }}
              >✓ Gekonnt</button>
              <button
                onClick={stop(() => mark(cardId, status === "review" ? null : "review"))}
                aria-pressed={status === "review"}
                style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid #e0833b", background: status === "review" ? "#e0833b" : "transparent", color: status === "review" ? "#0e1419" : "#e0833b" }}
              >↻ Üben</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const grammarChipStyle = {
  marginTop: 10, fontSize: 12, fontWeight: 600, color: "#8fb8d8", background: "transparent",
  border: "1px solid #3a5670", borderRadius: 8, padding: "3px 10px", cursor: "pointer",
};

export default FlipCard;

FlipCard.propTypes = {
  front: PropTypes.string.isRequired,
  sub: PropTypes.string,
  back: PropTypes.string,
  english: PropTypes.string,
  example: PropTypes.string,
  exampleEn: PropTypes.string,
  accent: PropTypes.string,
  badge: PropTypes.string,
  type: PropTypes.string,
  gender: PropTypes.string,
  deck: PropTypes.string,
  cardId: PropTypes.string,
  lang: PropTypes.string,
  level: PropTypes.oneOf(["A1", "A2"]),
  source: PropTypes.string,
  note: PropTypes.string,
};
