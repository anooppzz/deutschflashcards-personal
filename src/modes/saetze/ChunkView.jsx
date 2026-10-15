import { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { AudioControls } from "../../components";
import { DECK_META } from "../../data";
import {
  linesOf, VOICE_OF,
  saveRecording, loadRecording, deleteRecording, recordingIds, recordingsPersistent,
} from "../../engine";
import { speak, stopSpeaking } from "../../engine/speech";
import { useRecorder, recorderSupported } from "../exam/speakingMedia";

// 🧱 Sätze: ready-made sentences and dialogues per chapter (engine/chunks.js)
// to learn as whole chunks: 🔊 listen, say along, 🙈 say it from the English,
// 🎙 record, then ▶ compare the model with your own recording. Recordings stay
// on this device (engine/recordings.js). openKey/onOpen live in App so the back
// gesture can close a set.

const ACCENT = "#e0833b";
const GREEN = "#5fa85f";

const rowStyle = {
  display: "flex", width: "100%", boxSizing: "border-box", alignItems: "center", gap: 10, textAlign: "left",
  padding: "11px 12px", marginBottom: 6, borderRadius: 12, border: "1px solid #2c3a47", background: "#1a232b",
  color: "#f2f5f8", cursor: "pointer", font: "inherit",
};
const chip = (on) => ({
  minHeight: 40, padding: "7px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
  border: `1px solid ${on ? ACCENT : "#2c3a47"}`, background: on ? "rgba(224,131,59,.12)" : "#1a232b", color: on ? ACCENT : "#9ab0c2",
});
const small = (tone) => ({
  minHeight: 40, minWidth: 44, padding: "6px 10px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
  border: `1px solid ${tone === "rec" ? "#e07b6f" : tone === "on" ? ACCENT : "#2c3a47"}`,
  background: tone === "rec" ? "rgba(224,123,111,.18)" : tone === "on" ? "rgba(224,131,59,.12)" : "#0e1419",
  color: tone === "rec" ? "#e07b6f" : tone === "on" ? ACCENT : "#cdd8e2",
});

const STEPS = [
  ["🔊", "Hören", "Listen to the sentence."],
  ["🗣", "Mitsprechen", "Say it along with the phone, same speed and melody."],
  ["🙈", "Aus dem Kopf", "See only the English and say the German."],
  ["🎙", "Aufnehmen", "Record yourself, then 🔁 hear the model and you one after the other."],
];

function HowTo() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "#16202a", borderRadius: 12, padding: "8px 12px", marginBottom: 12 }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ background: "none", border: "none", color: "#8fb8d8", fontSize: 13, fontWeight: 700, padding: "4px 0", cursor: "pointer", width: "100%", textAlign: "left" }}>
        {open ? "▾" : "▸"} So übst du · How to practise
      </button>
      {open && (
        <ol style={{ margin: "6px 0 4px", paddingLeft: 20, color: "#cdd8e2", fontSize: 13, lineHeight: 1.5 }}>
          {STEPS.map(([icon, de, en]) => (
            <li key={de}><b>{icon} {de}</b> – <span style={{ color: "#9ab0c2" }}>{en}</span></li>
          ))}
          <li style={{ listStyle: "none", marginLeft: -20, marginTop: 6, color: "#9ab0c2" }}>Lerne ganze Sätze, nicht einzelne Wörter – im Gespräch fehlt die Zeit, Sätze zu bauen.</li>
        </ol>
      )}
    </div>
  );
}

const fmt = (s) => `0:${String(s).padStart(2, "0")}`;

