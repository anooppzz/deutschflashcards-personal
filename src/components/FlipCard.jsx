import { useState, useEffect, useContext, useRef } from "react";
import PropTypes from "prop-types";
import { genderColor, TYPE_META } from "../constants";
import { DECK_META, VERB_FORMS } from "../data";
import { statusOfFsrs, dueLabel, submitCorrection, getCachedAiExample, translateText } from "../engine";
import { speak } from "../engine/speech";
import { ProgressCtx } from "../context/ProgressCtx";
import { GrammarNavCtx } from "../context/GrammarNavCtx";
import { ConjugationCtx } from "../context/ConjugationCtx";
import { faceStyle, badgeStyle, iconBtn } from "./cardStyles";
import LookupLinks from "./LookupLinks";
import { wordLinks, wordQuestion, wordSubject } from "../engine/lookup";

function FlipCard({ front, sub, back, english, example, exampleEn, accent, badge, type, gender, deck, cardId, lang = "en", level, source, sources, note, showMarks = true }) {
  const { progress, mark } = useContext(ProgressCtx);
  const { openGrammar, linksFor, returnCard } = useContext(GrammarNavCtx);
  // back from a grammar topic this card's 📖 chip opened: start on the back
  const startFlipped = useRef(Boolean(cardId) && cardId === returnCard);
  const { openConjugation } = useContext(ConjugationCtx);
  const entry = cardId ? progress[cardId] : undefined;
  const status = statusOfFsrs(entry);
  // a verb's forms (data/index.js VERB_FORMS): shown on the back only, so
  // the front asks for them
  const forms = cardId ? VERB_FORMS.get(cardId) : undefined;
  // a card from two books shows both ("Menschen A2 · Einheit 7 · Grammatik aktiv")
  const sourceText = sources && sources.length ? sources.join(" · ") : source;
  // starts on its back already, so coming back doesn't play the flip
  const [flipped, setFlipped] = useState(startFlipped.current);
  const [ai, setAi] = useState(null); // { de, en } - only ever populated from a static example or a vestigial cached value; V1 never generates one
  const [audioErr, setAudioErr] = useState(false);

  // support both old (back) and new (english) field names
  const meaning = english || back;
  const [transBack, setTransBack] = useState(meaning);
  // English needs no translation: show the meaning itself, so the back is
  // never a render behind when the card changes
  const backText = lang === "en" ? meaning : transBack;
  const [transExEn, setTransExEn] = useState(null);
  const [correcting, setCorrecting] = useState(false);
  const [correctionText, setCorrectionText] = useState("");

  // compute accent if not provided (v1 normalized cards)
  const computedAccent = accent || (type === "n" ? genderColor(gender) : TYPE_META[type]?.color || "#7d8d9c");

  // compute badge if not provided (v1 normalized cards) - matches the format
  // used by every other FlipCard call site: "{icon} {deckLabel} · Nomen · {gender}"
  // or "{icon} {deckLabel} · {typeLabel}" for non-nouns.
  const deckMeta = deck ? DECK_META[deck] : null;
  const computedBadge = badge || (deckMeta
    ? `${deckMeta.icon} ${deckMeta.label} · ${type === "n" ? `Nomen · ${gender}` : TYPE_META[type]?.label || type}`
    : null);

  // a new card starts on its front; the first one keeps its start side
  const shownCard = useRef(cardId || front);
  useEffect(() => {
    if (shownCard.current !== (cardId || front)) setFlipped(false);
    shownCard.current = cardId || front;
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
  // grammar topics linked to this card, e.g. -ung -> "Genus nach Endung"
  const grammarLinks = cardId ? linksFor(cardId) : [];

  const shown = example ? { de: example, en: exampleEn } : ai;
  const shownEn = shown ? shown.en : null;
  useEffect(() => {
    setTransExEn(null);
    if (!cardId || lang === "en" || !shownEn) return;
    let cancelled = false;
    translateText(shownEn, lang, cardId + ":ex").then((t) => { if (!cancelled) setTransExEn(t); });
    return () => { cancelled = true; };
  }, [shownEn, lang, cardId]);

  return (
    <div>
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
          // both faces share one grid cell, so the card is as tall as its
          // fuller side - a long back grows the card instead of spilling over
          display: "grid",
          width: "100%",
          transformStyle: "preserve-3d",
          transition: "transform .5s cubic-bezier(.4,.2,.2,1)",
          transform: flipped ? "rotateY(180deg)" : "none",
        }}
      >
        {/* FRONT */}
        <div style={{ ...faceStyle(computedAccent), ...stacked }}>
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
          {sub && !forms && <div style={{ marginTop: 12, fontSize: 14, color: computedAccent, fontWeight: 600, textAlign: "center" }}>{sub}</div>}
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
            {sourceText && <div style={{ marginBottom: 4, letterSpacing: 0, fontSize: 10, color: "#7d8d9c" }}>📖 {sourceText}</div>}
            TAP TO FLIP
          </div>
        </div>
        {/* BACK */}
        {/* bottom padding keeps long backs clear of the ✓ Gekonnt / ↻ Üben buttons */}
        <div style={{ ...faceStyle(computedAccent), ...stacked, transform: "rotateY(180deg)", paddingTop: 30, paddingBottom: cardId && showMarks ? 62 : 24 }}>
          <div dir="auto" style={{ fontSize: 24, fontWeight: 700, color: "#f2f5f8", textAlign: "center" }}>{backText}</div>
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
                <button onClick={stop(submitTransCorrection)} aria-label="Korrektur speichern" style={{ minWidth: 36, minHeight: 32, padding: "4px 9px", borderRadius: 8, border: "none", background: "#5fa85f", color: "#0e1419", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓</button>
                <button onClick={stop(() => { setCorrecting(false); setCorrectionText(""); })} aria-label="Korrektur abbrechen" style={{ minWidth: 36, minHeight: 32, padding: "4px 9px", borderRadius: 8, border: "1px solid #2c3a47", background: "transparent", color: "#7d8d9c", fontSize: 12, cursor: "pointer" }}>×</button>
              </div>
            ) : (
              <button
                onClick={stop(() => { setCorrecting(true); setCorrectionText(backText); })}
                style={{ marginTop: 4, background: "none", border: "none", color: "#5a6b78", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
              >✗ falsch?</button>
            )
          )}
          {forms && (
            <table aria-label="Verbformen" style={{ marginTop: 10, borderCollapse: "collapse", fontSize: 13, lineHeight: 1.45 }}>
              <tbody>
                {[["er/sie/es", forms.praes], ["Präteritum", forms.praet], ["Perfekt", forms.perf]].filter(([, v]) => v).map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row" style={{ padding: "0 10px 0 0", textAlign: "right", fontWeight: 500, color: "#7d8d9c", whiteSpace: "nowrap" }}>{k}</th>
                    <td style={{ padding: 0, textAlign: "left", fontWeight: 600, color: computedAccent }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {forms && forms.praes && forms.praet && openConjugation && (
            <button
              onClick={stop(() => openConjugation(cardId))}
              aria-label={`Alle Formen: ${front}`}
              style={{ ...grammarChipStyle, color: "#e8c39e", borderColor: "#6b5a44" }}
            >📊 Alle Formen</button>
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
              onClick={stop(() => openGrammar(l.key, cardId))}
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
          {/* manual marks - hidden where the screen grades the card itself (review session) */}
          {cardId && showMarks && (
            <div style={{ position: "absolute", bottom: 12, display: "flex", gap: 8 }}>
              <button
                onClick={stop(() => mark(cardId, status === "known" ? null : "known"))}
                aria-pressed={status === "known"}
                style={{ minHeight: 38, padding: "6px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1px solid #5fa85f", background: status === "known" ? "#5fa85f" : "transparent", color: status === "known" ? "#0e1419" : "#5fa85f" }}
              >✓ Gekonnt</button>
              <button
                onClick={stop(() => mark(cardId, status === "review" ? null : "review"))}
                aria-pressed={status === "review"}
                style={{ minHeight: 38, padding: "6px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1px solid #e0833b", background: status === "review" ? "#e0833b" : "transparent", color: status === "review" ? "#0e1419" : "#e0833b" }}
              >↻ Üben</button>
            </div>
          )}
        </div>
      </div>
    </div>
    {/* 🔎 / 🤖 under the card once it shows its back */}
    {flipped && <LookupLinks links={wordLinks(front)} question={wordQuestion({ front, english: meaning, example })} aiSubject={wordSubject({ front, english: meaning, example })} />}
    </div>
  );
}

// a face in the card's one grid cell (instead of absolute on top of a fixed height)
const stacked = { position: "relative", inset: "auto", gridArea: "1 / 1", minHeight: 300, boxSizing: "border-box" };

const grammarChipStyle = {
  marginTop: 10, fontSize: 12, fontWeight: 600, color: "#8fb8d8", background: "transparent",
  border: "1px solid #3a5670", borderRadius: 8, padding: "6px 12px", cursor: "pointer",
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
  sources: PropTypes.arrayOf(PropTypes.string),
  note: PropTypes.string,
  showMarks: PropTypes.bool,
};
