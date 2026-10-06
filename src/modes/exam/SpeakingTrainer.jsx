import { useState, useEffect, useRef, useContext, useMemo } from "react";
import PropTypes from "prop-types";
import { STORAGE_KEYS } from "../../constants";
import { AiCtx } from "../../context/AiCtx";
import { aiSiteLinks } from "../../engine/lookup";
import { createPlayer, sentencesOf, stopSpeaking } from "../../engine/speech";
import { formatClock } from "./dtz";
import {
  SPEAKING_MINUTES, SPEAKING_A2_FROM, SPEAKING_B1_FROM, SPEAK_CRITERIA, SPEAK_STEPS, TEIL_TITLES,
  speakingPoints, speakingLevel, teil1Turns, teil2Turns, teil3Turns, simulationTurns, speakingReviewPrompt,
} from "./speaking";
import { useRecorder, useSpeechToText, recorderSupported, speechToTextSupported } from "./speakingMedia";

// 🗣 DTZ Sprechen (speaking.js). The phone's voice is the examiner (Teil 1,
// 2) and the partner (Teil 3); the learner answers aloud, turn by turn.
// - Üben: one Teil (2 and 3: choose a topic/task), with 💡 example answers
//   and 💬 useful phrases.
// - Simulation (~16 min): 1A + 2 questions, a photo + 3 questions, a
//   planning talk; no examples; at the end the recordings, the transcripts
//   and a self-rating on the 9 official criteria (→ x/100, A2 35 / B1 75).
// 🎙 Recordings stay in memory on the phone. 📝 Mitschrift (off by default)
// uses the browser's speech recognition, i.e. Google; with a transcript the
// answers can be rated by AI (in the app or on the websites).

const ACCENT = "#e0833b";
const GREEN = "#5fa85f";
const RED = "#e07b6f";
const LEVEL_COLOR = { B1: GREEN, A2: ACCENT, "unter A2": RED };
const card = { padding: 14, borderRadius: 12, border: "1px solid #2c3a47", background: "#161d24", marginBottom: 12 };
const instr = { margin: "0 0 10px", fontSize: 13, color: "#9ab0c2", lineHeight: 1.5 };
const label = { fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", margin: "4px 0 8px", textTransform: "uppercase" };
const bigBtn = (primary) => ({
  display: "block", width: "100%", padding: "12px 14px", marginBottom: 8, borderRadius: 12, cursor: "pointer", font: "inherit", fontWeight: 800, textAlign: "center",
  border: primary ? "none" : "1px solid #2c3a47", background: primary ? ACCENT : "#1a232b", color: primary ? "#0e1419" : "#f2f5f8",
});
const smallBtn = { padding: "7px 12px", borderRadius: 10, border: "1px solid #2c3a47", background: "#1a232b", color: "#cdd8e2", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const chip = { padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none", border: "1px solid #3a5670", color: "#8fb8d8" };

const readStt = () => { try { return localStorage.getItem(STORAGE_KEYS.DTZ_STT) === "on"; } catch { return false; } };
const writeStt = (on) => { try { localStorage.setItem(STORAGE_KEYS.DTZ_STT, on ? "on" : "off"); } catch { /* storage off */ } };

// the examiner speaks with the male voice, the partner with the second female one
let voice = null;
const sayAloud = (turn, onErr) => {
  stopSpeaking();
  voice = createPlayer(sentencesOf(turn.say).map((text) => ({ text, who: turn.who === "partner" ? "f2" : "m" })), { onErr });
  voice.play();
};

// ---- pieces ----

function SttToggle({ on, setOn }) {
  if (!speechToTextSupported()) return null;
  return (
    <div style={{ ...card, padding: 12 }}>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, fontWeight: 700, color: "#f2f5f8", cursor: "pointer" }}>
        <input type="checkbox" checked={on} onChange={(e) => { setOn(e.target.checked); writeStt(e.target.checked); }} />
        📝 Mitschrift (Google-Spracherkennung)
      </label>
      <div style={{ fontSize: 12, color: "#9ab0c2", lineHeight: 1.5, marginTop: 6 }}>
        {on
          ? "An: Beim Tippen auf „📝 Sprechen → Text“ geht deine Stimme zur Erkennung an Google (über Chrome) – nicht an diese App. Braucht Internet. Keine Aussprache-Note: Die Erkennung rät oft, was gemeint ist. Mit dem Text kann die KI deine Antwort bewerten."
          : "Aus: nichts geht an Google. 🎙 Aufnahmen bleiben immer nur auf deinem Handy."}
      </div>
    </div>
  );
}

function Lines({ lines, en }) {
  return lines.map((l) => (
    <div key={l.de} style={{ marginBottom: 4 }}>
      <span style={{ color: "#f2f5f8" }}>{l.de}</span>
      {en && <div style={{ fontSize: 12, color: "#9ab0c2", fontStyle: "italic" }}>{l.en}</div>}
    </div>
  ));
}

function Info({ info, en }) {
  if (!info) return null;
  if (info.kind === "keywords") {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
        {info.items.map((k) => <span key={k} style={{ padding: "5px 10px", borderRadius: 8, background: "#0e1419", border: "1px solid #3a5670", color: "#f2f5f8", fontSize: 14, fontWeight: 700 }}>{k}</span>)}
      </div>
    );
  }
  const box = { margin: "8px 0", padding: 10, borderRadius: 10, background: "#0e1419", border: "1px dashed #3a5670", fontSize: 14, color: "#f2f5f8", lineHeight: 1.5 };
  if (info.kind === "photo") {
    return (
      <div style={box}>
        <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 4 }}>📷 Das Foto (stell es dir vor): {info.title}</div>
        {info.de}
        {en && <div style={{ fontSize: 12, color: "#9ab0c2", fontStyle: "italic", marginTop: 4 }}>{info.en}</div>}
      </div>
    );
  }
  return (
    <div style={box}>
      <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 4 }}>📋 {info.title}</div>
      {info.de}
      {en && <div style={{ fontSize: 12, color: "#9ab0c2", fontStyle: "italic", marginTop: 4 }}>{info.en}</div>}
      <div style={{ fontSize: 13, color: "#9ab0c2", margin: "6px 0 2px" }}>Planen Sie gemeinsam. Notizen:</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {info.notes.map((n) => <span key={n} style={{ padding: "3px 8px", borderRadius: 8, border: "1px solid #3a5670", fontSize: 13 }}>{n}</span>)}
      </div>
    </div>
  );
}

