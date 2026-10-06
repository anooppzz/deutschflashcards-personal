import { useState } from "react";
import PropTypes from "prop-types";
import { DECK_META } from "../../data";
import { speak } from "../../engine/speech";
import { faceStyle, badgeStyle, iconBtn } from "../../components/cardStyles";
import { buildSatzbauRound, chipsFor, isCorrectOrder } from "./buildSatzbau";

// 🧩 Satzbau trainer (see buildSatzbau.js). Tap the chips to build the
// sentence after the given first word; tap a placed word to take it back.
// German sometimes allows another order, so after a "wrong" check the
// learner can say "Meine Reihenfolge ist auch richtig" and it counts.
// The round is built when the trainer opens; the parent re-keys it when the
// selection changes.

const ACCENT = "#e0833b";
const GREEN = "#5fa85f";
const RED = "#e07b6f";
const chip = (placed) => ({
  padding: "8px 11px", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "pointer", lineHeight: 1.2,
  border: `1px solid ${placed ? ACCENT : "#3a5670"}`, background: placed ? "rgba(224,131,59,.15)" : "#16202a", color: "#f2f5f8",
});
const btn = (primary, enabled = true) => ({
  flex: 1, padding: "12px 0", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: enabled ? "pointer" : "default",
  border: primary ? "none" : "1px solid #2c3a47", background: primary ? (enabled ? ACCENT : "#1a232b") : "#1a232b",
  color: primary ? (enabled ? "#0e1419" : "#7d8d9c") : "#cdd8e2",
});

const newItemState = (item) => ({ chips: item ? chipsFor(item) : [], placed: [] });

