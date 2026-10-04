import { useState } from "react";
import PropTypes from "prop-types";
import { shuffled } from "../../engine";
import { localize } from "./richText";

// ✏️ Üben: a few multiple-choice questions at the end of a grammar topic
// (data: src/data/grammar/exercises.json). One question at a time; after
// each answer the right option lights up with a one-line reason and the
// sentence in English. Options are shuffled every time, so positions can't
// be learned. The best score is reported to the parent (onDone), which
// keeps it per topic.

const BLANK = "___";
const GREEN = "#5fa85f";
const RED = "#e07b6f";
const ACCENT = "#e0833b";

const optionStyle = (state) => ({
  width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: state ? "default" : "pointer",
  border: `1px solid ${state === "right" ? GREEN : state === "wrong" ? RED : "#2c3a47"}`,
  background: state === "right" ? "rgba(95,168,95,.15)" : state === "wrong" ? "rgba(224,123,111,.12)" : "#0e1419",
  color: state === "right" ? GREEN : state === "wrong" ? RED : "#f2f5f8",
});
const mainBtn = { width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 10, border: "none", background: ACCENT, color: "#0e1419", fontSize: 14, fontWeight: 700, cursor: "pointer" };

// the sentence with its blank shown as a gap, or filled in once answered
function Sentence({ q, fill }) {
  const [before, after] = q.split(BLANK);
  return (
    <div style={{ fontSize: 16, color: "#f2f5f8", lineHeight: 1.5 }}>
      {before}
      {fill ? (
        <strong style={{ color: ACCENT }}>{fill.startsWith("-") ? fill.slice(1) : fill === "keine Endung" ? "" : fill}</strong>
      ) : (
        <span aria-label="Lücke" style={{ display: "inline-block", minWidth: 44, borderBottom: `2px solid ${ACCENT}`, margin: "0 2px" }}>&nbsp;</span>
      )}
      {after}
    </div>
  );
}

function GrammarExercises({ items, lang, best, onDone }) {
  const [options, setOptions] = useState(null); // shuffled options per question; null = not started
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [right, setRight] = useState(0);
  const total = items.length;
  // every round shuffles the options again
  const start = () => { setOptions(items.map((it) => shuffled(it.options))); setIdx(0); setPicked(null); setRight(0); };

  if (!options) {
    return (
      <button type="button" onClick={start} style={{ ...mainBtn, marginTop: 0 }}>
        ✏️ Übung starten ({total} Fragen){best != null ? ` · bisher ${best}/${total}` : ""}
      </button>
    );
  }

  if (idx >= total) {
    return (
      <div role="status" style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: right === total ? GREEN : "#f2f5f8" }}>
          {right === total ? "🎉 " : ""}{right} / {total} richtig
        </div>
        <button type="button" onClick={start} style={mainBtn}>↻ Nochmal</button>
      </div>
    );
  }

  const it = items[idx];
  const answered = picked !== null;
  const pick = (opt) => {
    if (answered) return;
    setPicked(opt);
    if (opt === it.answer) setRight((r) => r + 1);
  };
  const next = () => {
    const finished = idx + 1 >= total;
    if (finished) onDone(right);
    setIdx(idx + 1);
    setPicked(null);
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: "#7d8d9c", marginBottom: 8 }}>Frage {idx + 1} / {total}</div>
      <Sentence q={it.q} fill={answered ? it.answer : null} />
      <div role="group" aria-label="Antworten" style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {options[idx].map((opt) => {
          const state = !answered ? null : opt === it.answer ? "right" : opt === picked ? "wrong" : null;
          return (
            <button key={opt} type="button" onClick={() => pick(opt)} aria-disabled={answered} style={optionStyle(state)}>
              {state === "right" ? "✓ " : state === "wrong" ? "✗ " : ""}{opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <div role="status" style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "#0e1419", fontSize: 13, lineHeight: 1.5 }}>
          <div style={{ color: picked === it.answer ? GREEN : RED, fontWeight: 700 }}>
            {picked === it.answer ? "✓ Richtig! " : "✗ "}<span style={{ color: "#cdd8e2", fontWeight: 400 }}>{localize(it.why, lang)}</span>
          </div>
          <div style={{ color: "#7d8d9c", marginTop: 4 }}>{it.en}</div>
          <button type="button" onClick={next} style={mainBtn}>{idx + 1 >= total ? "Ergebnis" : "Weiter →"}</button>
        </div>
      )}
    </div>
  );
}

Sentence.propTypes = { q: PropTypes.string.isRequired, fill: PropTypes.string };

GrammarExercises.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    q: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    answer: PropTypes.string.isRequired,
    en: PropTypes.string,
    why: PropTypes.objectOf(PropTypes.string),
  })).isRequired,
  lang: PropTypes.string,
  best: PropTypes.number,
  onDone: PropTypes.func.isRequired,
};

export default GrammarExercises;
