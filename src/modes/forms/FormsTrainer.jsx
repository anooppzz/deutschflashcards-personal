import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { GENDER_COLORS } from "../../constants";
import { DECK_META } from "../../data";
import { idOf, validateGermanWord } from "../../engine";
import { faceStyle, badgeStyle } from "../../components";
import { buildFormsRound } from "./buildForms";

// 🔁 Formen: drill the forms the cards show.
// - Perfekt: pick hat / ist, type the Partizip II (gehen → ist gegangen)
// - Plural: type the plural (der Stuhl → die Stühle)
// Each answer is a real review of the card (onGrade), like the Artikel
// trainer. The round is built when the trainer opens; the parent gives it
// a new key when the kind or the selected topics change.

const ACCENT = "#e0833b";
const btn = (on, color = ACCENT) => ({
  flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer",
  border: on ? "none" : "1px solid #2c3a47", background: on ? color : "#1a232b", color: on ? "#0e1419" : "#cdd8e2",
});
const inputStyle = {
  flex: 1, minWidth: 0, padding: "11px 12px", borderRadius: 10, border: "2px solid #2c3a47", background: "#16202a",
  color: "#f2f5f8", fontSize: 16, fontFamily: "inherit", boxSizing: "border-box",
};

const answerText = (item, kind) => (kind === "perfekt" ? `${item.aux}${item.reflexive ? " sich" : ""} ${item.partizip}` : `die ${item.plural}`);