function LineRow({ line, hidden, revealed, onReveal, hasRec, rec, onRecord, onPlayMine, onCompare, onDelete, canRecord }) {
  const isMe = line.who === "B";
  const showDe = !hidden || revealed;
  const recordingHere = rec.recording && rec.lineId === line.id;
  return (
    <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 12, background: isMe ? "#18222c" : "#161d24", border: `1px solid ${isMe ? "#35506a" : "#2c3a47"}` }}>
      {line.who && (
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: isMe ? "#8fb8d8" : "#7d8d9c", marginBottom: 4 }}>
          {isMe ? "B · DU" : "A"}
        </div>
      )}
      {showDe ? (
        <div lang="de" style={{ fontSize: 16, lineHeight: 1.5, color: "#f2f5f8", fontWeight: 600 }}>{line.de}</div>
      ) : (
        <button type="button" onClick={onReveal} style={{ ...small(), color: "#9ab0c2", fontWeight: 600 }}>👀 Deutsch zeigen</button>
      )}
      <div style={{ fontSize: hidden && !revealed ? 15 : 13, color: hidden && !revealed ? "#e6ecf1" : "#7d8d9c", marginTop: 3, fontStyle: hidden && !revealed ? "normal" : "italic" }}>
        {hidden && !revealed ? "🇬🇧 " : ""}{line.en}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        <button type="button" aria-label="Anhören" onClick={() => speak(line.de, undefined, 0.9)} style={small()}>🔊</button>
        <button type="button" aria-label="Langsam anhören" onClick={() => speak(line.de, undefined, 0.6)} style={small()}>🐢</button>
        {canRecord && (
          <button type="button" aria-pressed={recordingHere} onClick={onRecord} style={small(recordingHere ? "rec" : undefined)}>
            {recordingHere ? `⏹ ${fmt(rec.seconds)}` : "🎙 Aufnehmen"}
          </button>
        )}
        {hasRec && !recordingHere && (
          <>
            <button type="button" aria-label="Meine Aufnahme anhören" onClick={onPlayMine} style={small("on")}>▶ Ich</button>
            <button type="button" aria-label="Erst das Vorbild, dann meine Aufnahme" onClick={onCompare} style={small("on")}>🔁 Vergleichen</button>
            <button type="button" aria-label="Aufnahme löschen" onClick={onDelete} style={small()}>🗑</button>
          </>
        )}
      </div>
    </div>
  );
}

