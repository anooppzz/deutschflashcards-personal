import { useState } from "react";
import PropTypes from "prop-types";
import { speak } from "../../engine/speech";
import { iconBtn } from "../../components/cardStyles";

// Grammar reference - a static, hand-curated table (same authoring
// philosophy as the vocabulary data: real content work, not a live guess).
// This is the "static half" of the hybrid grammar section discussed in
// project planning. The "AI-explained half" (live Claude Q&A that can save
// a good answer back into this same table) is a separate, later phase -
// it needs a bring-your-own-key architecture change that hasn't been
// built yet. This view only renders what already exists in topics.json.
//
// LOCALIZATION: title/explanation are per-language objects, same shape as
// HELP_I18N elsewhere in the app - { de: "...", en: "..." }, with more
// language keys addable later without restructuring. Currently only
// de/en are authored (personal-use scope decision - see project
// conversation history); the lookup below already falls back gracefully
// to en, then de, so adding sq/ar/uk/hi later is purely a data change,
// no code change required here.
const levelColor = (level) => (level === "A1" ? "#5fa85f" : "#e0833b");

const localize = (field, lang) => field[lang] || field.en || field.de;

function GrammarTopicCard({ topic, lang, open, onToggle }) {
  const [audioErr, setAudioErr] = useState(false);
  const panelId = `grammar-panel-${topic.key}`;
  const title = localize(topic.title, lang);
  const explanation = localize(topic.explanation, lang);
  return (
    <div style={{ marginBottom: 10, borderRadius: 12, border: "1px solid #2c3a47", background: "#161d24", overflow: "hidden" }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: levelColor(topic.level), border: `1px solid ${levelColor(topic.level)}`, borderRadius: 6, padding: "2px 7px" }}>
            {topic.level}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#f2f5f8" }}>{title}</span>
        </span>
        <span aria-hidden="true" style={{ color: "#7d8d9c", fontSize: 14, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
      </button>
      {open && (
        <div id={panelId} role="region" style={{ padding: "0 16px 16px" }}>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#cdd8e2", lineHeight: 1.6 }}>{explanation}</p>
          {topic.examples.map((ex, i) => (
            <div key={i} style={{ marginBottom: i === topic.examples.length - 1 ? 0 : 10, padding: "8px 12px", borderRadius: 10, background: "#0e1419" }}>
              <div style={{ fontSize: 13, color: "#f2f5f8", fontStyle: "italic" }}>
                {ex.de}
                <button
                  onClick={() => speak(ex.de, () => setAudioErr(true))}
                  aria-label={`Aussprechen: ${ex.de}`}
                  style={{ ...iconBtn, fontSize: 12 }}
                >🔊</button>
              </div>
              <div style={{ fontSize: 12, color: "#7d8d9c", marginTop: 2 }}>{ex.en}</div>
            </div>
          ))}
          {audioErr && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#c6925a", textAlign: "center" }}>
              🔇 Audio in dieser Umgebung blockiert
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const localizedTextShape = PropTypes.objectOf(PropTypes.string);

GrammarTopicCard.propTypes = {
  topic: PropTypes.shape({
    key: PropTypes.string.isRequired,
    title: localizedTextShape.isRequired,
    level: PropTypes.oneOf(["A1", "A2"]).isRequired,
    explanation: localizedTextShape.isRequired,
    examples: PropTypes.arrayOf(
      PropTypes.shape({ de: PropTypes.string.isRequired, en: PropTypes.string.isRequired })
    ).isRequired,
  }).isRequired,
  lang: PropTypes.string,
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

function GrammarView({ topics, lang = "en" }) {
  const [openKey, setOpenKey] = useState(null);
  return (
    <>
      <div style={{ background: "#16202a", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: "#8fb8d8", textAlign: "center" }}>
        📖 Grammatik-Referenz · {topics.length} Themen · Tippe zum Aufklappen
      </div>
      {topics.map((topic) => (
        <GrammarTopicCard
          key={topic.key}
          topic={topic}
          lang={lang}
          open={openKey === topic.key}
          onToggle={() => setOpenKey((k) => (k === topic.key ? null : topic.key))}
        />
      ))}
    </>
  );
}

GrammarView.propTypes = {
  topics: PropTypes.arrayOf(GrammarTopicCard.propTypes.topic).isRequired,
  lang: PropTypes.string,
};

export default GrammarView;
