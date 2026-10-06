import { useState, useEffect, useRef, Fragment } from "react";
import PropTypes from "prop-types";
import { STORAGE_KEYS } from "../../constants";
import { GRAMMAR_EXERCISES, ALL_CARDS, DECK_META } from "../../data";
import GrammarExercises from "./GrammarExercises";
import { idOf } from "../../engine";
import { speak } from "../../engine/speech";
import { iconBtn } from "../../components/cardStyles";
import FlipCard from "../../components/FlipCard";
import Reveal from "../../components/Reveal";
import LookupLinks from "../../components/LookupLinks";
import { topicLinks, topicQuestion, topicSubject } from "../../engine/lookup";
import TopicBody from "./GrammarSections";
import { localize } from "./richText";

// Grammar reference - a static, hand-curated table (same authoring
// philosophy as the vocabulary data: real content work, not a live guess).
// This is the "static half" of the hybrid grammar section discussed in
// project planning. The "AI-explained half" (live Claude Q&A that can save
// a good answer back into this same table) is a separate, later phase -
// it needs a bring-your-own-key architecture change that hasn't been
// built yet. This view only renders what already exists in topics.json.
//
// LOCALIZATION: title and all topic text are per-language objects, same shape as
// HELP_I18N elsewhere in the app - { de: "...", en: "..." }, with more
// language keys addable later without restructuring. Currently only
// de/en are authored (personal-use scope decision - see project
// conversation history); the lookup below already falls back gracefully
// to en, then de, so adding sq/ar/uk/hi later is purely a data change,
// no code change required here.
const levelColor = (level) => (level === "A1" ? "#5fa85f" : "#e0833b");

// how many of "Deine Wörter" show before "Alle N zeigen"
const WORDS_PREVIEW = 12;
const ACCENT = "#e0833b";

// "Deine Wörter" only carry front, english and decks; the full card (example,
// note, progress) comes from here
const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [idOf(c.deck, c.front), c]));
const cardOf = (w) => (w.decks || []).map((d) => CARD_BY_ID.get(idOf(d, w.front))).find(Boolean);