// 🎙 record + optional 📝 transcript for one turn
function Answer({ id, recording, onRecording, transcript, onTranscript, stt }) {
  const mic = useRecorder();
  const rec = useSpeechToText();
  const base = useRef("");
  const canRecord = recorderSupported();
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {canRecord && (mic.recording ? (
          <button type="button" onClick={mic.stop} style={{ ...smallBtn, borderColor: RED, color: RED }}>■ Stopp · {formatClock(mic.seconds)}</button>
        ) : (
          <button type="button" disabled={rec.listening} onClick={() => { stopSpeaking(); mic.start((url) => onRecording(id, url)); }} style={{ ...smallBtn, background: ACCENT, color: "#0e1419", border: "none" }}>🎙 {recording ? "Neu aufnehmen" : "Aufnehmen"}</button>
        ))}
        {stt && (rec.listening ? (
          <button type="button" onClick={rec.stop} style={{ ...smallBtn, borderColor: RED, color: RED }}>■ Mitschrift stoppen</button>
        ) : (
          <button type="button" disabled={mic.recording} onClick={() => { stopSpeaking(); base.current = transcript ? `${transcript} ` : ""; rec.start((t) => onTranscript(id, base.current + t)); }} style={smallBtn}>📝 Sprechen → Text</button>
        ))}
      </div>
      {mic.recording && <div style={{ fontSize: 12, color: RED, marginTop: 6 }}>● Aufnahme läuft – sprich jetzt.</div>}
      {rec.listening && <div style={{ fontSize: 12, color: RED, marginTop: 6 }}>● Google hört zu – sprich jetzt.</div>}
      {(mic.error || rec.error) && <div role="alert" style={{ fontSize: 12, color: RED, marginTop: 6 }}>{mic.error || rec.error}</div>}
      {!canRecord && !stt && <div style={{ fontSize: 12, color: "#7d8d9c", marginTop: 6 }}>Aufnehmen geht in diesem Browser nicht – sprich trotzdem laut.</div>}
      {recording && !mic.recording && <audio src={recording} controls style={{ width: "100%", marginTop: 8 }} />}
      {stt && (transcript || rec.listening) && (
        <textarea
          value={transcript || ""}
          onChange={(e) => onTranscript(id, e.target.value)}
          aria-label="Mitschrift"
          rows={3}
          style={{ width: "100%", boxSizing: "border-box", marginTop: 8, padding: 8, borderRadius: 8, border: "1px solid #2c3a47", background: "#0e1419", color: "#f2f5f8", fontSize: 14, fontFamily: "inherit", resize: "vertical" }}
        />
      )}
    </div>
  );
}

