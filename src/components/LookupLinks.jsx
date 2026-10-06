import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { claudeUrl } from "../engine/lookup";

// 🔎 Nachschlagen (free dictionaries, Google) and 🤖 Frag Claude, under a
// card's back or at the end of a grammar topic. links: [{ label, url }] from
// engine/lookup.js; question: what Claude is asked.
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

function LookupLinks({ links, question }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 6000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyQuestion = () => {
    try {
      navigator.clipboard.writeText(question).then(() => setCopied(true), () => {});
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
        <a href={claudeUrl(question)} target="_blank" rel="noopener noreferrer" onClick={copyQuestion} style={btn(false)}>
          🤖 Frag Claude
        </a>
      </div>
      {open && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
          {links.map((l) => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={chip}>{l.label} ↗</a>
          ))}
        </div>
      )}
      {copied && (
        <div role="status" style={{ marginTop: 6, fontSize: 11, color: "#7d8d9c", textAlign: "center" }}>
          📋 Frage kopiert – falls Claude sie nicht anzeigt: einfügen.
        </div>
      )}
    </div>
  );
}

LookupLinks.propTypes = {
  links: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string.isRequired, url: PropTypes.string.isRequired })).isRequired,
  question: PropTypes.string.isRequired,
};

export default LookupLinks;
