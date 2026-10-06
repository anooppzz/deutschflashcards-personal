import { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { STORAGE_KEYS } from "../../constants";
import { AiCtx } from "../../context/AiCtx";
import { aiSiteLinks } from "../../engine/lookup";
import { formatClock } from "./dtz";
import {
  WRITING_MINUTES, WRITING_A2_FROM, WRITING_B1_FROM, CRITERIA, POINT_STEPS,
  writingChecks, wordCount, writingLevel, suggestTaskPoints, writingReviewPrompt,
} from "./writing";

// ✍️ DTZ Schreiben (writing.js). One pair of tasks: choose A or B like in the
// exam, then
// - 📝 Prüfung: 30-minute clock (⏸ possible), no help; at 0:00 it is handed in;
// - ✏️ Üben: no clock, useful phrases and a live checklist.
// After "Abgeben": checklist, model answer (per Leitpunkt, with English),
// self-rating on the four official criteria (→ x/20 → A2 7 / B1 15), and
// the text rated by AI – in the app (✨, when switched on) or on the
// Claude/ChatGPT/Gemini websites with a ready-made request.
// Drafts are saved per task (STORAGE_KEYS.DTZ_WRITING, in the backup).

const ACCENT = "#e0833b";
const GREEN = "#5fa85f";
const RED = "#e07b6f";
const LEVEL_COLOR = { B1: GREEN, A2: ACCENT, "unter A2": RED };
const card = { padding: 14, borderRadius: 12, border: "1px solid #2c3a47", background: "#161d24", marginBottom: 12 };
const h3 = { margin: "0 0 6px", fontSize: 15, color: "#f2f5f8" };
const instr = { margin: "0 0 10px", fontSize: 13, color: "#9ab0c2", lineHeight: 1.5 };
const label = { fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", margin: "4px 0 8px", textTransform: "uppercase" };
const bigBtn = (primary) => ({
  display: "block", width: "100%", padding: "12px 14px", marginBottom: 8, borderRadius: 12, cursor: "pointer", font: "inherit", fontWeight: 800, textAlign: "center",
  border: primary ? "none" : "1px solid #2c3a47", background: primary ? ACCENT : "#1a232b", color: primary ? "#0e1419" : "#f2f5f8",
});
const smallBtn = { padding: "7px 12px", borderRadius: 10, border: "1px solid #2c3a47", background: "#1a232b", color: "#cdd8e2", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const chip = { padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none", border: "1px solid #3a5670", color: "#8fb8d8" };

// ---- drafts ----
const readDrafts = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.DTZ_WRITING) || "{}") || {}; } catch { return {}; } };
const writeDraft = (key, draft) => {
  try {
    const all = readDrafts();
    if (draft) all[key] = { ...draft, at: new Date().toISOString() }; else delete all[key];
    localStorage.setItem(STORAGE_KEYS.DTZ_WRITING, JSON.stringify(all));
  } catch { /* storage off: the text lives until the view closes */ }
};

// ---- pieces ----

function TaskCard({ task, letter, showEn, children }) {
  return (
    <div style={card}>
      <h3 style={h3}>{letter ? `Aufgabe ${letter}: ` : ""}{task.title} <span style={{ fontSize: 12, color: "#7d8d9c", fontWeight: 600 }}>· {task.kind} · {task.register === "formal" ? "formell (Sie)" : "persönlich (du)"}</span></h3>
      <p style={{ ...instr, color: "#cdd8e2", margin: "0 0 4px" }}>{task.situation} <b>{task.instruction}</b></p>
      {showEn && <p style={{ ...instr, fontSize: 12, fontStyle: "italic", margin: "0 0 4px" }}>{task.situationEn} {task.instructionEn}</p>}
      <div style={{ fontSize: 13, color: "#9ab0c2", margin: "8px 0 4px" }}>Schreiben Sie etwas zu folgenden Punkten:</div>
      {children || (
        <ul style={{ margin: 0, paddingLeft: 20, color: "#f2f5f8", fontSize: 14, lineHeight: 1.6 }}>
          {task.points.map((p) => <li key={p.de}>{p.de}{showEn && <span style={{ color: "#7d8d9c", fontSize: 12 }}> – {p.en}</span>}</li>)}
        </ul>
      )}
    </div>
  );
}

function Checklist({ checks }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {checks.map((c) => (
        <div key={c.key} style={{ display: "flex", gap: 8, fontSize: 13, color: "#cdd8e2", lineHeight: 1.4 }}>
          <span aria-hidden="true" style={{ width: 18, flexShrink: 0 }}>{c.ok === true ? "✅" : c.ok === false ? "⚠️" : "💡"}</span>
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}><b style={{ color: c.ok === false ? RED : "#f2f5f8" }}>{c.de.replace(/\*\*/g, "")}</b> <span style={{ color: "#7d8d9c" }}>{c.en}</span></span>
        </div>
      ))}
    </div>
  );
}

