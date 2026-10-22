import { useContext, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { ALL_CARDS, VERB_FORMS, LIST_BY_KEY } from "../data";
import { pluralOf } from "../modes/forms/buildForms";
import { ROUNDS, buildLexicon, checkText, pieces, weakOrder, readWeak, saveWeak } from "../engine/textCheck";
import { GrammarNavCtx } from "../context/GrammarNavCtx";

// 🔍 Fehler-Check (engine/textCheck.js): the learner's text, read once per
// kind of mistake – one round at a time, only that round's places marked.
// "⭐ Das mache ich oft falsch" (saved) puts those rounds first; the
// learner's own points become extra rounds without marks. Used in ✍️ Text
// prüfen (TextCheckView.jsx) and after DTZ Schreiben (WritingTrainer.jsx).

const ACCENT = "#e0833b";
const RED = "#e07b6f";
const SHORT = {
  "nomen-gross": "Nomen groß", "verb-konjugiert": "Verbform", "verb-position2": "Position 2", "verb-ende": "Verb am Ende",
  artikel: "Artikel", kasus: "Kasus", "adj-endung": "Adj.-Endung",
};

let lexicon = null; // built on first use: the app's nouns and verb forms
const lex = () => {
  if (!lexicon) {
    // verbs that always take the dative: 📋 Verben mit Dativ, group "Dativ"
    const list = LIST_BY_KEY["ga-verben-dativ"];
    const dativeIds = new Set(list ? list.rows.filter((r) => r.group === "Dativ").flatMap((r) => r.cards) : []);
    lexicon = buildLexicon(ALL_CARDS, VERB_FORMS, { pluralOf, dativeIds });
  }
  return lexicon;
};
let lastRound = { text: null, i: 0 }; // back from a 📖 grammar topic: same round

const chipBtn = (on, color = ACCENT) => ({
  minHeight: 34, padding: "5px 10px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
  border: on ? "none" : "1px solid #2c3a47", background: on ? color : "#1a232b", color: on ? "#0e1419" : "#cdd8e2",
});

function TextCheck({ text, grammarLinks = true }) {
  const { openGrammar } = useContext(GrammarNavCtx);
  const [weak, setWeak] = useState(readWeak);
  const [i, setI] = useState(lastRound.text === text ? lastRound.i : 0);
  const [ownText, setOwnText] = useState("");
  const marks = useMemo(() => checkText(text, lex()), [text]);
  const rounds = [...weakOrder(weak).map((r) => ({ ...r, auto: true })), ...weak.own.map((o) => ({ key: `own:${o}`, de: o, own: true }))];
  const idx = Math.min(i, rounds.length - 1);
  const round = rounds[idx];
  const go = (n) => { setI(n); lastRound = { text, i: n }; };
  const changeWeak = (next) => { setWeak(next); saveWeak(next); go(0); };
  const toggle = (key) => changeWeak({ ...weak, ticked: weak.ticked.includes(key) ? weak.ticked.filter((k) => k !== key) : [...weak.ticked, key] });
  const addOwn = () => {
    const t = ownText.trim();
    if (!t || weak.own.includes(t)) return;
    changeWeak({ ...weak, own: [...weak.own, t] });
    setOwnText("");
  };
  const found = round.auto ? marks[round.key] : [];
  const starred = (r) => r.own || weak.ticked.includes(r.key);

  return (
    <div>
      <div role="tablist" aria-label="Runden" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
        {rounds.map((r, n) => (
          <button key={r.key} type="button" role="tab" aria-selected={n === idx} onClick={() => go(n)} style={chipBtn(n === idx)}>
            {n + 1} {starred(r) ? "⭐ " : ""}{r.own ? r.de : SHORT[r.key]}
            {r.auto && marks[r.key].length > 0 && <span style={{ marginLeft: 4, color: n === idx ? "#0e1419" : RED }}>· {marks[r.key].length}</span>}
          </button>
        ))}
      </div>

      <div style={{ border: `1px solid ${starred(round) ? ACCENT : "#2c3a47"}`, borderRadius: 12, padding: "10px 12px", background: "#121a21", margin: "6px 0 10px" }}>
        <div style={{ fontSize: 12, color: "#7d8d9c" }}>Runde {idx + 1} von {rounds.length}{round.extra ? " · Extra (nicht im Buch)" : ""}{starred(round) ? " · ⭐ machst du oft falsch" : ""}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#f2f5f8", marginTop: 2 }}>{round.own ? `Achte nur auf: ${round.de}` : round.de}</div>
        {round.auto ? (
          <>
            <div style={{ fontSize: 12, color: "#7d8d9c" }}>{round.en}</div>
            <div style={{ fontSize: 13, color: "#cdd8e2", marginTop: 6, lineHeight: 1.45 }}>{round.rule.de}</div>
            <div style={{ fontSize: 12, color: "#7d8d9c", marginTop: 2 }}>{round.rule.en}</div>
            {grammarLinks && openGrammar && (
              <button type="button" onClick={() => openGrammar(round.grammar)} style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: "#8fb8d8", background: "transparent", border: "1px solid #3a5670", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>📖 Grammatik dazu</button>
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: "#7d8d9c", marginTop: 4 }}>Your own point – the app can&apos;t mark it. Read your text once, looking only for this.</div>
        )}
      </div>

      <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 15, lineHeight: 1.7, color: "#e6ecf1", padding: "10px 12px", borderRadius: 12, background: "#0e1419", border: "1px solid #2c3a47" }}>
        {pieces(text, found).map((p, n) => (p.mark ? (
          <mark key={n} style={{ background: p.mark.kind === "error" ? "rgba(224,123,111,.25)" : "rgba(224,131,59,.18)", color: "#f2f5f8", borderBottom: `2px ${p.mark.kind === "error" ? "solid" : "dashed"} ${p.mark.kind === "error" ? RED : ACCENT}`, borderRadius: 3, padding: "0 1px" }}>{p.t}</mark>
        ) : <span key={n}>{p.t}</span>))}
      </div>

      {round.auto && (
        <div role="status" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {found.length === 0 ? (
            <div style={{ fontSize: 13, color: "#5fa85f" }}>✅ Die App findet hier nichts. Lies trotzdem einmal selbst – sie kennt nur die Wörter aus deinen Karten.</div>
          ) : found.map((m) => (
            <div key={`${m.start}-${m.end}`} style={{ fontSize: 13, lineHeight: 1.4, color: m.kind === "error" ? "#f2f5f8" : "#cdd8e2" }}>
              <span aria-hidden="true">{m.kind === "error" ? "❌ " : "🔎 "}</span>
              <b>{m.de}</b>
              <span style={{ display: "block", fontSize: 12, color: "#7d8d9c", marginLeft: 22 }}>{m.kind === "error" ? m.en : `${m.en} (maybe fine)`}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" disabled={idx === 0} onClick={() => go(idx - 1)} style={{ ...chipBtn(false), flex: 1, minHeight: 44, opacity: idx === 0 ? 0.5 : 1 }}>{idx === 0 ? "←" : `← Runde ${idx}`}</button>
        {idx < rounds.length - 1
          ? <button type="button" onClick={() => go(idx + 1)} style={{ ...chipBtn(true), flex: 2, minHeight: 44 }}>Nächste Runde →</button>
          : <div role="status" style={{ flex: 2, alignSelf: "center", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#5fa85f" }}>✅ Alle Runden gelesen</div>}
      </div>

      <details style={{ marginTop: 12, border: "1px solid #2c3a47", borderRadius: 12, padding: "8px 12px", background: "#121a21" }}>
        <summary style={{ cursor: "pointer", fontWeight: 800, color: "#f2f5f8", fontSize: 14 }}>⭐ Das mache ich oft falsch{weak.ticked.length + weak.own.length ? ` (${weak.ticked.length + weak.own.length})` : ""}</summary>
        <div style={{ fontSize: 12, color: "#7d8d9c", margin: "6px 0" }}>Tick what you often get wrong: those rounds come first, and the 🤖 AI check looks at them first.</div>
        {ROUNDS.map((r) => (
          <label key={r.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, color: "#f2f5f8", padding: "5px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={weak.ticked.includes(r.key)} onChange={() => toggle(r.key)} style={{ marginTop: 3 }} />
            <span>{r.de}<span style={{ display: "block", fontSize: 12, color: "#7d8d9c" }}>{r.en}</span></span>
          </label>
        ))}
        {weak.own.map((o) => (
          <div key={o} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "#f2f5f8", padding: "3px 0" }}>
            <span style={{ flex: 1 }}>⭐ {o}</span>
            <button type="button" aria-label={`Entfernen: ${o}`} onClick={() => changeWeak({ ...weak, own: weak.own.filter((x) => x !== o) })} style={{ background: "none", border: "none", color: "#7d8d9c", fontSize: 16, cursor: "pointer" }}>✕</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input
            value={ownText}
            onChange={(e) => setOwnText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOwn(); } }}
            placeholder="Eigener Punkt, z. B. Komma vor „dass“"
            aria-label="Eigener Punkt"
            style={{ flex: 1, minWidth: 0, height: 40, padding: "0 10px", borderRadius: 10, border: "1px solid #2c3a47", background: "#0e1419", color: "#f2f5f8", fontSize: 15 }}
          />
          <button type="button" onClick={addOwn} disabled={!ownText.trim()} style={{ ...chipBtn(Boolean(ownText.trim())), minHeight: 40 }}>＋</button>
        </div>
      </details>
    </div>
  );
}

TextCheck.propTypes = {
  text: PropTypes.string.isRequired,
  grammarLinks: PropTypes.bool,
};

export default TextCheck;