function FormsTrainer({ kind, pool, progress, onGrade }) {
  const [round, setRound] = useState(() => buildFormsRound(pool, progress));
  const [idx, setIdx] = useState(0);
  const [aux, setAux] = useState(null);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(null); // { correct, auxOk, wordOk }
  const [mistakes, setMistakes] = useState([]);
  const [right, setRight] = useState(0);
  const inputRef = useRef(null);
  const nextRef = useRef(null);

  const item = round[idx];
  const done = idx >= round.length;
  useEffect(() => {
    if (checked) nextRef.current?.focus();
    else inputRef.current?.focus({ preventScroll: true });
  }, [checked, idx]);

  const start = (items) => {
    setRound(items); setIdx(0); setAux(null); setInput(""); setChecked(null); setMistakes([]); setRight(0);
  };

  if (!pool.length) {
    return (
      <div role="status" style={{ textAlign: "center", padding: "40px 16px", color: "#7d8d9c", fontSize: 14 }}>
        {kind === "perfekt" ? "Keine Verben mit Perfekt in dieser Auswahl." : "Keine Nomen mit Plural in dieser Auswahl."}
        <div style={{ marginTop: 6, fontSize: 13 }}>Wähle oben andere Themen.</div>
      </div>
    );
  }

  if (done) {
    const pct = round.length ? Math.round((right / round.length) * 100) : 0;
    return (
      <div style={{ textAlign: "center", padding: "10px 4px" }}>
        <div aria-hidden="true" style={{ fontSize: 44 }}>{pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📚"}</div>
        <div role="status" style={{ fontSize: 20, fontWeight: 800, color: "#f2f5f8" }}>{right} / {round.length} richtig ({pct}%)</div>
        {mistakes.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
            {mistakes.map((m) => (
              <div key={idOf(m.item.deck, m.item.front)} style={{ padding: "8px 12px", borderRadius: 10, background: "#161d24", border: "1px solid #2c3a47", fontSize: 13 }}>
                <div style={{ color: "#f2f5f8", fontWeight: 700 }}>{m.item.front} → <span style={{ color: "#5fa85f" }}>{answerText(m.item, kind)}</span></div>
                <div style={{ color: "#e07b6f", marginTop: 2 }}>Du: {m.given}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {mistakes.length > 0 && (
            <button type="button" onClick={() => start(mistakes.map((m) => m.item))} style={{ ...btn(false), border: `1px solid ${ACCENT}`, color: ACCENT }}>↻ Fehler üben ({mistakes.length})</button>
          )}
          <button type="button" onClick={() => start(buildFormsRound(pool, progress))} style={btn(true)}>🔁 Neue Runde</button>
        </div>
      </div>
    );
  }

  const isPerfekt = kind === "perfekt";
  const ready = input.trim() && (!isPerfekt || aux);
  const check = () => {
    if (!ready || checked) return;
    const wordOk = validateGermanWord(input, isPerfekt ? item.partizip : item.plural);
    const auxOk = !isPerfekt || aux === item.aux;
    const correct = wordOk && auxOk;
    setChecked({ correct, auxOk, wordOk });
    if (correct) setRight((r) => r + 1);
    else setMistakes((m) => [...m, { item, given: isPerfekt ? `${aux}${item.reflexive ? " sich" : ""} ${input.trim()}` : `die ${input.trim()}` }]);
    onGrade(idOf(item.deck, item.front), correct);
  };
  const next = () => { setIdx(idx + 1); setAux(null); setInput(""); setChecked(null); };
  const onKey = (e) => { if (e.key === "Enter") { e.preventDefault(); if (checked) next(); else check(); } };

  const meta = DECK_META[item.deck];
  const accent = item.type === "n" ? GENDER_COLORS[item.gender] || "#7d8d9c" : "#5fa85f";
  const verdictColor = checked ? (checked.correct ? "#5fa85f" : "#e07b6f") : null;
  const why = checked && !checked.correct
    ? [!checked.auxOk && "Hilfsverb", !checked.wordOk && (isPerfekt ? "Partizip" : "Plural")].filter(Boolean).join(" + ")
    : "";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7d8d9c", marginBottom: 10 }}>
        <span>{idx + 1} / {round.length}</span>
        <span>Punkte: {right} / {idx + (checked ? 1 : 0)}</span>
      </div>
      <div style={{ ...faceStyle(verdictColor || accent), position: "relative", inset: "auto", minHeight: 260, gap: 6 }}>
        {meta && <span style={badgeStyle(accent)}>{meta.icon} {meta.label}</span>}
        <div style={{ fontSize: 12, color: "#7d8d9c", marginTop: 18 }}>{isPerfekt ? "Perfekt von" : "Plural von"}</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: "#f2f5f8", textAlign: "center", lineHeight: 1.2 }}>{item.front}</div>
        <div style={{ fontSize: 13, color: "#9ab0c2", textAlign: "center", marginBottom: 10 }}>{item.english}</div>

        {isPerfekt && (
          <div role="group" aria-label="Hilfsverb" style={{ display: "flex", gap: 8, width: "100%", marginBottom: 8 }}>
            {["hat", "ist"].map((a) => (
              <button key={a} type="button" aria-pressed={aux === a} disabled={Boolean(checked)} onClick={() => setAux(a)} style={btn(aux === a)}>{a}{item.reflexive ? " sich" : ""}</button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
          {!isPerfekt && <span style={{ fontSize: 16, fontWeight: 700, color: GENDER_COLORS.die }}>die</span>}
          <input
            ref={inputRef}
            value={input}
            disabled={Boolean(checked)}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            aria-label={isPerfekt ? "Partizip II" : "Plural"}
            placeholder={isPerfekt ? "Partizip II, z. B. gegangen" : "Plural …"}
            autoCapitalize={isPerfekt ? "none" : "sentences"}
            autoComplete="off"
            spellCheck={false}
            style={inputStyle}
          />
        </div>

        {checked && (
          <div role="status" style={{ width: "100%", marginTop: 10, padding: "8px 10px", borderRadius: 10, textAlign: "center", border: `1px solid ${verdictColor}`, background: "rgba(0,0,0,.2)", color: verdictColor, fontSize: 14, fontWeight: 700 }}>
            {checked.correct ? "✓ Richtig: " : `✗ ${why} – richtig: `}
            <span style={{ color: "#f2f5f8" }}>{answerText(item, kind)}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {checked ? (
          <button ref={nextRef} type="button" onClick={next} onKeyDown={onKey} style={{ ...btn(true), width: "100%" }}>Weiter →</button>
        ) : (
          <button type="button" onClick={check} disabled={!ready} style={{ ...btn(Boolean(ready)), width: "100%", opacity: ready ? 1 : 0.6, cursor: ready ? "pointer" : "default" }}>✓ Prüfen</button>
        )}
      </div>
    </div>
  );
}

const itemShape = PropTypes.shape({
  deck: PropTypes.string.isRequired,
  front: PropTypes.string.isRequired,
  english: PropTypes.string,
  type: PropTypes.string,
  gender: PropTypes.string,
  aux: PropTypes.string,
  reflexive: PropTypes.bool,
  partizip: PropTypes.string,
  plural: PropTypes.string,
});

FormsTrainer.propTypes = {
  kind: PropTypes.oneOf(["perfekt", "plural"]).isRequired,
  pool: PropTypes.arrayOf(itemShape).isRequired,
  progress: PropTypes.object.isRequired,
  onGrade: PropTypes.func.isRequired,
};

export default FormsTrainer;
