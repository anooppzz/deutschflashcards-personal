import { useState, useEffect, useRef, Fragment } from "react";
import PropTypes from "prop-types";
import { stopSpeaking, pauseSpeaking } from "../../engine/speech";
import { AudioControls } from "../../components";
import { PARTS, A2_FROM, B1_FROM, itemsOf, itemsOfPart, choicesFor, scoreItems, levelFor, range, formatClock } from "./dtz";
import { WRITING_MINUTES, writingLevel } from "./writing";
import WritingTrainer from "./WritingTrainer";
import SpeakingTrainer from "./SpeakingTrainer";
import { SPEAKING_MINUTES, speakingLevel } from "./speaking";

// 🎓 DTZ trainer (format: docs/DTZ_FORMAT.md). Three ways in:
// - Teil üben: one Teil, audio as often as you like, then "Auswerten" shows
//   right/wrong, the reason and (Hören) the transcript.
// - Simulation: Hören (25 min, each text once) and/or Lesen (45 min) with a
//   timer, no feedback until the end; result x/45 → A2 (20) / B1 (33).
// - ✍️ Schreiben: a pair of writing tasks (WritingTrainer.jsx, writing.js).
// - 🗣 Sprechen: Teil 1/2/3 or the oral exam (SpeakingTrainer.jsx, speaking.js).
// - Ergebnisse: the last results.
// view lives in App (back gesture): { kind: "home" } · { kind: "teil", part, teil }
// · { kind: "sim", parts, done } · { kind: "schreiben", pair }
// · { kind: "sprechen", teil: 1 | 2 | 3 | "sim", item?, done }.

const ACCENT = "#e0833b";
const GREEN = "#5fa85f";
const RED = "#e07b6f";
const WHO = { f: "Frau", f2: "Frau", m: "Mann", a: "Ansage" };
const LEVEL_COLOR = { B1: GREEN, A2: ACCENT, "unter A2": RED };

const card = { padding: 14, borderRadius: 12, border: "1px solid #2c3a47", background: "#161d24", marginBottom: 12 };
const h3 = { margin: "0 0 6px", fontSize: 15, color: "#f2f5f8" };
const instr = { margin: "0 0 10px", fontSize: 13, color: "#9ab0c2", lineHeight: 1.5 };
const bigBtn = (primary) => ({
  display: "block", width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 8, borderRadius: 12, cursor: "pointer", font: "inherit",
  border: primary ? "none" : "1px solid #2c3a47", background: primary ? ACCENT : "#1a232b", color: primary ? "#0e1419" : "#f2f5f8",
});
const smallBtn = { padding: "7px 12px", borderRadius: 10, border: "1px solid #2c3a47", background: "#1a232b", color: "#cdd8e2", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const choiceBtn = (state, picked) => ({
  padding: "8px 11px", borderRadius: 10, fontSize: 14, textAlign: "left", cursor: state ? "default" : "pointer", lineHeight: 1.35,
  border: `1px solid ${state === "right" ? GREEN : state === "wrong" ? RED : picked ? ACCENT : "#2c3a47"}`,
  background: state === "right" ? "rgba(95,168,95,.15)" : state === "wrong" ? "rgba(224,123,111,.12)" : picked ? "rgba(224,131,59,.15)" : "#0e1419",
  color: state === "right" ? GREEN : state === "wrong" ? RED : "#f2f5f8",
});

// ---- small pieces ----

// a Hören text; once (simulation): it can be paused, but after it ends or is stopped it can't be played again
function AudioButton({ lines, once, played, onPlayed }) {
  const used = once && played;
  return (
    <div style={{ margin: "6px 0 10px" }}>
      <AudioControls lines={lines} label={used ? "✓ gehört (nur einmal)" : once ? "▶ Anhören (nur einmal)" : "▶ Anhören"} disabled={used} onStart={onPlayed} />
    </div>
  );
}

function Transcript({ lines }) {
  return (
    <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 10, background: "#0e1419", fontSize: 13, lineHeight: 1.5, color: "#cdd8e2" }}>
      {lines.map((l, i) => (
        <div key={i}>{lines.length > 1 && <b style={{ color: "#8fb8d8" }}>{l.name || WHO[l.who]}: </b>}{l.text}</div>
      ))}
    </div>
  );
}