function ModelAnswer({ task }) {
  const [en, setEn] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setEn((v) => !v)} style={{ ...smallBtn, fontSize: 12, padding: "4px 10px", marginBottom: 8 }}>{en ? "Englisch aus" : "🇬🇧 Englisch zeigen"}</button>
      <div style={{ fontSize: 14, color: "#f2f5f8", lineHeight: 1.6 }}>
        <p style={{ margin: "0 0 8px" }}>{task.model.anrede}</p>
        {task.model.parts.map((p, i) => (
          <div key={i} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: `3px solid ${ACCENT}` }}>
            <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>Punkt {i + 1}: {task.points[i].de}</div>
            <div>{p}</div>
            {en && <div style={{ fontSize: 12, color: "#9ab0c2", fontStyle: "italic" }}>{task.model.partsEn[i]}</div>}
          </div>
        ))}
        <p style={{ margin: 0, whiteSpace: "pre-line" }}>{task.model.gruss}</p>
      </div>
    </div>
  );
}

function SelfRating({ ticked, onSave, saved }) {
  const [points, setPoints] = useState(() => ({ task: suggestTaskPoints(ticked) }));
  const done = CRITERIA.every((c) => points[c.key] !== undefined);
  const total = CRITERIA.reduce((s, c) => s + (points[c.key] || 0), 0);
  const level = writingLevel(total);
  return (
    <div>
      <p style={instr}>Lies die Beschreibungen und wähle ehrlich. Vergleiche mit der Musterlösung – noch besser: lass die KI oder deine Lehrkraft bewerten.</p>
      {CRITERIA.map((c) => (
        <div key={c.key} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#f2f5f8" }}>{c.de} <span style={{ fontSize: 12, color: "#7d8d9c", fontWeight: 600 }}>· {c.en}</span></div>
          <div style={{ fontSize: 12, color: "#9ab0c2", lineHeight: 1.5, margin: "2px 0 6px" }}>
            {Object.entries(c.levels).map(([lvl, d]) => <div key={lvl}><b style={{ color: "#cdd8e2" }}>{lvl}:</b> {d}</div>)}
          </div>
          <div role="radiogroup" aria-label={c.de} style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
            {POINT_STEPS.map((s) => {
              const on = points[c.key] === s.points;
              return (
                <button key={s.points} type="button" role="radio" aria-checked={on} onClick={() => setPoints((p) => ({ ...p, [c.key]: s.points }))}
                  style={{ padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${on ? ACCENT : "#2c3a47"}`, background: on ? "rgba(224,131,59,.18)" : "#0e1419", color: on ? ACCENT : "#cdd8e2", lineHeight: 1.2 }}>
                  {s.points}<div style={{ fontSize: 10, color: on ? ACCENT : "#7d8d9c" }}>{s.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div role="status" style={{ ...card, textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#f2f5f8" }}>{total} / 20</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: done ? LEVEL_COLOR[level] : "#7d8d9c" }}>
          {done ? (level === "unter A2" ? `Unter A2 – ab ${WRITING_A2_FROM} Punkten A2` : `Stufe ${level}${level === "A2" ? ` · für B1 fehlen ${WRITING_B1_FROM - total}` : ""}`) : "Bitte alle 4 Kriterien bewerten."}
        </div>
      </div>
      <button type="button" disabled={!done || saved} onClick={() => onSave(total)} style={{ ...bigBtn(done && !saved), opacity: done ? 1 : 0.6 }}>
        {saved ? "✓ Gespeichert" : "💾 Ergebnis speichern"}
      </button>
    </div>
  );
}

// ---- the trainer ----

function WritingTrainer({ pair, onResult, toTop }) {
  const ai = useContext(AiCtx);
  const [choice, setChoice] = useState(null); // { letter, exam }
  const [stage, setStage] = useState("write"); // write → review
  const [text, setText] = useState("");
  const [ticks, setTicks] = useState([false, false, false, false]);
  const [left, setLeft] = useState(WRITING_MINUTES * 60);
  const [paused, setPaused] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(null);
  const task = choice ? pair[choice.letter] : null;

  const start = (letter, exam) => {
    const d = readDrafts()[pair[letter].key];
    setChoice({ letter, exam });
    setText(exam ? "" : d?.text || "");
    setTicks(exam ? [false, false, false, false] : d?.ticks || [false, false, false, false]);
    setLeft(WRITING_MINUTES * 60); setPaused(false); setStage("write"); setSaved(false);
    toTop();
  };
  // every change is kept as the task's draft
  useEffect(() => { if (task && text) writeDraft(task.key, { text, ticks }); }, [task, text, ticks]);

  // the exam clock; at 0 the text is handed in
  const running = Boolean(choice?.exam) && stage === "write" && !paused;
  useEffect(() => {
    if (!running) return undefined;
    const end = Date.now() + left * 1000;
    const t = setInterval(() => {
      const s = (end - Date.now()) / 1000;
      setLeft(s);
      if (s <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (running && left <= 0) { setStage("review"); toTop(); } }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) {
    const drafts = readDrafts();
    return (
      <div>
        <p style={instr}>
          Wie in der Prüfung: Wählen Sie <b>Aufgabe A oder B</b>. Schreiben Sie eine E-Mail oder einen Brief zu allen <b>4 Punkten</b>, mit <b>Anrede</b> und <b>Gruß</b>. Zeit: {WRITING_MINUTES} Minuten. Bewertung: 4 Kriterien × 5 Punkte – ab {WRITING_A2_FROM} von 20 A2, ab {WRITING_B1_FROM} B1.
        </p>
        <button type="button" onClick={() => setShowEn((v) => !v)} style={{ ...smallBtn, fontSize: 12, padding: "4px 10px", marginBottom: 10 }}>{showEn ? "Englisch aus" : "🇬🇧 Englisch zeigen"}</button>
        {["a", "b"].map((letter) => (
          <div key={letter}>
            <TaskCard task={pair[letter]} letter={letter.toUpperCase()} showEn={showEn} />
            <div style={{ display: "flex", gap: 8, marginTop: -4, marginBottom: 16 }}>
              <button type="button" onClick={() => start(letter, true)} style={{ ...bigBtn(true), flex: 1, marginBottom: 0 }}>📝 Prüfung · {WRITING_MINUTES} Min.</button>
              <button type="button" onClick={() => start(letter, false)} style={{ ...bigBtn(false), flex: 1, marginBottom: 0 }}>✏️ Üben{drafts[pair[letter].key] ? " · Entwurf" : ""}</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const checks = writingChecks(text, task.register);
  const words = wordCount(text);
  const prompt = writingReviewPrompt(task, text);
  const copyPrompt = (site) => {
    try { navigator.clipboard.writeText(prompt).then(() => setCopied(site), () => {}); } catch { /* no clipboard */ }
  };

  if (stage === "review") {
    return (
      <div>
        <TaskCard task={task} letter={choice.letter.toUpperCase()} showEn={false} />
        <div style={label}>Dein Text · {words} Wörter</div>
        <div style={{ ...card, whiteSpace: "pre-wrap", fontSize: 14, color: "#f2f5f8", lineHeight: 1.6, overflowWrap: "anywhere" }}>{text.trim() || <i style={{ color: "#7d8d9c" }}>(leer)</i>}</div>
        <div style={label}>Checkliste</div>
        <div style={card}><Checklist checks={checks} /></div>

        <div style={label}>Bewerten lassen</div>
        <div style={card}>
          {ai.enabled && ai.ask && (
            <button type="button" disabled={!text.trim()} onClick={() => ai.ask({ kind: "writing", title: task.title, question: prompt, context: prompt })} style={{ ...bigBtn(true), marginBottom: 10 }}>✨ KI bewerten lassen (in der App)</button>
          )}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#9ab0c2" }}>🤖 Bewerten:</span>
            {aiSiteLinks(prompt).map((l) => (
              <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => copyPrompt(l)} style={chip}>{l.label} ↗</a>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 6 }}>
            {copied ? (copied.prefill ? `📋 Anfrage kopiert – falls ${copied.label} sie nicht zeigt: einfügen.` : `📋 Anfrage kopiert – in ${copied.label} einfügen.`) : "Die KI bekommt Aufgabe, Punkte, deinen Text und die offiziellen Kriterien."}
          </div>
        </div>

        <details style={card}>
          <summary style={{ cursor: "pointer", fontWeight: 800, color: "#f2f5f8" }}>📄 Musterlösung (B1)</summary>
          <div style={{ marginTop: 10 }}><ModelAnswer task={task} /></div>
        </details>

        <div style={label}>Selbst bewerten</div>
        <div style={card}>
          <SelfRating
            ticked={ticks.filter(Boolean).length}
            saved={saved}
            onSave={(total) => { onResult({ mode: "schreiben", label: `Schreiben · ${task.title}`, right: total, total: 20 }); setSaved(true); }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => { setStage("write"); setChoice({ ...choice, exam: false }); toTop(); }} style={{ ...bigBtn(false), flex: 1 }}>✏️ Weiter bearbeiten</button>
          <button type="button" onClick={() => { if (window.confirm("Text löschen und neu anfangen?")) { writeDraft(task.key, null); setChoice(null); toTop(); } }} style={{ ...bigBtn(false), flex: 1, color: RED }}>🗑 Neu anfangen</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {choice.exam && (
        <div style={{ position: "sticky", top: 0, zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 10, borderRadius: 12, background: "#1a232b", border: `1px solid ${left < 300 ? RED : "#2c3a47"}` }}>
          <span style={{ fontWeight: 800, color: "#f2f5f8" }}>Schreiben · {words} Wörter</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-live="off" style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: left < 300 ? RED : ACCENT }}>⏱ {formatClock(left)}</span>
            <button type="button" aria-label={paused ? "Weiter" : "Pause"} onClick={() => setPaused(!paused)} style={{ ...smallBtn, padding: "4px 10px" }}>{paused ? "▶" : "⏸"}</button>
          </span>
        </div>
      )}
      {paused ? (
        <div role="status" style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#f2f5f8" }}>⏸ Pause</div>
          <p style={{ ...instr, margin: "6px 0 10px" }}>Die Zeit steht, dein Text ist gespeichert.</p>
          <button type="button" onClick={() => setPaused(false)} style={{ ...bigBtn(true), marginBottom: 0 }}>▶ Weiter</button>
        </div>
      ) : (
        <>
          <TaskCard task={task} letter={choice.letter.toUpperCase()} showEn={!choice.exam && showEn}>
            <div role="group" aria-label="Leitpunkte" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {task.points.map((p, i) => (
                <label key={p.de} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: ticks[i] ? GREEN : "#f2f5f8", cursor: "pointer" }}>
                  <input type="checkbox" checked={ticks[i]} onChange={() => setTicks((t) => t.map((v, j) => (j === i ? !v : v)))} />
                  <span>{p.de}{!choice.exam && showEn && <span style={{ color: "#7d8d9c", fontSize: 12 }}> – {p.en}</span>}</span>
                </label>
              ))}
              <div style={{ fontSize: 11, color: "#7d8d9c" }}>Abhaken, wenn du etwas zu dem Punkt geschrieben hast.</div>
            </div>
          </TaskCard>

          {!choice.exam && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <button type="button" onClick={() => setShowEn((v) => !v)} style={{ ...smallBtn, fontSize: 12, padding: "4px 10px" }}>{showEn ? "Englisch aus" : "🇬🇧 Englisch"}</button>
            </div>
          )}
          {!choice.exam && (
            <details style={card}>
              <summary style={{ cursor: "pointer", fontWeight: 800, color: "#f2f5f8" }}>💬 Nützliche Sätze</summary>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "#f2f5f8", lineHeight: 1.6 }}>
                {task.phrases.map((p) => <li key={p.de}>{p.de} <span style={{ color: "#7d8d9c" }}>– {p.en}</span></li>)}
              </ul>
            </details>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={task.register === "formal" ? "Sehr geehrte …," : "Liebe … / Lieber …,"}
            aria-label="Dein Text"
            rows={14}
            spellCheck={false}
            autoCorrect="off"
            style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: 12, border: "1px solid #3a5670", background: "#0e1419", color: "#f2f5f8", fontSize: 16, lineHeight: 1.5, fontFamily: "inherit", resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7d8d9c", margin: "4px 0 10px" }}>
            <span>{words} Wörter</span>
            <span>{choice.exam ? "Prüfung: keine Hilfen" : "Entwurf wird gespeichert"}</span>
          </div>
          {!choice.exam && <div style={card}><Checklist checks={checks} /></div>}
          <button type="button" onClick={() => { if (words < 20 && !window.confirm("Dein Text ist sehr kurz. Trotzdem abgeben?")) return; setStage("review"); toTop(); }} style={bigBtn(true)}>✓ Abgeben und bewerten</button>
        </>
      )}
    </div>
  );
}

const taskShape = PropTypes.shape({
  key: PropTypes.string.isRequired, title: PropTypes.string.isRequired, register: PropTypes.string.isRequired,
  points: PropTypes.arrayOf(PropTypes.shape({ de: PropTypes.string, en: PropTypes.string })).isRequired,
  model: PropTypes.object.isRequired, phrases: PropTypes.array.isRequired,
});
TaskCard.propTypes = { task: taskShape.isRequired, letter: PropTypes.string, showEn: PropTypes.bool, children: PropTypes.node };
Checklist.propTypes = { checks: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, ok: PropTypes.bool, de: PropTypes.string, en: PropTypes.string })).isRequired };
ModelAnswer.propTypes = { task: taskShape.isRequired };
SelfRating.propTypes = { ticked: PropTypes.number.isRequired, onSave: PropTypes.func.isRequired, saved: PropTypes.bool };
WritingTrainer.propTypes = {
  pair: PropTypes.shape({ a: taskShape.isRequired, b: taskShape.isRequired }).isRequired,
  onResult: PropTypes.func.isRequired,
  toTop: PropTypes.func.isRequired,
};

export default WritingTrainer;
