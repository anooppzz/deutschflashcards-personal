import { useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { STORAGE_KEYS } from "../../constants";
import TextCheck from "../../components/TextCheck";
import { AiCtx } from "../../context/AiCtx";
import { aiSiteLinks } from "../../engine/lookup";
import { readWeak, textCorrectionPrompt } from "../../engine/textCheck";

// ✍️ Text prüfen (☰ Mehr): any text the learner wrote – homework, a
// postcard, a message – checked in the 🔍 Fehler-Check rounds
// (components/TextCheck.jsx), then, if wanted, corrected by an AI. A
// full-screen layer like 📋 Wortlisten; ← and the phone's back close it
// (App.jsx backAction). The text is kept as a draft (STORAGE_KEYS.TEXT_CHECK).

const ACCENT = "#e0833b";
const readDraft = () => { try { return localStorage.getItem(STORAGE_KEYS.TEXT_CHECK) || ""; } catch { return ""; } };

function TextCheckView({ onClose }) {
  const ai = useContext(AiCtx);
  const [text, setText] = useState(readDraft);
  const [checked, setChecked] = useState(() => readDraft().trim() || null);
  const [copied, setCopied] = useState(null);
  const scrollRef = useRef(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  const change = (v) => {
    setText(v);
    setChecked(null);
    try { localStorage.setItem(STORAGE_KEYS.TEXT_CHECK, v); } catch { /* storage off */ }
  };
  const prompt = checked ? textCorrectionPrompt(checked, readWeak()) : "";
  const copy = (site) => { try { navigator.clipboard.writeText(prompt).then(() => setCopied(site), () => {}); } catch { /* no clipboard */ } };

  return (
    <div
      ref={scrollRef}
      data-scroll-layer
      role="dialog"
      aria-modal="true"
      aria-label="Text prüfen"
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "#0e1419", overflowY: "auto", overscrollBehavior: "contain", fontFamily: "system-ui, sans-serif" }}
    >
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: "#0e1419", borderBottom: "1px solid #1f2a33", padding: "calc(10px + env(safe-area-inset-top, 0px)) 12px 10px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={onClose} aria-label="Text prüfen schließen" style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, border: "1px solid #2c3a47", background: "#1a232b", color: "#f2f5f8", fontSize: 18, cursor: "pointer" }}>←</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#f2f5f8" }}>✍️ Text prüfen</div>
            <div style={{ fontSize: 12, color: "#7d8d9c" }}>Fehler in eigenen Texten finden</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 12px calc(40px + env(safe-area-inset-bottom, 0px))" }}>
        <p style={{ fontSize: 13, color: "#9ab0c2", lineHeight: 1.5, margin: "0 0 10px" }}>
          Write or paste your text (a postcard, an e-mail, homework). Then read it once per kind of mistake – the app marks the places for each round.
        </p>
        <textarea
          value={text}
          onChange={(e) => change(e.target.value)}
          placeholder="Liebe Sabine, …"
          aria-label="Dein Text"
          rows={8}
          spellCheck={false}
          autoCorrect="off"
          style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 12, border: "1px solid #3a5670", background: "#0e1419", color: "#f2f5f8", fontSize: 16, lineHeight: 1.5, fontFamily: "inherit", resize: "vertical" }}
        />
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => setChecked(text.trim())}
          style={{ width: "100%", minHeight: 46, margin: "8px 0 14px", borderRadius: 12, border: "none", background: text.trim() ? ACCENT : "#2c3a47", color: "#0e1419", fontSize: 15, fontWeight: 800, cursor: text.trim() ? "pointer" : "default" }}
        >🔍 Fehler-Check starten</button>

        {checked && (
          <>
            <TextCheck text={checked} />
            <div style={{ marginTop: 14, border: "1px solid #2c3a47", borderRadius: 12, padding: "10px 12px", background: "#161d24" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#f2f5f8", marginBottom: 6 }}>🤖 Von einer KI korrigieren lassen</div>
              {ai.enabled && ai.ask && (
                <button type="button" onClick={() => ai.ask({ kind: "writing", title: "Text prüfen", question: prompt, context: prompt })} style={{ width: "100%", minHeight: 42, marginBottom: 8, borderRadius: 10, border: "none", background: ACCENT, color: "#0e1419", fontWeight: 800, cursor: "pointer" }}>✨ KI korrigieren lassen (in der App)</button>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {aiSiteLinks(prompt).map((l) => (
                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => copy(l)} className="tap" style={{ fontSize: 13, fontWeight: 700, color: "#8fb8d8", border: "1px solid #3a5670", borderRadius: 8, padding: "6px 10px", textDecoration: "none" }}>{l.label} ↗</a>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 6 }}>
                {copied ? `📋 Anfrage kopiert – falls ${copied.label} sie nicht zeigt: einfügen.` : "The AI gets your text, the five checks and your ⭐ points."}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

TextCheckView.propTypes = { onClose: PropTypes.func.isRequired };

export default TextCheckView;
