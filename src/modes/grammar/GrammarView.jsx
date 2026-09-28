import { useState, useEffect } from "react";
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

// how many of "Deine Wörter" show before "Alle N zeigen"
const WORDS_PREVIEW = 12;

// words: the learner's cards this topic covers (see buildGrammarIndex), so
// a rule can be read next to the vocabulary it applies to.
function GrammarTopicCard({ topic, words = [], lang, open, onToggle }) {
  const [audioErr, setAudioErr] = useState(false);
  const [showAllWords, setShowAllWords] = useState(false);
  const shownWords = showAllWords ? words : words.slice(0, WORDS_PREVIEW);
  const panelId = `grammar-panel-${topic.key}`;
  const title = localize(topic.title, lang);
  const explanation = localize(topic.explanation, lang);
  return (
    <div id={`grammar-topic-${topic.key}`} style={{ marginBottom: 10, borderRadius: 12, border: "1px solid #2c3a47", background: "#161d24", overflow: "hidden", scrollMarginTop: 52 }}>
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
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {words.length > 0 && (
            <span style={{ fontSize: 11, color: "#7d8d9c" }}>{words.length} {words.length === 1 ? "Wort" : "Wörter"}</span>
          )}
          <span aria-hidden="true" style={{ color: "#7d8d9c", fontSize: 14, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
        </span>
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
          {words.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", marginBottom: 8 }}>
                DEINE WÖRTER ({words.length})
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
                {shownWords.map((w) => (
                  <button
                    key={w.front}
                    onClick={() => speak(w.front, () => setAudioErr(true))}
                    aria-label={`Aussprechen: ${w.front}`}
                    style={{ textAlign: "left", padding: "6px 10px", borderRadius: 8, border: "1px solid #2c3a47", background: "#0e1419", cursor: "pointer" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f2f5f8" }}>{w.front}</div>
                    <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 1 }}>{w.english}</div>
                  </button>
                ))}
              </div>
              {words.length > WORDS_PREVIEW && (
                <button
                  onClick={() => setShowAllWords((v) => !v)}
                  aria-expanded={showAllWords}
                  style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "#8fb8d8", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                >{showAllWords ? "Weniger zeigen ▴" : `Alle ${words.length} zeigen ▾`}</button>
              )}
            </div>
          )}
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

const grammarWordShape = PropTypes.shape({
  front: PropTypes.string.isRequired,
  english: PropTypes.string,
  decks: PropTypes.arrayOf(PropTypes.string),
});

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
  words: PropTypes.arrayOf(grammarWordShape),
  lang: PropTypes.string,
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

// focus: { key, n } - set when a card's grammar chip opened this view; the
// topic is expanded and scrolled to. n changes on every open, so tapping the
// same chip twice still re-focuses. onBack: return to where the chip was.
function GrammarView({ topics, words = {}, lang = "en", focus, onBack }) {
  const [openKey, setOpenKey] = useState(focus ? focus.key : null);
  useEffect(() => {
    if (!focus) return;
    setOpenKey(focus.key);
    const el = document.getElementById(`grammar-topic-${focus.key}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);
  return (
    <>
      {onBack && (
        <button
          onClick={onBack}
          style={{ position: "sticky", top: 8, zIndex: 2, marginBottom: 12, background: "#1a232b", border: "1px solid #2c3a47", borderRadius: 10, padding: "6px 12px", color: "#9ab0c2", fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.4)" }}
        >← Zurück</button>
      )}
      <div style={{ background: "#16202a", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: "#8fb8d8", textAlign: "center" }}>
        📖 Grammatik-Referenz · {topics.length} Themen · Tippe zum Aufklappen
      </div>
      {topics.map((topic) => (
        <GrammarTopicCard
          key={topic.key}
          topic={topic}
          words={words[topic.key]}
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
  words: PropTypes.objectOf(PropTypes.arrayOf(grammarWordShape)),
  lang: PropTypes.string,
  focus: PropTypes.shape({ key: PropTypes.string.isRequired, n: PropTypes.number }),
  onBack: PropTypes.func,
};

export default GrammarView;