// words: the learner's cards this topic covers (see buildGrammarIndex), so
// a rule can be read next to the vocabulary it applies to.
// exercises: this topic's ✏️ Üben questions; best: best score so far
// A tapped word opens its full card right below it (flip, audio, ✓ Gekonnt),
// with a link to its chapter (onOpenChapter).
function GrammarTopicCard({ topic, words = [], lang, open, onToggle, exercises = [], best, due, onScore, onAnswer, onOpenChapter }) {
  const [audioErr, setAudioErr] = useState(false);
  const [showAllWords, setShowAllWords] = useState(false);
  const [openWord, setOpenWord] = useState(null); // front of the opened word
  const shownWords = showAllWords ? words : words.slice(0, WORDS_PREVIEW);
  const panelId = `grammar-panel-${topic.key}`;
  const title = localize(topic.title, lang);
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
          {due && <span title="Heute wiederholen" style={{ fontSize: 11, fontWeight: 700, color: "#e0833b" }}>📅 fällig</span>}
          {best != null && (
            <span title="Bestes Übungsergebnis" style={{ fontSize: 11, color: best === exercises.length ? "#5fa85f" : "#9ab0c2" }}>✏️ {best}/{exercises.length}</span>
          )}
          {words.length > 0 && (
            <span style={{ fontSize: 11, color: "#7d8d9c" }}>{words.length} {words.length === 1 ? "Wort" : "Wörter"}</span>
          )}
          <span aria-hidden="true" style={{ color: "#7d8d9c", fontSize: 14, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
        </span>
      </button>
      {open && (
        <div id={panelId} role="region" style={{ padding: "0 16px 16px" }}>
          <TopicBody topic={topic} lang={lang} />
          <div style={{ margin: "16px 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c" }}>BEISPIELE</div>
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
          {exercises.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", marginBottom: 8 }}>✏️ ÜBEN</div>
              <GrammarExercises items={exercises} lang={lang} best={best} onDone={onScore} onAnswer={onAnswer} />
            </div>
          )}
          {words.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", marginBottom: 8 }}>
                DEINE WÖRTER ({words.length})
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
                {shownWords.map((w) => {
                  const isOpen = openWord === w.front;
                  const card = isOpen ? cardOf(w) : null;
                  const meta = card && DECK_META[card.deck];
                  return (
                    <Fragment key={w.front}>
                      <button
                        type="button"
                        onClick={() => setOpenWord(isOpen ? null : w.front)}
                        aria-expanded={isOpen}
                        style={{ textAlign: "left", padding: "6px 10px", borderRadius: 8, border: `1px solid ${isOpen ? ACCENT : "#2c3a47"}`, background: "#0e1419", cursor: "pointer" }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f2f5f8" }}>{w.front}</div>
                        <div style={{ fontSize: 11, color: "#7d8d9c", marginTop: 1 }}>{w.english}</div>
                      </button>
                      {card && (
                        <Reveal style={{ gridColumn: "1 / -1", margin: "2px 0 8px" }}>
                          <FlipCard
                            front={card.front}
                            sub={card.sub}
                            english={card.english}
                            example={card.example}
                            exampleEn={card.exampleEn}
                            type={card.type}
                            gender={card.gender}
                            deck={card.deck}
                            cardId={idOf(card.deck, card.front)}
                            lang={lang}
                            level={card.level}
                            source={card.source}
                            note={card.note}
                          />
                          {meta && onOpenChapter && (
                            <button type="button" onClick={() => onOpenChapter(card.deck, card.front)} style={{ display: "block", margin: "8px auto 0", background: "none", border: "none", color: "#8fb8d8", fontSize: 13, cursor: "pointer" }}>
                              {meta.icon} {meta.label} öffnen →
                            </button>
                          )}
                        </Reveal>
                      )}
                    </Fragment>
                  );
                })}
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
          <div style={{ marginTop: 16, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", textAlign: "center" }}>MEHR DAZU</div>
          <LookupLinks links={topicLinks(localize(topic.title, "de"))} question={topicQuestion(localize(topic.title, "de"))} aiSubject={topicSubject(localize(topic.title, "de"))} />
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
    group: localizedTextShape,
    level: PropTypes.oneOf(["A1", "A2"]).isRequired,
    // structured body (see GrammarSections.jsx), or a plain explanation
    summary: localizedTextShape,
    sections: PropTypes.arrayOf(PropTypes.object),
    explanation: localizedTextShape,
    examples: PropTypes.arrayOf(
      PropTypes.shape({ de: PropTypes.string.isRequired, en: PropTypes.string.isRequired })
    ).isRequired,
  }).isRequired,
  words: PropTypes.arrayOf(grammarWordShape),
  lang: PropTypes.string,
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  exercises: PropTypes.array,
  best: PropTypes.number,
  due: PropTypes.bool,
  onScore: PropTypes.func,
  onAnswer: PropTypes.func,
  onOpenChapter: PropTypes.func,
};

// best ✏️ Üben score per topic: { [key]: number }, kept in localStorage
const readScores = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.GRAMMAR_SCORES)) || {}; } catch { return {}; }
};

// focus: { key, n } - set when a card's grammar chip opened this view; the
// topic is expanded and scrolled to. n changes on every open, so tapping the
// same chip twice still re-focuses. onBack: return to where the chip was.
// onOpenChapter(deck, front): show a word's card in its chapter.
// onExerciseAnswer(topicKey, item, correct): every ✏️ Üben answer (Fehlerheft).
// dueKeys: topics whose review is due (engine/grammarReview.js);
// onExerciseDone(topicKey, right, total): a finished ✏️ Üben round.
function GrammarView({ topics, words = {}, lang = "en", focus, onBack, onOpenChapter, onExerciseAnswer, dueKeys = [], onExerciseDone }) {
  const [openKey, setOpenKey] = useState(focus ? focus.key : null);
  const [scores, setScores] = useState(readScores);
  const saveScore = (key, score) => {
    setScores((prev) => {
      if (prev[key] != null && prev[key] >= score) return prev;
      const next = { ...prev, [key]: score };
      try { localStorage.setItem(STORAGE_KEYS.GRAMMAR_SCORES, JSON.stringify(next)); } catch { /* storage off */ }
      return next;
    });
  };
  useEffect(() => {
    if (!focus) return;
    setOpenKey(focus.key);
    const el = document.getElementById(`grammar-topic-${focus.key}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);
  // Opening a topic closes the open one; if that one was above, the page
  // shifts and the new topic's start ends up off-screen. So after opening,
  // bring its title to the top. (Closing a topic doesn't scroll.)
  const scrollOnOpen = useRef(false);
  const toggle = (key) => {
    const opening = openKey !== key;
    scrollOnOpen.current = opening;
    setOpenKey(opening ? key : null);
  };
  useEffect(() => {
    if (!scrollOnOpen.current || !openKey) return;
    scrollOnOpen.current = false;
    const el = document.getElementById(`grammar-topic-${openKey}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [openKey]);
  return (
    <>
      {onBack && (
        <button
          onClick={onBack}
          style={{ position: "sticky", top: 8, zIndex: 2, marginBottom: 12, background: ACCENT, border: "none", borderRadius: 10, padding: "8px 14px", color: "#0e1419", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.5)" }}
        >← Zurück</button>
      )}
      <div style={{ background: "#16202a", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: "#8fb8d8", textAlign: "center" }}>
        📖 Grammatik-Referenz · {topics.length} Themen · Tippe zum Aufklappen
        {dueKeys.length > 0 && <span style={{ color: "#e0833b", fontWeight: 700 }}> · 📅 {dueKeys.length} heute fällig</span>}
      </div>
      {topics.map((topic, i) => {
        // topics are ordered by group; a heading starts each group
        const group = topic.group ? localize(topic.group, lang) : null;
        const prev = i > 0 && topics[i - 1].group ? localize(topics[i - 1].group, lang) : null;
        const count = group ? topics.filter((t) => t.group && localize(t.group, lang) === group).length : 0;
        return (
          <Fragment key={topic.key}>
            {group && group !== prev && (
              <h3 style={{ margin: i === 0 ? "0 2px 8px" : "20px 2px 8px", fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "#e0833b" }}>
                {group} <span style={{ color: "#7d8d9c", fontWeight: 600 }}>· {count}</span>
              </h3>
            )}
            <GrammarTopicCard
              topic={topic}
              words={words[topic.key]}
              lang={lang}
              open={openKey === topic.key}
              onToggle={() => toggle(topic.key)}
              exercises={GRAMMAR_EXERCISES[topic.key]}
              best={scores[topic.key]}
              due={dueKeys.includes(topic.key)}
              onScore={(score) => { saveScore(topic.key, score); if (onExerciseDone) onExerciseDone(topic.key, score, (GRAMMAR_EXERCISES[topic.key] || []).length); }}
              onOpenChapter={onOpenChapter}
              onAnswer={onExerciseAnswer ? (item, correct) => onExerciseAnswer(topic.key, item, correct) : undefined}
            />
          </Fragment>
        );
      })}
    </>
  );
}

GrammarView.propTypes = {
  topics: PropTypes.arrayOf(GrammarTopicCard.propTypes.topic).isRequired,
  words: PropTypes.objectOf(PropTypes.arrayOf(grammarWordShape)),
  lang: PropTypes.string,
  focus: PropTypes.shape({ key: PropTypes.string.isRequired, n: PropTypes.number }),
  onBack: PropTypes.func,
  onOpenChapter: PropTypes.func,
  onExerciseAnswer: PropTypes.func,
  dueKeys: PropTypes.arrayOf(PropTypes.string),
  onExerciseDone: PropTypes.func,
};

export default GrammarView;
