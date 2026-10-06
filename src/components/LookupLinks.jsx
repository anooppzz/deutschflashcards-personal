import { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { aiSiteLinks } from "../engine/lookup";
import { AiCtx } from "../context/AiCtx";

// 🔎 Nachschlagen (free dictionaries, Google) and 🤖 Frag Claude / ChatGPT /
// Gemini, under a card's back or at the end of a grammar topic. links:
// [{ label, url }] from engine/lookup.js; question: what the AI site is asked
// (Claude and ChatGPT get it in the link; it is also copied, and Gemini
// needs it pasted). With the 🤖 KI-Assistent
// switched on (AiCtx), "✨ KI fragen" opens the in-app chat about aiSubject.
// Taps here never flip the card around them.

const ACCENT = "#e0833b";
const btn = (on) => ({
  padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none",
  border: `1px solid ${on ? ACCENT : "#2c3a47"}`, background: on ? "rgba(224,131,59,.12)" : "#1a232b", color: on ? ACCENT : "#9ab0c2",
  display: "inline-flex", alignItems: "center", gap: 4,
});
const chip = {
  padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none",
  border: "1px solid #3a5670", color: "#8fb8d8", background: "transparent",
};

function LookupLinks({ links, question, aiSubject }) {
  const ai = useContext(AiCtx);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(null); // the site the question was copied for
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 6000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyQuestion = (site) => {
    try {
      navigator.clipboard.writeText(question).then(() => setCopied(site), () => {});
    } catch { /* no clipboard: the link alone has to do */ }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {links.length > 0 && (
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={btn(open)}>
            🔎 Nachschlagen {open ? "▴" : "▾"}
          </button>
        )}
        {ai.enabled && ai.ask && aiSubject && (
          <button type="button" onClick={() => ai.ask(aiSubject)} style={{ ...btn(true), background: ACCENT, color: "#0e1419" }}>
            ✨ KI fragen
          </button>
        )}
      </div>
      {open && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
          {links.map((l) => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={chip}>{l.label} ↗</a>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 5, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#9ab0c2" }}>🤖 Frag:</span>
        {aiSiteLinks(question).map((l) => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => copyQuestion(l)} style={{ ...chip, padding: "4px 8px" }}>{l.label} ↗</a>
        ))}
      </div>
      {copied && (
        <div role="status" style={{ marginTop: 6, fontSize: 11, color: "#7d8d9c", textAlign: "center" }}>
          {copied.prefill
            ? `📋 Frage kopiert – falls ${copied.label} sie nicht anzeigt: einfügen.`
            : `📋 Frage kopiert – in ${copied.label} lange tippen → Einfügen.`}
        </div>
      )}
    </div>
  );
}

LookupLinks.propTypes = {
  links: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string.isRequired, url: PropTypes.string.isRequired })).isRequired,
  question: PropTypes.string.isRequired,
  aiSubject: PropTypes.shape({ kind: PropTypes.string, title: PropTypes.string, question: PropTypes.string, context: PropTypes.string }),
};

export default LookupLinks;