function RateLinks({ prompt, disabled }) {
  const ai = useContext(AiCtx);
  const [copied, setCopied] = useState(null);
  const copy = (l) => { try { navigator.clipboard.writeText(prompt).then(() => setCopied(l), () => {}); } catch { /* no clipboard */ } };
  if (disabled) return <div style={{ fontSize: 12, color: "#7d8d9c" }}>Für eine KI-Bewertung brauchst du eine 📝 Mitschrift.</div>;
  return (
    <div>
      {ai.enabled && ai.ask && (
        <button type="button" onClick={() => ai.ask({ kind: "speaking", title: "Sprechen", question: prompt, context: prompt })} style={{ ...bigBtn(true), marginBottom: 8 }}>✨ KI bewerten lassen (in der App)</button>
      )}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#9ab0c2" }}>🤖 Bewerten:</span>
        {aiSiteLinks(prompt).map((l) => <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => copy(l)} style={chip}>{l.label} ↗</a>)}
      </div>
      {copied && <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 6 }}>📋 Anfrage kopiert{copied.prefill ? ` – falls ${copied.label} sie nicht zeigt: einfügen.` : ` – in ${copied.label} einfügen.`}</div>}
    </div>
  );
}

function SelfRating({ onSave, saved }) {
  const [steps, setSteps] = useState({});
  const done = SPEAK_CRITERIA.every((c) => steps[c.key] !== undefined);
  const total = speakingPoints(steps);
  const level = speakingLevel(total);
  return (
    <div>
      <p style={instr}>Hör dir deine Aufnahmen an und wähle ehrlich. Die Punkte zählen wie in der Prüfung (Teil 3 und Korrektheit/Wortschatz zählen mehr).</p>
      {SPEAK_CRITERIA.map((c) => (
        <div key={c.key} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#f2f5f8" }}>{c.de} <span style={{ fontSize: 12, color: "#7d8d9c", fontWeight: 600 }}>· max. {c.weight * 5}</span></div>
          <div style={{ fontSize: 12, color: "#9ab0c2", lineHeight: 1.5, margin: "2px 0 6px" }}>
            {Object.entries(c.levels).map(([lvl, d]) => <div key={lvl}><b style={{ color: "#cdd8e2" }}>{lvl}:</b> {d}</div>)}
          </div>
          <div role="radiogroup" aria-label={c.de} style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
            {SPEAK_STEPS.map((s) => {
              const on = steps[c.key] === s.step;
              return (
                <button key={s.step} type="button" role="radio" aria-checked={on} onClick={() => setSteps((p) => ({ ...p, [c.key]: s.step }))}
                  style={{ padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${on ? ACCENT : "#2c3a47"}`, background: on ? "rgba(224,131,59,.18)" : "#0e1419", color: on ? ACCENT : "#cdd8e2", lineHeight: 1.2 }}>
                  {s.step * c.weight}<div style={{ fontSize: 10, color: on ? ACCENT : "#7d8d9c" }}>{s.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div role="status" style={{ ...card, textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#f2f5f8" }}>{total} / 100</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: done ? LEVEL_COLOR[level] : "#7d8d9c" }}>
          {done ? (level === "unter A2" ? `Unter A2 – ab ${SPEAKING_A2_FROM} Punkten A2` : `Stufe ${level}${level === "A2" ? ` · für B1 fehlen ${SPEAKING_B1_FROM - total}` : ""}`) : "Bitte alle Kriterien bewerten."}
        </div>
      </div>
      <button type="button" disabled={!done || saved} onClick={() => onSave(total)} style={{ ...bigBtn(done && !saved), opacity: done ? 1 : 0.6 }}>{saved ? "✓ Gespeichert" : "💾 Ergebnis speichern"}</button>
    </div>
  );
}

// ---- a session: the turns one by one, then the summary ----

function Session({ turns, practice, phrases, onFinish, onAgain, toTop }) {
  const [idx, setIdx] = useState(-1); // -1 = start screen, turns.length = summary
  const [recordings, setRecordings] = useState({});
  const [transcripts, setTranscripts] = useState({});
  const [stt, setStt] = useState(readStt);
  const [showText, setShowText] = useState(practice);
  const [en, setEn] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [audioErr, setAudioErr] = useState(false);
  const [saved, setSaved] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const urls = useRef([]);
  const turn = turns[idx];
  const running = idx >= 0 && idx < turns.length;

  useEffect(() => () => { stopSpeaking(); urls.current.forEach((u) => URL.revokeObjectURL(u)); }, []);
  useEffect(() => {
    if (!running || practice) return undefined;
    const t0 = Date.now() - elapsed * 1000;
    const t = setInterval(() => setElapsed((Date.now() - t0) / 1000), 1000);
    return () => clearInterval(t);
  }, [running, practice]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (i) => {
    setIdx(i); setShowModel(false); toTop();
    if (i >= turns.length) { stopSpeaking(); if (!practice) onFinish?.(); return; }
    sayAloud(turns[i], () => setAudioErr(true));
  };
  const onRecording = (id, url) => {
    urls.current.push(url);
    setRecordings((r) => { if (r[id]) URL.revokeObjectURL(r[id]); return { ...r, [id]: url }; });
  };
  const onTranscript = (id, text) => setTranscripts((t) => ({ ...t, [id]: text }));
  const hasTranscripts = Object.values(transcripts).some((t) => t?.trim());

  if (idx === -1) {
    return (
      <div>
        <p style={instr}>
          {practice
            ? "Das Handy spricht die Fragen (oder die Partnerin). Antworte laut – am besten mit 🎙 Aufnahme, dann kannst du dich anhören. 💡 zeigt eine Beispielantwort."
            : `Wie in der Prüfung (ca. ${SPEAKING_MINUTES} Min.): Teil 1 über dich, Teil 2 ein Foto und deine Erfahrungen, Teil 3 gemeinsam planen. Keine Beispiele – am Ende hörst du deine Aufnahmen und bewertest dich.`}
        </p>
        <SttToggle on={stt} setOn={setStt} />
        <button type="button" onClick={() => go(0)} style={bigBtn(true)}>▶ Start</button>
      </div>
    );
  }

  if (!turn) {
    const answered = turns.filter((t) => recordings[t.id] || transcripts[t.id]?.trim());
    return (
      <div>
        <div style={label}>Deine Antworten</div>
        {answered.length === 0 && <div style={{ ...card, fontSize: 13, color: "#9ab0c2" }}>Keine Aufnahmen – nächstes Mal mit 🎙, dann kannst du dich hier anhören.</div>}
        {answered.map((t) => (
          <div key={t.id} style={card}>
            <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>{TEIL_TITLES[t.teil]}</div>
            <div style={{ fontSize: 13, color: "#9ab0c2", margin: "2px 0 6px" }}>{t.who === "partner" ? "Partnerin" : "Prüfer"}: {t.say}</div>
            {recordings[t.id] && <audio src={recordings[t.id]} controls style={{ width: "100%" }} />}
            {transcripts[t.id]?.trim() && <div style={{ fontSize: 14, color: "#f2f5f8", marginTop: 6 }}>📝 {transcripts[t.id]}</div>}
            {t.model && <details style={{ marginTop: 6 }}><summary style={{ cursor: "pointer", fontSize: 12, color: "#8fb8d8" }}>💡 Beispiel</summary><div style={{ fontSize: 13, marginTop: 4 }}><Lines lines={t.model} en /></div></details>}
          </div>
        ))}
        <div style={label}>Bewerten lassen</div>
        <div style={card}><RateLinks prompt={speakingReviewPrompt(turns, transcripts)} disabled={!hasTranscripts} /></div>
        {!practice && (
          <>
            <div style={label}>Selbst bewerten · {formatClock(elapsed)} gesprochen</div>
            <div style={card}><SelfRating saved={saved} onSave={(total) => { onFinish?.(total); setSaved(true); }} /></div>
          </>
        )}
        <button type="button" onClick={onAgain} style={bigBtn(false)}>🔁 Nochmal mit neuen Fragen</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 10, borderRadius: 12, background: "#1a232b", border: "1px solid #2c3a47" }}>
        <span style={{ fontWeight: 800, color: "#f2f5f8", fontSize: 14 }}>{TEIL_TITLES[turn.teil]}</span>
        <span style={{ fontSize: 12, color: "#9ab0c2", whiteSpace: "nowrap" }}>{idx + 1}/{turns.length}{practice ? "" : ` · ⏱ ${formatClock(elapsed)}`}</span>
      </div>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: turn.who === "partner" ? "#8fb8d8" : ACCENT }}>{turn.who === "partner" ? "🙋 Partnerin sagt:" : "🧑‍🏫 Prüfer sagt:"}</span>
          <span style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => sayAloud(turn, () => setAudioErr(true))} aria-label="Nochmal anhören" style={{ ...smallBtn, padding: "4px 10px" }}>🔊</button>
            <button type="button" onClick={() => setShowText((v) => !v)} style={{ ...smallBtn, padding: "4px 10px", fontSize: 12 }}>{showText ? "Text aus" : "Text"}</button>
          </span>
        </div>
        {showText && <div style={{ fontSize: 16, color: "#f2f5f8", margin: "8px 0 0", lineHeight: 1.5 }}>{turn.say}{en && turn.sayEn && <div style={{ fontSize: 12, color: "#9ab0c2", fontStyle: "italic" }}>{turn.sayEn}</div>}</div>}
        {turn.level && <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 4 }}>Prüfungsfrage Stufe {turn.level}</div>}
        {audioErr && <div style={{ fontSize: 12, color: "#c6925a", marginTop: 6 }}>🔇 Keine deutsche Stimme – lies den Text.</div>}
        <Info info={turn.info} en={en} />
        {turn.record ? (
          <Answer id={turn.id} stt={stt} recording={recordings[turn.id]} onRecording={onRecording} transcript={transcripts[turn.id]} onTranscript={onTranscript} />
        ) : (
          <div style={{ fontSize: 13, color: "#9ab0c2", marginTop: 8 }}>Das Gespräch ist zu Ende. Gut gemacht!</div>
        )}
        {practice && turn.model && (
          <div style={{ marginTop: 10 }}>
            <button type="button" onClick={() => setShowModel((v) => !v)} style={{ ...smallBtn, padding: "5px 10px", fontSize: 12 }}>💡 {showModel ? "Beispiel aus" : "Beispiel"}</button>
            {showModel && <div style={{ marginTop: 8, padding: 10, borderRadius: 10, borderLeft: `3px solid ${GREEN}`, background: "#121a21", fontSize: 14 }}><Lines lines={turn.model} en={en} /></div>}
          </div>
        )}
        {practice && turn.record && transcripts[turn.id]?.trim() && (
          <div style={{ marginTop: 10 }}><RateLinks prompt={speakingReviewPrompt([turn], transcripts)} /></div>
        )}
      </div>
      {practice && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <button type="button" onClick={() => setEn((v) => !v)} style={{ ...smallBtn, fontSize: 12, padding: "4px 10px" }}>{en ? "Englisch aus" : "🇬🇧 Englisch"}</button>
          {phrases && (
            <details style={{ width: "100%" }}>
              <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#f2f5f8", margin: "4px 0" }}>💬 Nützliche Sätze</summary>
              <div style={{ fontSize: 13, marginTop: 6 }}><Lines lines={phrases} en /></div>
            </details>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        {practice && idx > 0 && <button type="button" onClick={() => go(idx - 1)} style={{ ...bigBtn(false), flex: 1 }}>← Zurück</button>}
        <button type="button" onClick={() => go(idx + 1)} style={{ ...bigBtn(true), flex: 2 }}>{idx + 1 < turns.length ? "Weiter →" : practice ? "✓ Fertig" : "✓ Prüfung beenden"}</button>
      </div>
    </div>
  );
}

// ---- entry: which Teil / topic ----

function SpeakingTrainer({ content, view, setView, onResult, toTop }) {
  const [round, setRound] = useState(0); // "Nochmal" draws new questions
  const { teil, item } = view;
  const again = () => { setRound((r) => r + 1); toTop(); };
  const picking = (teil === 2 || teil === 3) && item === undefined;
  // drawn once per round, so re-renders (e.g. the view marked done) keep the questions
  const turns = useMemo(() => {
    if (picking) return [];
    return teil === 1 ? teil1Turns(content, { questions: 4 })
      : teil === 2 ? teil2Turns(content, content.teil2.topics[item])
      : teil === 3 ? teil3Turns(content, content.teil3.tasks[item])
      : simulationTurns(content);
  }, [content, teil, item, round, picking]); // eslint-disable-line react-hooks/exhaustive-deps

  if (teil === 2 && item === undefined) {
    return (
      <div>
        <p style={instr}>Teil 2: Sie bekommen ein Foto. Erzählen Sie, was Sie sehen und was für eine Situation es ist (2A). Dann fragt der Prüfer nach Ihren Erfahrungen (2B, Fragen für A2 und B1). Wählen Sie ein Thema:</p>
        {content.teil2.topics.map((t, i) => (
          <button key={t.key} type="button" onClick={() => setView({ ...view, item: i })} style={{ ...bigBtn(false), textAlign: "left", fontWeight: 700 }}>📷 {t.title}</button>
        ))}
      </div>
    );
  }
  if (teil === 3 && item === undefined) {
    return (
      <div>
        <p style={instr}>Teil 3: Sie planen mit Ihrer Partnerin etwas zusammen. Das Handy spielt die Partnerin. Machen Sie Vorschläge, reagieren Sie und einigen Sie sich. Wählen Sie eine Aufgabe:</p>
        {content.teil3.tasks.map((t, i) => (
          <button key={t.key} type="button" onClick={() => setView({ ...view, item: i })} style={{ ...bigBtn(false), textAlign: "left", fontWeight: 700 }}>📋 {t.title}</button>
        ))}
      </div>
    );
  }

  const practice = teil !== "sim";
  const phrases = teil === 1 ? content.teil1.phrases : teil === 2 ? content.teil2.phrases : teil === 3 ? content.teil3.phrases : null;
  return (
    <Session
      key={`${teil}-${item}-${round}`}
      turns={turns}
      practice={practice}
      phrases={phrases}
      toTop={toTop}
      onAgain={again}
      onFinish={(total) => {
        if (total === undefined) { setView({ ...view, done: true }); return; }
        onResult({ mode: "sprechen", label: "Sprechen · Simulation", right: total, total: 100 });
      }}
    />
  );
}

const turnShape = PropTypes.shape({ id: PropTypes.string.isRequired, teil: PropTypes.string.isRequired, say: PropTypes.string.isRequired });
SttToggle.propTypes = { on: PropTypes.bool.isRequired, setOn: PropTypes.func.isRequired };
Lines.propTypes = { lines: PropTypes.arrayOf(PropTypes.shape({ de: PropTypes.string, en: PropTypes.string })).isRequired, en: PropTypes.bool };
Info.propTypes = { info: PropTypes.object, en: PropTypes.bool };
Answer.propTypes = {
  id: PropTypes.string.isRequired, recording: PropTypes.string, onRecording: PropTypes.func.isRequired,
  transcript: PropTypes.string, onTranscript: PropTypes.func.isRequired, stt: PropTypes.bool,
};
RateLinks.propTypes = { prompt: PropTypes.string.isRequired, disabled: PropTypes.bool };
SelfRating.propTypes = { onSave: PropTypes.func.isRequired, saved: PropTypes.bool };
Session.propTypes = {
  turns: PropTypes.arrayOf(turnShape).isRequired, practice: PropTypes.bool, phrases: PropTypes.array,
  onFinish: PropTypes.func, onAgain: PropTypes.func.isRequired, toTop: PropTypes.func.isRequired,
};
SpeakingTrainer.propTypes = {
  content: PropTypes.object.isRequired,
  view: PropTypes.shape({ teil: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired, item: PropTypes.number }).isRequired,
  setView: PropTypes.func.isRequired,
  onResult: PropTypes.func.isRequired,
  toTop: PropTypes.func.isRequired,
};

export default SpeakingTrainer;