function SatzbauTrainer({ pool }) {
  const [round, setRound] = useState(() => buildSatzbauRound(pool));
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState(() => newItemState(round[0]));
  const [checked, setChecked] = useState(null); // { correct, own }
  const [right, setRight] = useState(0);
  const [mistakes, setMistakes] = useState([]); // { item, given }

  const start = (items) => {
    setRound(items); setIdx(0); setState(newItemState(items[0])); setChecked(null); setRight(0); setMistakes([]);
  };

  if (!pool.length) {
    return (
      <div role="status" style={{ textAlign: "center", padding: "40px 16px", color: "#7d8d9c", fontSize: 14 }}>
        Keine passenden Beispielsätze in dieser Auswahl.
        <div style={{ marginTop: 6, fontSize: 13 }}>Wähle oben andere Themen.</div>
      </div>
    );
  }

  if (idx >= round.length) {
    const pct = round.length ? Math.round((right / round.length) * 100) : 0;
    return (
      <div style={{ textAlign: "center", padding: "10px 4px" }}>
        <div aria-hidden="true" style={{ fontSize: 44 }}>{pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📚"}</div>
        <div role="status" style={{ fontSize: 20, fontWeight: 800, color: "#f2f5f8" }}>{right} / {round.length} richtig ({pct}%)</div>
        {mistakes.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
            {mistakes.map((m) => (
              <div key={m.item.sentence} style={{ padding: "8px 12px", borderRadius: 10, background: "#161d24", border: "1px solid #2c3a47", fontSize: 13 }}>
                <div style={{ color: GREEN, fontWeight: 700 }}>{m.item.sentence}</div>
                <div style={{ color: RED, marginTop: 2 }}>Du: {m.given}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {mistakes.length > 0 && (
            <button type="button" onClick={() => start(mistakes.map((m) => m.item))} style={{ ...btn(false), border: `1px solid ${ACCENT}`, color: ACCENT }}>↻ Fehler üben ({mistakes.length})</button>
          )}
          <button type="button" onClick={() => start(buildSatzbauRound(pool))} style={btn(true)}>🔁 Neue Runde</button>
        </div>
      </div>
    );
  }

  const item = round[idx];
  const meta = DECK_META[item.deck];
  const arranged = state.placed.map((i) => state.chips[i]);
  const complete = state.placed.length === state.chips.length;
  const verdictColor = checked ? (checked.correct ? GREEN : RED) : "#2c3a47";
  const sentenceOf = (words) => `${[item.words[0], ...words].join(" ")}${item.end}`;

  const place = (i) => { if (!checked && !state.placed.includes(i)) setState((s) => ({ ...s, placed: [...s.placed, i] })); };
  const unplace = (i) => { if (!checked) setState((s) => ({ ...s, placed: s.placed.filter((p) => p !== i) })); };
  const check = () => {
    if (!complete || checked) return;
    const correct = isCorrectOrder(item, arranged);
    setChecked({ correct, own: false });
    if (correct) setRight((r) => r + 1);
    else setMistakes((m) => [...m, { item, given: sentenceOf(arranged) }]);
  };
  // "my order is right too": count it, take it off the mistakes
  const acceptOwn = () => {
    setChecked({ correct: true, own: true });
    setRight((r) => r + 1);
    setMistakes((m) => m.filter((x) => x.item !== item));
  };
  const next = () => {
    const n = idx + 1;
    setIdx(n); setState(newItemState(round[n])); setChecked(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7d8d9c", marginBottom: 10 }}>
        <span>{idx + 1} / {round.length}</span>
        <span>Punkte: {right} / {idx + (checked ? 1 : 0)}</span>
      </div>
      <div style={{ ...faceStyle(verdictColor), position: "relative", inset: "auto", minHeight: 280, gap: 10, justifyContent: "flex-start", paddingTop: 44 }}>
        {meta && <span style={badgeStyle("#7d8d9c")}>{meta.icon} {meta.label}</span>}
        <div style={{ fontSize: 12, color: "#7d8d9c" }}>Bilde den Satz:</div>
        {item.en && <div style={{ fontSize: 13, color: "#9ab0c2", textAlign: "center", fontStyle: "italic" }}>{item.en}</div>}

        {/* the sentence being built */}
        <div aria-label="Dein Satz" style={{ width: "100%", minHeight: 52, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: "8px 6px", borderBottom: `2px solid ${verdictColor === "#2c3a47" ? ACCENT : verdictColor}` }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#f2f5f8", padding: "8px 2px" }}>{item.words[0]}</span>
          {state.placed.map((i) => (
            <button key={i} type="button" onClick={() => unplace(i)} aria-label={`${state.chips[i]} zurücknehmen`} style={chip(true)}>{state.chips[i]}</button>
          ))}
          {complete && <span style={{ fontSize: 16, fontWeight: 800, color: "#f2f5f8" }}>{item.end}</span>}
        </div>

        {/* words still to place */}
        {!checked && (
          <div role="group" aria-label="Wörter" style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", minHeight: 40, marginTop: 4 }}>
            {state.chips.map((w, i) => (state.placed.includes(i) ? null : (
              <button key={i} type="button" onClick={() => place(i)} style={chip(false)}>{w}</button>
            )))}
          </div>
        )}

        {checked && (
          <div role="status" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${verdictColor}`, background: "rgba(0,0,0,.2)", textAlign: "center" }}>
            <div style={{ color: verdictColor, fontWeight: 700, fontSize: 14 }}>
              {checked.own ? "✓ Gezählt – deine Reihenfolge" : checked.correct ? "✓ Richtig!" : "✗ Andere Reihenfolge"}
            </div>
            <div style={{ color: "#f2f5f8", fontSize: 15, fontWeight: 600, marginTop: 6 }}>
              {item.sentence}
              <button type="button" onClick={() => speak(item.sentence)} aria-label={`Aussprechen: ${item.sentence}`} style={{ ...iconBtn, fontSize: 14 }}>🔊</button>
            </div>
            {!checked.correct && (
              <button type="button" onClick={acceptOwn} style={{ marginTop: 8, background: "none", border: "none", color: "#8fb8d8", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
                Meine Reihenfolge ist auch richtig
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {checked ? (
          <button type="button" onClick={next} style={btn(true)}>Weiter →</button>
        ) : (
          <>
            <button type="button" onClick={() => setState((s) => ({ ...s, placed: [] }))} disabled={!state.placed.length} style={{ ...btn(false), opacity: state.placed.length ? 1 : 0.5 }}>↺ Zurücksetzen</button>
            <button type="button" onClick={check} disabled={!complete} style={btn(true, complete)}>✓ Prüfen</button>
          </>
        )}
      </div>
    </div>
  );
}

SatzbauTrainer.propTypes = {
  pool: PropTypes.arrayOf(PropTypes.shape({
    sentence: PropTypes.string.isRequired,
    words: PropTypes.arrayOf(PropTypes.string).isRequired,
    end: PropTypes.string.isRequired,
    deck: PropTypes.string,
    en: PropTypes.string,
  })).isRequired,
};

export default SatzbauTrainer;