function Document({ doc, answers, gapItems }) {
  if (doc.kind === "directory") {
    return (
      <div style={{ ...card, background: "#0e1419" }}>
        <div style={{ fontWeight: 800, color: "#f2f5f8", marginBottom: 8 }}>{doc.title}</div>
        {doc.floors.map((fl) => (
          <div key={fl.floor} style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: "1px solid #1f2a33" }}>
            <div style={{ width: 46, flexShrink: 0, fontWeight: 800, color: ACCENT }}>{fl.floor}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {fl.entries.map((e) => (
                <div key={e.name} style={{ fontSize: 13, color: "#cdd8e2", marginBottom: 4 }}><b style={{ color: "#f2f5f8" }}>{e.name}</b> – {e.details}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  // text / email / letter; a letter with gaps shows the chosen word in each gap
  const gaps = gapItems ? Object.fromEntries(gapItems.map((it) => [String(it.n), it])) : {};
  const body = doc.body.split(/(\(\d{2}\))/).map((part, i) => {
    const m = part.match(/^\((\d{2})\)$/);
    if (!m || !gaps[m[1]]) return <Fragment key={i}>{part}</Fragment>;
    const chosen = answers[gaps[m[1]].n];
    return (
      <span key={i} style={{ padding: "0 4px", borderRadius: 4, background: "rgba(224,131,59,.15)", color: ACCENT, fontWeight: 700 }}>
        ({m[1]}) {chosen ? gaps[m[1]].options[chosen] : "____"}
      </span>
    );
  });
  return (
    <div style={{ ...card, background: "#0e1419" }}>
      {doc.head && <div style={{ whiteSpace: "pre-line", fontWeight: 700, color: "#f2f5f8", marginBottom: 8, fontSize: 13 }}>{doc.head}</div>}
      <div style={{ whiteSpace: "pre-line", fontSize: 14, lineHeight: 1.6, color: "#e6ecf1" }}>{body}</div>
    </div>
  );
}

function Item({ teil, item, value, onPick, reveal }) {
  const choices = choicesFor(teil, item);
  const isMatch = item.type === "match";
  const isGap = /^Lücke/.test(item.q);
  const hideQ = isMatch && teil.sentences; // Hören Teil 4: "Aussage 18" is enough
  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid #1f2a33" }}>
      <div style={{ fontSize: 14, color: "#f2f5f8", marginBottom: 6, lineHeight: 1.45 }}>
        <b style={{ color: ACCENT }}>{item.n}</b> {hideQ ? "" : isGap ? "" : item.q}{item.type === "rf" ? " – richtig oder falsch?" : ""}
      </div>
      <div role="group" aria-label={`Aufgabe ${item.n}`} style={{ display: "flex", flexWrap: "wrap", gap: 6, flexDirection: item.type === "mc" ? "column" : "row" }}>
        {choices.map((c) => {
          const picked = value === c.key;
          const state = !reveal ? null : c.key === item.answer ? "right" : picked ? "wrong" : null;
          const label = item.type === "mc" ? `${c.key}  ${c.label}` : isMatch ? (c.key === "x" ? "X" : c.key) : c.label;
          return (
            <button key={c.key} type="button" aria-pressed={picked} aria-label={`${item.n}: ${c.key === "x" ? "X" : c.key} ${isMatch ? "" : c.label}`.trim()} disabled={reveal} onClick={() => onPick(item.n, c.key)} style={{ ...choiceBtn(state, picked), minWidth: isMatch ? 40 : undefined, textAlign: isMatch ? "center" : "left" }}>
              {state === "right" ? "✓ " : state === "wrong" ? "✗ " : ""}{label}
            </button>
          );
        })}
      </div>
      {reveal && (
        <div style={{ marginTop: 6, fontSize: 12, color: value === item.answer ? GREEN : RED, lineHeight: 1.45 }}>
          {value === item.answer ? "✓ Richtig. " : value ? "✗ Falsch. " : "– Keine Antwort. "}
          <span style={{ color: "#cdd8e2" }}>{item.why}</span>
        </div>
      )}
    </div>
  );
}

// One Teil with its texts and items. once: Hören audio may be played once (simulation).
function TeilBlock({ part, teil, answers, onPick, reveal, once, played, onPlayed }) {
  const items = itemsOf(teil);
  const gapItems = part === "lesen" && teil.teil === 5 ? items : null;
  return (
    <div style={card}>
      <h3 style={h3}>{PARTS[part]} · Teil {teil.teil} <span style={{ color: "#7d8d9c", fontWeight: 600, fontSize: 12 }}>· Aufgaben {range(items)}</span></h3>
      <p style={instr}>{teil.instruction}</p>
      {teil.topic && <div style={{ fontSize: 14, fontWeight: 700, color: "#f2f5f8", marginBottom: 6 }}>Thema: {teil.topic}</div>}
      {teil.sentences && (
        <div style={{ margin: "0 0 10px", fontSize: 13, color: "#cdd8e2", lineHeight: 1.5 }}>
          {Object.entries(teil.sentences).map(([k, v]) => <div key={k}><b style={{ color: ACCENT }}>{k}</b> {v}</div>)}
        </div>
      )}
      {teil.document && <Document doc={teil.document} answers={answers} gapItems={gapItems} />}
      {teil.ads && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, marginBottom: 10 }}>
          {teil.ads.map((ad) => (
            <div key={ad.id} style={{ padding: 10, borderRadius: 10, background: "#0e1419", border: "1px solid #2c3a47", fontSize: 12, lineHeight: 1.45, color: "#cdd8e2" }}>
              <div style={{ fontWeight: 800, color: "#f2f5f8", marginBottom: 4 }}><span style={{ color: ACCENT }}>{ad.id}</span> {ad.title}</div>
              {ad.text}
            </div>
          ))}
        </div>
      )}
      {teil.groups.map((g, gi) => (
        <div key={gi} style={{ marginTop: gi ? 10 : 0 }}>
          {g.document && <Document doc={g.document} answers={answers} />}
          {g.audio && (
            <>
              {teil.groups.length > 1 && part === "hoeren" && (
                <div style={{ fontSize: 12, fontWeight: 700, color: "#8fb8d8" }}>
                  {teil.sentences ? `Aussage ${g.items[0].n}` : g.items.length > 1 ? `Gespräch zu ${g.items.map((i) => i.n).join(" und ")}` : `Ansage zu Aufgabe ${g.items[0].n}`}
                </div>
              )}
              <AudioButton lines={g.audio} once={once} played={played && played.has(`${teil.teil}:${gi}`)} onPlayed={() => onPlayed && onPlayed(`${teil.teil}:${gi}`)} />
            </>
          )}
          {g.items.map((it) => <Item key={it.n} teil={teil} item={it} value={answers[it.n]} onPick={onPick} reveal={reveal} />)}
          {reveal && g.audio && (
            <details style={{ marginTop: 6 }}>
              <summary style={{ cursor: "pointer", fontSize: 12, color: "#8fb8d8" }}>Hörtext lesen</summary>
              <Transcript lines={g.audio} />
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- practice one Teil ----

function TeilPractice({ set, part, teilIndex, onDone, toTop }) {
  const teil = set[part][teilIndex];
  const items = itemsOf(teil);
  const [answers, setAnswers] = useState({});
  const [reveal, setReveal] = useState(false);
  const pick = (n, key) => setAnswers((a) => ({ ...a, [n]: key }));
  const result = scoreItems(items, answers);
  const check = () => {
    setReveal(true);
    onDone({ mode: "teil", label: `${PARTS[part]} Teil ${teil.teil}`, right: result.right, total: result.total });
  };
  return (
    <div>
      <TeilBlock part={part} teil={teil} answers={answers} onPick={pick} reveal={reveal} />
      {reveal ? (
        <div role="status" style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: result.right === result.total ? GREEN : "#f2f5f8" }}>{result.right} / {result.total} richtig</div>
          <button type="button" onClick={() => { setAnswers({}); setReveal(false); toTop(); }} style={{ ...smallBtn, marginTop: 8 }}>↻ Nochmal</button>
        </div>
      ) : (
        <button type="button" onClick={check} style={{ ...bigBtn(true), textAlign: "center", fontWeight: 800 }}>
          ✓ Auswerten ({Object.keys(answers).length}/{items.length} beantwortet)
        </button>
      )}
    </div>
  );
}

// ---- simulation ----

function Simulation({ set, parts, onFinish, toTop }) {
  const [step, setStep] = useState(0); // index into parts; parts.length = finished
  const [answers, setAnswers] = useState({});
  const [played, setPlayed] = useState(() => new Set());
  const [left, setLeft] = useState(set.times[parts[0]] * 60);
  const [paused, setPaused] = useState(false); // ⏸: the clock stops and any text being read pauses
  const finishedRef = useRef(false);
  const part = parts[step];
  const pick = (n, key) => setAnswers((a) => ({ ...a, [n]: key }));

  const finish = (finalAnswers) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopSpeaking();
    const byPart = Object.fromEntries(parts.map((p) => [p, scoreItems(itemsOfPart(set, p), finalAnswers)]));
    const right = parts.reduce((s, p) => s + byPart[p].right, 0);
    const total = parts.reduce((s, p) => s + byPart[p].total, 0);
    onFinish({ mode: `sim-${parts.join("+")}`, label: parts.map((p) => PARTS[p]).join(" + "), right, total, byPart });
    setStep(parts.length);
  };
  const next = () => {
    stopSpeaking();
    if (step + 1 >= parts.length) { finish(answers); return; }
    setStep(step + 1);
    setLeft(set.times[parts[step + 1]] * 60);
    toTop();
  };

  // the clock; at 0 the part ends on its own
  useEffect(() => {
    if (step >= parts.length || paused) return undefined;
    const end = Date.now() + left * 1000;
    const t = setInterval(() => {
      const s = (end - Date.now()) / 1000;
      setLeft(s);
      if (s <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [step, paused]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (step < parts.length && left <= 0) next(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  if (step >= parts.length) {
    return <SimResult set={set} parts={parts} answers={answers} />;
  }
  const items = itemsOfPart(set, part);
  const answered = items.filter((it) => answers[it.n]).length;
  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 10, borderRadius: 12, background: "#1a232b", border: `1px solid ${left < 300 ? RED : "#2c3a47"}` }}>
        <span style={{ fontWeight: 800, color: "#f2f5f8" }}>{PARTS[part]} · {answered}/{items.length}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span aria-live="off" style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: left < 300 ? RED : ACCENT }}>⏱ {formatClock(left)}</span>
          <button type="button" aria-label={paused ? "Weiter" : "Pause"} onClick={() => { if (!paused) pauseSpeaking(); setPaused(!paused); }} style={{ ...smallBtn, padding: "4px 10px" }}>{paused ? "▶" : "⏸"}</button>
        </span>
      </div>
      {paused && (
        <div role="status" style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#f2f5f8" }}>⏸ Pause</div>
          <p style={{ ...instr, margin: "6px 0 10px" }}>Die Zeit steht. Ein Hörtext, der gerade lief, ist auch pausiert: Mit „▶ Weiter“ beim Text geht er an derselben Stelle weiter.</p>
          <button type="button" onClick={() => setPaused(false)} style={{ ...bigBtn(true), textAlign: "center", fontWeight: 800, marginBottom: 0 }}>▶ Weiter</button>
        </div>
      )}
      {/* hidden, not removed, while paused: a paused Hörtext keeps its place */}
      <div style={{ display: paused ? "none" : "block" }}>
        {part === "hoeren" && <p style={instr}>Wie in der Prüfung: Jeder Hörtext läuft nur einmal. Lesen Sie zuerst die Aufgaben.</p>}
        {set[part].map((teil) => (
          <TeilBlock key={teil.teil} part={part} teil={teil} answers={answers} onPick={pick} reveal={false} once={part === "hoeren"} played={played} onPlayed={(k) => setPlayed((p) => new Set(p).add(k))} />
        ))}
        <button type="button" onClick={next} style={{ ...bigBtn(true), textAlign: "center", fontWeight: 800 }}>
          {step + 1 < parts.length ? `Weiter zu ${PARTS[parts[step + 1]]} →` : "✓ Abgeben und auswerten"}
        </button>
      </div>
    </div>
  );
}

function SimResult({ set, parts, answers }) {
  const byPart = Object.fromEntries(parts.map((p) => [p, scoreItems(itemsOfPart(set, p), answers)]));
  const right = parts.reduce((s, p) => s + byPart[p].right, 0);
  const total = parts.reduce((s, p) => s + byPart[p].total, 0);
  const full = parts.length === 2;
  const level = levelFor(right);
  return (
    <div>
      <div role="status" style={{ ...card, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#9ab0c2" }}>{parts.map((p) => PARTS[p]).join(" + ")}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#f2f5f8", margin: "4px 0" }}>{right} / {total}</div>
        {full ? (
          <div style={{ fontSize: 16, fontWeight: 800, color: LEVEL_COLOR[level] }}>
            {level === "unter A2" ? `Unter A2 – ab ${A2_FROM} Punkten A2` : `Stufe ${level}`}{level === "A2" ? ` · für B1 fehlen ${B1_FROM - right}` : ""}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#9ab0c2" }}>A2 / B1 gibt es nur für Hören + Lesen zusammen ({A2_FROM} bzw. {B1_FROM} von 45).</div>
        )}
        {full && (
          <div style={{ marginTop: 6, fontSize: 13, color: "#cdd8e2" }}>Hören {byPart.hoeren.right}/{byPart.hoeren.total} · Lesen {byPart.lesen.right}/{byPart.lesen.total}</div>
        )}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", margin: "4px 0 8px" }}>AUSWERTUNG</div>
      {parts.flatMap((p) => set[p].map((teil) => (
        <TeilBlock key={`${p}${teil.teil}`} part={p} teil={teil} answers={answers} onPick={() => {}} reveal />
      )))}
    </div>
  );
}

// ---- home ----

function Home({ set, writing, results, setView }) {
  const sectionLabel = { fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", margin: "12px 0 8px" };
  return (
    <div>
      <div style={card}>
        <h3 style={h3}>Deutsch-Test für Zuwanderer (DTZ) A2–B1</h3>
        <p style={{ ...instr, margin: 0 }}>
          Hören (25 Min.) und Lesen (45 Min.) zählen zusammen: ab <b>{A2_FROM}</b> von 45 Punkten <b>A2</b>, ab <b>{B1_FROM}</b> <b>B1</b>. Schreiben (30 Min.): ab 7 von 20 A2, ab 15 B1. Sprechen (ca. 16 Min.): ab 35 von 100 A2, ab 75 B1.
          Gesamtergebnis: <b>Sprechen</b> plus <b>Hören/Lesen oder Schreiben</b> auf derselben Stufe. Alle Aufgaben sind neu geschrieben, im Format der echten Prüfung.
        </p>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", margin: "4px 0 8px" }}>PRÜFUNG SIMULIEREN · {set.title}</div>
      <button type="button" onClick={() => setView({ kind: "sim", parts: ["hoeren", "lesen"] })} style={bigBtn(true)}>
        <b>📝 Hören + Lesen</b> <span style={{ fontSize: 12 }}>· 70 Min. · Ergebnis A2/B1</span>
      </button>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => setView({ kind: "sim", parts: ["hoeren"] })} style={{ ...bigBtn(false), flex: 1 }}>🎧 Nur Hören <span style={{ fontSize: 12, color: "#9ab0c2" }}>· 25 Min.</span></button>
        <button type="button" onClick={() => setView({ kind: "sim", parts: ["lesen"] })} style={{ ...bigBtn(false), flex: 1 }}>📖 Nur Lesen <span style={{ fontSize: 12, color: "#9ab0c2" }}>· 45 Min.</span></button>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", margin: "12px 0 8px" }}>TEIL ÜBEN · ohne Zeit, mit Erklärungen</div>
      {Object.keys(PARTS).map((part) => (
        <div key={part} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 6, marginBottom: 8 }}>
          {set[part].map((teil, i) => (
            <button key={teil.teil} type="button" onClick={() => setView({ kind: "teil", part, teil: i })} style={{ ...smallBtn, padding: "9px 6px", textAlign: "center" }}>
              {part === "hoeren" ? "🎧" : "📖"} {PARTS[part]} {teil.teil}
              <div style={{ fontSize: 11, color: "#7d8d9c", fontWeight: 600 }}>{range(itemsOf(teil))}</div>
            </button>
          ))}
        </div>
      ))}

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", margin: "12px 0 8px" }}>✍️ SCHREIBEN · {WRITING_MINUTES} Min. · Aufgabe A oder B</div>
      {writing.map((pair, i) => (
        <button key={pair.key} type="button" onClick={() => setView({ kind: "schreiben", pair: i })} style={{ ...bigBtn(false), padding: "10px 14px" }}>
          <b>{pair.title}</b> <span style={{ fontSize: 12, color: "#9ab0c2" }}>· A: {pair.a.title} · B: {pair.b.title}</span>
        </button>
      ))}

      <div style={sectionLabel}>🗣 SPRECHEN · ca. {SPEAKING_MINUTES} Min. · das Handy spricht Prüfer und Partnerin</div>
      <button type="button" onClick={() => setView({ kind: "sprechen", teil: "sim" })} style={bigBtn(true)}>
        <b>🎙 Mündliche Prüfung simulieren</b> <span style={{ fontSize: 12 }}>· Teil 1–3 · Ergebnis A2/B1</span>
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
        {[[1, "Über sich sprechen"], [2, "Foto + Erfahrungen"], [3, "Gemeinsam planen"]].map(([teil, text]) => (
          <button key={teil} type="button" onClick={() => setView({ kind: "sprechen", teil })} style={{ ...smallBtn, padding: "9px 4px", textAlign: "center" }}>
            🗣 Teil {teil}
            <div style={{ fontSize: 11, color: "#7d8d9c", fontWeight: 600 }}>{text}</div>
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", margin: "12px 0 8px" }}>LETZTE ERGEBNISSE</div>
          <div style={card}>
            {results.slice(0, 8).map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, padding: "4px 0", color: "#cdd8e2" }}>
                <span>{new Date(r.at).toLocaleDateString("de-DE")} · {r.label}</span>
                {(() => {
                  const level = r.total === 45 ? levelFor(r.right) : r.mode === "schreiben" ? writingLevel(r.right) : r.mode === "sprechen" ? speakingLevel(r.right) : null;
                  return <b style={{ color: level ? LEVEL_COLOR[level] : "#f2f5f8", whiteSpace: "nowrap" }}>{r.right}/{r.total}{level ? ` · ${level}` : ""}</b>;
                })()}
              </div>
            ))}
          </div>
        </>
      )}

      <p style={{ ...instr, marginTop: 12 }}>
        Echte Übungssätze mit Hörtexten und Lösungen gibt es kostenlos bei g.a.s.t.:{" "}
        <a href="https://www.gast.de/fileadmin/gast.de/GAST/5_DTZ/PDF/gast_DTZ_UEbungssatz_1.pdf" target="_blank" rel="noopener noreferrer" style={{ color: "#8fb8d8" }}>Übungssatz 1</a> ·{" "}
        <a href="https://www.gast.de/fileadmin/gast.de/GAST/5_DTZ/PDF/gast_DTZ_UEbungssatz_2.pdf" target="_blank" rel="noopener noreferrer" style={{ color: "#8fb8d8" }}>Übungssatz 2</a>.
        Dort gibt es auch Bilder für Sprechen Teil 2.
      </p>
    </div>
  );
}

function DtzTrainer({ sets, writing, speaking, view, setView, results, onResult, onClose }) {
  const set = sets[0];
  const root = useRef(null);
  const toTop = () => { if (root.current) root.current.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const title = view.kind === "home" ? "🎓 DTZ-Training"
    : view.kind === "teil" ? `🎓 ${PARTS[view.part]} · Teil ${set[view.part][view.teil].teil}`
    : view.kind === "schreiben" ? `✍️ Schreiben · ${writing[view.pair].title}`
    : view.kind === "sprechen" ? `🗣 Sprechen · ${view.teil === "sim" ? "Prüfung" : `Teil ${view.teil}`}`
    : `🎓 Simulation · ${view.parts.map((p) => PARTS[p]).join(" + ")}`;
  return (
    <div ref={root} style={{ scrollMarginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: "#f2f5f8" }}>{title}</h2>
        {view.kind === "home" ? (
          <button type="button" onClick={onClose} style={smallBtn}>✕ Schließen</button>
        ) : (
          <button type="button" onClick={() => { stopSpeaking(); setView({ kind: "home" }); }} style={{ ...smallBtn, background: ACCENT, color: "#0e1419", border: "none" }}>← Übersicht</button>
        )}
      </div>
      {view.kind === "home" && <Home set={set} writing={writing} results={results} setView={setView} />}
      {view.kind === "schreiben" && <WritingTrainer key={view.pair} pair={writing[view.pair]} onResult={onResult} toTop={toTop} />}
      {view.kind === "sprechen" && <SpeakingTrainer key={`${view.teil}-${view.item}`} content={speaking} view={view} setView={setView} onResult={onResult} toTop={toTop} />}
      {view.kind === "teil" && <TeilPractice key={`${view.part}${view.teil}`} set={set} part={view.part} teilIndex={view.teil} onDone={onResult} toTop={toTop} />}
      {view.kind === "sim" && (
        <Simulation key={view.parts.join("+")} set={set} parts={view.parts} onFinish={(r) => { onResult(r); setView({ ...view, done: true }); }} toTop={toTop} />
      )}
    </div>
  );
}

const lineShape = PropTypes.shape({ who: PropTypes.string, name: PropTypes.string, text: PropTypes.string });
AudioButton.propTypes = { lines: PropTypes.arrayOf(lineShape).isRequired, once: PropTypes.bool, played: PropTypes.bool, onPlayed: PropTypes.func };
Transcript.propTypes = { lines: PropTypes.arrayOf(lineShape).isRequired };
Document.propTypes = { doc: PropTypes.object.isRequired, answers: PropTypes.object, gapItems: PropTypes.array };
Item.propTypes = { teil: PropTypes.object.isRequired, item: PropTypes.object.isRequired, value: PropTypes.string, onPick: PropTypes.func.isRequired, reveal: PropTypes.bool };
TeilBlock.propTypes = {
  part: PropTypes.string.isRequired, teil: PropTypes.object.isRequired, answers: PropTypes.object.isRequired, onPick: PropTypes.func.isRequired,
  reveal: PropTypes.bool, once: PropTypes.bool, played: PropTypes.instanceOf(Set), onPlayed: PropTypes.func,
};
TeilPractice.propTypes = { set: PropTypes.object.isRequired, part: PropTypes.string.isRequired, teilIndex: PropTypes.number.isRequired, onDone: PropTypes.func.isRequired, toTop: PropTypes.func.isRequired };
Simulation.propTypes = { set: PropTypes.object.isRequired, parts: PropTypes.arrayOf(PropTypes.string).isRequired, onFinish: PropTypes.func.isRequired, toTop: PropTypes.func.isRequired };
SimResult.propTypes = { set: PropTypes.object.isRequired, parts: PropTypes.arrayOf(PropTypes.string).isRequired, answers: PropTypes.object.isRequired };
Home.propTypes = { set: PropTypes.object.isRequired, writing: PropTypes.array.isRequired, results: PropTypes.array.isRequired, setView: PropTypes.func.isRequired };
DtzTrainer.propTypes = {
  sets: PropTypes.array.isRequired,
  writing: PropTypes.array.isRequired,
  speaking: PropTypes.object.isRequired,
  view: PropTypes.shape({ kind: PropTypes.string.isRequired }).isRequired,
  setView: PropTypes.func.isRequired,
  results: PropTypes.array.isRequired,
  onResult: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DtzTrainer;
