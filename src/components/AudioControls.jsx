import { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { createPlayer, sentencesOf } from "../engine/speech";

// ▶ / ⏸ Pause / ▶ Weiter / ⏹ Stopp for a longer text read by the phone
// (🎓 DTZ Hören, 📰 Lesen Vorlesen). Pause keeps the place: "Weiter" goes on
// with the sentence that was cut off; "Stopp" starts over next time.
// lines: [{ text, who? }] (who: speaker, see engine/speech.js).
// disabled: only the start button (a DTZ simulation text that was heard once).
// onStart: when playing starts from the beginning.

const ACCENT = "#e0833b";
const btn = (active, disabled) => ({
  padding: "7px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: disabled ? "default" : "pointer",
  border: `1px solid ${active ? ACCENT : "#2c3a47"}`, background: active ? "rgba(224,131,59,.12)" : "#1a232b",
  color: disabled ? "#5a6b78" : active ? ACCENT : "#cdd8e2",
});

function AudioControls({ lines, label, rate = 0.95, disabled = false, onStart }) {
  const [state, setState] = useState("idle");
  const [index, setIndex] = useState(0);
  const [err, setErr] = useState(false);
  const pieces = useMemo(() => lines.flatMap((l) => sentencesOf(l.text).map((text) => ({ text, who: l.who }))), [lines]);
  const player = useRef(null);
  useEffect(() => {
    const p = createPlayer(pieces, { rate, onChange: (s, i) => { setState(s); setIndex(i); }, onErr: () => setErr(true) });
    player.current = p;
    return () => p.stop();
  }, [pieces, rate]);

  const start = () => {
    if (disabled) return;
    setErr(false);
    if (onStart) onStart();
    player.current.play();
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {state === "idle" ? (
          <button type="button" onClick={start} disabled={disabled} style={btn(false, disabled)}>{label}</button>
        ) : (
          <>
            {state === "playing" ? (
              <button type="button" onClick={() => player.current.pause()} style={btn(true)}>⏸ Pause</button>
            ) : (
              <button type="button" onClick={() => player.current.play()} style={btn(true)}>▶ Weiter</button>
            )}
            <button type="button" onClick={() => player.current.stop()} style={btn(false)}>⏹ Stopp</button>
            {pieces.length > 1 && (
              <span aria-live="off" style={{ fontSize: 12, color: "#7d8d9c", fontVariantNumeric: "tabular-nums" }}>
                {state === "paused" ? "pausiert · " : ""}Satz {Math.min(index + 1, pieces.length)}/{pieces.length}
              </span>
            )}
          </>
        )}
      </div>
      {err && <div style={{ marginTop: 6, fontSize: 11, color: "#c6925a" }}>🔇 Kein Ton – deutsche Stimme in den Handy-Einstellungen prüfen.</div>}
    </div>
  );
}

AudioControls.propTypes = {
  lines: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string.isRequired, who: PropTypes.string })).isRequired,
  label: PropTypes.string.isRequired,
  rate: PropTypes.number,
  disabled: PropTypes.bool,
  onStart: PropTypes.func,
};

export default AudioControls;