function SetView({ set, onBack }) {
  const hasDialog = set.dialogues.length > 0;
  const [tab, setTab] = useState("saetze");
  const [hidden, setHidden] = useState(false);
  const [revealed, setRevealed] = useState(() => new Set());
  const [recIds, setRecIds] = useState(() => new Set());
  const [persistent, setPersistent] = useState(true);
  const [recLine, setRecLine] = useState(null);
  const [playErr, setPlayErr] = useState(null);
  const mic = useRecorder({ maxSeconds: 30 });
  const audio = useRef(null);
  const canRecord = recorderSupported();
  const meta = set.deck ? DECK_META[set.deck] : null;

  const lines = useMemo(() => linesOf(set), [set]);
  const sentences = lines.filter((l) => l.dialogue == null);
  const dialogue = lines.filter((l) => l.dialogue === 0);
  const shown = tab === "dialog" ? dialogue : sentences;
  const listen = useMemo(
    () => shown.map((l) => ({ text: l.de, who: l.who ? VOICE_OF[l.who] : undefined })),
    [shown],
  );

  useEffect(() => {
    let alive = true;
    recordingIds().then((ids) => { if (alive) setRecIds(ids); });
    recordingsPersistent().then((p) => { if (alive) setPersistent(p); });
    return () => { alive = false; };
  }, []);

  const stopAudio = () => {
    if (audio.current) { audio.current.pause(); URL.revokeObjectURL(audio.current.src); audio.current = null; }
  };
  useEffect(() => () => { stopAudio(); stopSpeaking(); }, []);

  const playMine = async (id) => {
    stopAudio();
    setPlayErr(null);
    const r = await loadRecording(id);
    if (!r) { setPlayErr("Aufnahme nicht gefunden."); return; }
    const a = new Audio(URL.createObjectURL(r.blob));
    audio.current = a;
    a.onended = stopAudio;
    a.play().catch(() => setPlayErr("Abspielen geht nicht."));
  };
  const compare = (line) => {
    stopAudio();
    speak(line.de, () => playMine(line.id), 0.9, () => setTimeout(() => playMine(line.id), 300));
  };
  const record = (line) => {
    if (mic.recording) { mic.stop(); return; }
    stopAudio();
    stopSpeaking();
    setRecLine(line.id);
    mic.start((url, blob) => {
      URL.revokeObjectURL(url);
      saveRecording(line.id, blob).then(() => setRecIds((s) => new Set(s).add(line.id)));
    });
  };
  const remove = (line) => {
    deleteRecording(line.id).then(() => setRecIds((s) => { const n = new Set(s); n.delete(line.id); return n; }));
  };
  const switchTab = (t) => { if (mic.recording) mic.stop(); setTab(t); setRevealed(new Set()); };
  const isHidden = (l) => hidden && (tab === "saetze" || l.who === "B");

  return (
    <div>
      <button type="button" onClick={onBack} style={{ marginBottom: 12, background: ACCENT, border: "none", borderRadius: 10, minHeight: 40, padding: "8px 14px", color: "#0e1419", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>← Alle Sätze</button>
      <div style={{ fontSize: 12, color: "#8fb8d8" }}>{meta ? `${meta.icon} ${meta.label}` : "🗣 Für jeden Tag"} · A2</div>
      <h2 style={{ margin: "4px 0 2px", fontSize: 20, color: "#f2f5f8" }}>{set.title}</h2>
      <div style={{ fontSize: 13, color: "#7d8d9c", marginBottom: 12 }}>{set.en}</div>
      <HowTo />

      {hasDialog && (
        <div role="tablist" style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button type="button" role="tab" aria-selected={tab === "saetze"} onClick={() => switchTab("saetze")} style={chip(tab === "saetze")}>💬 Sätze ({sentences.length})</button>
          <button type="button" role="tab" aria-selected={tab === "dialog"} onClick={() => switchTab("dialog")} style={chip(tab === "dialog")}>🎭 Dialog</button>
        </div>
      )}
      {tab === "dialog" && (
        <div style={{ fontSize: 14, fontWeight: 700, color: "#cdd8e2", margin: "2px 0 8px" }}>
          {set.dialogues[0].title} <span style={{ fontWeight: 400, color: "#7d8d9c" }}>· {set.dialogues[0].en}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <AudioControls key={tab} lines={listen} label={tab === "dialog" ? "🔊 Dialog anhören" : "🔊 Alle anhören"} rate={0.85} />
        <button type="button" aria-pressed={hidden} onClick={() => { setHidden((h) => !h); setRevealed(new Set()); }} style={chip(hidden)}>
          {tab === "dialog" ? "🙈 Meine Rolle (B) verdecken" : "🙈 Aus dem Kopf"}
        </button>
      </div>
      {hidden && (
        <div style={{ fontSize: 12, color: "#9ab0c2", marginBottom: 10 }}>
          {tab === "dialog" ? "Lies A, dann sag deine Antwort (B) auf Deutsch – erst danach „Deutsch zeigen“." : "Lies das Englische, sag den Satz auf Deutsch – erst danach „Deutsch zeigen“."}
        </div>
      )}

      {shown.map((l) => (
        <LineRow
          key={l.id}
          line={l}
          hidden={isHidden(l)}
          revealed={revealed.has(l.id)}
          onReveal={() => setRevealed((s) => new Set(s).add(l.id))}
          hasRec={recIds.has(l.id)}
          rec={{ recording: mic.recording, seconds: mic.seconds, lineId: recLine }}
          onRecord={() => record(l)}
          onPlayMine={() => playMine(l.id)}
          onCompare={() => compare(l)}
          onDelete={() => remove(l)}
          canRecord={canRecord}
        />
      ))}

      {(mic.error || playErr) && <div role="alert" style={{ fontSize: 12, color: "#e07b6f", margin: "4px 0 8px" }}>{mic.error || playErr}</div>}
      <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 6, lineHeight: 1.5 }}>
        {!canRecord ? "🎙 Aufnehmen geht in diesem Browser nicht." : persistent
          ? "🎙 Deine Aufnahmen bleiben auf diesem Handy (nicht in der Sicherungsdatei). Eine neue Aufnahme ersetzt die alte."
          : "🎙 Dieser Browser kann Aufnahmen nicht speichern – sie sind weg, wenn du die App schließt."}
      </div>
    </div>
  );
}

function ChunkView({ sets, allSets, openKey, onOpen }) {
  const [showAll, setShowAll] = useState(false);
  const [recIds, setRecIds] = useState(() => new Set());
  useEffect(() => {
    let alive = true;
    if (!openKey) recordingIds().then((ids) => { if (alive) setRecIds(ids); });
    return () => { alive = false; };
  }, [openKey]);

  const open = openKey ? allSets.find((s) => s.key === openKey) : null;
  if (open) return <SetView key={open.key} set={open} onBack={() => onOpen(null)} />;

  const others = allSets.filter((s) => !sets.includes(s));
  const row = (s) => {
    const meta = s.deck ? DECK_META[s.deck] : null;
    const ids = linesOf(s).map((l) => l.id);
    const recorded = ids.filter((id) => recIds.has(id)).length;
    return (
      <button key={s.key} type="button" onClick={() => onOpen(s.key)} style={rowStyle}>
        <span aria-hidden="true" style={{ fontSize: 20 }}>{s.icon || (meta ? meta.icon : "🧱")}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{s.title}</span>
          <span style={{ display: "block", fontSize: 12, color: "#9ab0c2", marginTop: 2 }}>
            {s.sentences.length} Sätze{s.dialogues.length ? " · Dialog" : ""}{meta ? ` · ${meta.label}` : ""}
          </span>
        </span>
        {recorded > 0 && <span style={{ flexShrink: 0, fontSize: 12, color: GREEN }}>🎙 {recorded}/{ids.length}</span>}
      </button>
    );
  };

  return (
    <div>
      <div style={{ background: "#16202a", borderRadius: 12, padding: "10px 16px", marginBottom: 14, fontSize: 12, color: "#8fb8d8", textAlign: "center" }}>
        🧱 Fertige Sätze und Dialoge zum Nachsprechen, Auswendiglernen und Aufnehmen
      </div>
      {sets.map(row)}
      {others.length > 0 && (showAll ? (
        <>
          <div style={{ margin: "16px 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c" }}>WEITERE KAPITEL</div>
          {others.map(row)}
        </>
      ) : (
        <button type="button" onClick={() => setShowAll(true)} style={{ ...rowStyle, justifyContent: "center", color: "#9ab0c2", fontSize: 13 }}>
          Alle {allSets.length} Sets zeigen
        </button>
      ))}
    </div>
  );
}

const lineShape = PropTypes.shape({ de: PropTypes.string.isRequired, en: PropTypes.string.isRequired, who: PropTypes.string });
const setShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  deck: PropTypes.string,
  icon: PropTypes.string,
  title: PropTypes.string.isRequired,
  en: PropTypes.string,
  sentences: PropTypes.arrayOf(lineShape).isRequired,
  dialogues: PropTypes.arrayOf(PropTypes.shape({ title: PropTypes.string, en: PropTypes.string, lines: PropTypes.arrayOf(lineShape) })).isRequired,
});

LineRow.propTypes = {
  line: PropTypes.shape({ id: PropTypes.string.isRequired, de: PropTypes.string.isRequired, en: PropTypes.string.isRequired, who: PropTypes.string }).isRequired,
  hidden: PropTypes.bool, revealed: PropTypes.bool, onReveal: PropTypes.func.isRequired, hasRec: PropTypes.bool,
  rec: PropTypes.shape({ recording: PropTypes.bool, seconds: PropTypes.number, lineId: PropTypes.string }).isRequired,
  onRecord: PropTypes.func.isRequired, onPlayMine: PropTypes.func.isRequired, onCompare: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired, canRecord: PropTypes.bool,
};
SetView.propTypes = { set: setShape.isRequired, onBack: PropTypes.func.isRequired };
ChunkView.propTypes = {
  sets: PropTypes.arrayOf(setShape).isRequired,
  allSets: PropTypes.arrayOf(setShape).isRequired,
  openKey: PropTypes.string,
  onOpen: PropTypes.func.isRequired,
};

export default ChunkView;
