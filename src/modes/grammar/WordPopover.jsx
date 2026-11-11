import { useEffect, useLayoutEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { speak } from "../../engine/speech";
import { GRAMMAR_TOPICS } from "../../data";
import { localize } from "./richText";

// A tapped grammar word's meaning (engine/grammarWords.js), in a small box
// next to the word - no new page. Closes on ✕, a tap elsewhere, scrolling or
// Esc. topicKey: the open topic (no "mehr" link back to itself);
// onTopic(key): open the word's grammar topic.
const WIDTH = 320;

function WordPopover({ entry, anchor, lang, topicKey, onTopic, onClose }) {
  const boxRef = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(WIDTH, vw - 24);
    const left = Math.max(12, Math.min(r.left, vw - width - 12));
    const h = boxRef.current ? boxRef.current.offsetHeight : 200;
    const below = r.bottom + 6 + h <= vh - 72 || r.top < vh / 2;
    setPos({ width, left, top: below ? r.bottom + 6 : Math.max(8, r.top - 6 - h) });
  }, [anchor, entry]);
  useEffect(() => {
    const outside = (e) => { if (boxRef.current && !boxRef.current.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) onClose(); };
    const key = (e) => { if (e.key === "Escape") onClose(); };
    const scroll = () => onClose();
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll);
    };
  }, [anchor, onClose]);
  const topic = entry.topic && entry.topic !== topicKey ? GRAMMAR_TOPICS.find((t) => t.key === entry.topic) : null;
  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label={`${entry.w}: Bedeutung`}
      style={{
        position: "fixed", zIndex: 30, top: pos ? pos.top : -9999, left: pos ? pos.left : 0, width: pos ? pos.width : WIDTH,
        boxSizing: "border-box", maxHeight: "60vh", overflowY: "auto", padding: "10px 12px", borderRadius: 12, border: "1px solid #3a5670",
        background: "#141c23", boxShadow: "0 8px 24px rgba(0,0,0,.6)", color: "#cdd8e2", fontSize: 13, lineHeight: 1.45,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span lang="de" style={{ fontSize: 17, fontWeight: 800, color: "#f2f5f8" }}>{entry.w}</span>
        <button type="button" onClick={() => speak(entry.w)} aria-label={`Aussprechen: ${entry.w}`} style={{ border: "none", background: "none", fontSize: 14, cursor: "pointer", padding: 0 }}>🔊</button>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onClose} aria-label="Schließen" style={{ border: "none", background: "none", color: "#7d8d9c", fontSize: 15, cursor: "pointer", padding: 0 }}>✕</button>
      </div>
      <div style={{ fontSize: 11, color: "#8fb8d8", marginTop: 1 }}>
        {entry.group}{entry.case ? ` · + ${entry.case}` : ""}
      </div>
      <ol style={{ margin: "6px 0 0", paddingLeft: entry.meanings.length > 1 ? 18 : 0, listStyle: entry.meanings.length > 1 ? "decimal" : "none" }}>
        {entry.meanings.map((m, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            <div style={{ color: "#f2f5f8", fontWeight: 600 }}>{m.en}</div>
            <div lang="de" style={{ fontStyle: "italic" }}>
              {m.ex}{" "}
              <button type="button" onClick={() => speak(m.ex)} aria-label={`Aussprechen: ${m.ex}`} className="inline-tap" style={{ border: "none", background: "none", fontSize: 11, cursor: "pointer", padding: 0 }}>🔊</button>
            </div>
            <div style={{ fontSize: 12, color: "#7d8d9c" }}>{m.exEn}</div>
          </li>
        ))}
      </ol>
      {topic && onTopic && (
        <button type="button" onClick={() => { onClose(); onTopic(topic.key); }} style={{ display: "block", marginTop: 2, padding: "4px 0", border: "none", background: "none", color: "#e0833b", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
          📖 {localize(topic.title, lang)} →
        </button>
      )}
    </div>
  );
}

WordPopover.propTypes = {
  entry: PropTypes.shape({
    w: PropTypes.string.isRequired,
    group: PropTypes.string,
    case: PropTypes.string,
    topic: PropTypes.string,
    meanings: PropTypes.arrayOf(PropTypes.shape({ en: PropTypes.string, ex: PropTypes.string, exEn: PropTypes.string })).isRequired,
  }).isRequired,
  anchor: PropTypes.object.isRequired,
  lang: PropTypes.string,
  topicKey: PropTypes.string,
  onTopic: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export default WordPopover;
