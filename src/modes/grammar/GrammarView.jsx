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
import TopicBody, { GLOSSARY_KEY } from "./GrammarSections";
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

const sectionLabel = { fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c" };

// the learner's cards a topic covers, as a grid; a tapped word opens its full
// card right below it (flip, audio, ✓ Gekonnt), with a link to its chapter
function TopicWords({ words, lang, onOpenChapter }) {
  const [showAllWords, setShowAllWords] = useState(false);
  const [openWord, setOpenWord] = useState(null); // front of the opened word
  const shownWords = showAllWords ? words : words.slice(0, WORDS_PREVIEW);
  return (
    <>
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
                style={{ textAlign: "left", minHeight: 44, padding: "6px 10px", borderRadius: 8, border: `1px solid ${isOpen ? ACCENT : "#2c3a47"}`, background: "#0e1419", cursor: "pointer" }}
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
                    <button type="button" onClick={() => onOpenChapter(card.deck, card.front)} style={{ display: "block", margin: "8px auto 0", minHeight: 40, background: "none", border: "none", color: "#8fb8d8", fontSize: 13, cursor: "pointer" }}>
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
          style={{ display: "block", margin: "10px auto 0", minHeight: 40, background: "none", border: "none", color: "#8fb8d8", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
        >{showAllWords ? "Weniger zeigen ▴" : `Alle ${words.length} zeigen ▾`}</button>
      )}
    </>
  );
}

TopicWords.propTypes = {
  words: PropTypes.array.isRequired,
  lang: PropTypes.string,
  onOpenChapter: PropTypes.func,
};

const navBtn = {
  flexShrink: 0, width: 40, height: 40, borderRadius: 10, border: "1px solid #2c3a47", background: "#1a232b",
  color: "#cdd8e2", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};

// One topic as its own page. A sticky bar keeps the way back, the title and
// the tabs on screen: 📖 Regel (rule, examples, links) · ✏️ Üben · 🗂 Wörter.
// All three stay mounted (hidden), so peeking at the rule mid-exercise keeps
// the exercise where it was. ‹ › step to the previous/next topic.
// words: the learner's cards this topic covers (see buildGrammarIndex)
// exercises: this topic's ✏️ Üben questions; best: best score so far
function GrammarTopicPage({ topic, words = [], lang, exercises = [], best, due, onClose, closeLabel, prev, next, onGo, onScore, onAnswer, onOpenChapter }) {
  const [audioErr, setAudioErr] = useState(false);
  const [tab, setTab] = useState("regel");
  const rootRef = useRef(null);
  const title = localize(topic.title, lang);
  const titleDe = localize(topic.title, "de");
  // a new tab starts at the top of the page (just under the sticky bar)
  const pickTab = (t) => {
    setTab(t);
    const el = rootRef.current;
    if (el && el.getBoundingClientRect().top < 0) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 8 });
  };
  const tabs = [
    ["regel", "📖 Regel", null],
    exercises.length > 0 && ["ueben", "✏️ Üben", best != null ? `${best}/${exercises.length}` : exercises.length],
    words.length > 0 && ["woerter", "🗂 Wörter", words.length],
  ].filter(Boolean);
  const panel = (key) => ({ id: `grammar-${topic.key}-${key}`, role: "tabpanel", hidden: tab !== key });
  return (
    <div ref={rootRef} id={`grammar-page-${topic.key}`} style={{ scrollMarginTop: 8 }}>
      <div style={{ position: "sticky", top: 0, zIndex: 3, background: "#0e1419", padding: "8px 0 10px", margin: "0 0 12px", borderBottom: "1px solid #1f2a33" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={onClose} aria-label={closeLabel} title={closeLabel} style={{ ...navBtn, width: 44, height: 44, color: "#f2f5f8" }}>←</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#7d8d9c", whiteSpace: "nowrap", overflow: "hidden" }}>
              <span style={{ fontWeight: 700, color: levelColor(topic.level), border: `1px solid ${levelColor(topic.level)}`, borderRadius: 6, padding: "0 5px", lineHeight: "15px" }}>{topic.level}</span>
              {topic.group && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{localize(topic.group, lang)}</span>}
              {due && <span style={{ color: ACCENT, fontWeight: 700 }}>· 📅 fällig</span>}
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 800, color: "#f2f5f8", lineHeight: 1.25, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{title}</h2>
          </div>
          <button type="button" onClick={() => prev && onGo(prev.key)} disabled={!prev} aria-label={prev ? `Vorheriges Thema: ${localize(prev.title, lang)}` : "Kein vorheriges Thema"} style={{ ...navBtn, opacity: prev ? 1 : 0.35 }}>‹</button>
          <button type="button" onClick={() => next && onGo(next.key)} disabled={!next} aria-label={next ? `Nächstes Thema: ${localize(next.title, lang)}` : "Kein nächstes Thema"} style={{ ...navBtn, opacity: next ? 1 : 0.35 }}>›</button>
        </div>
        {tabs.length > 1 && (
          <div role="tablist" aria-label="Thema" style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {tabs.map(([key, label, count]) => {
              const on = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={`grammar-${topic.key}-${key}`}
                  onClick={() => pickTab(key)}
                  style={{
                    flex: 1, minWidth: 0, minHeight: 40, padding: "4px 6px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                    border: on ? "none" : "1px solid #2c3a47", background: on ? ACCENT : "#1a232b", color: on ? "#0e1419" : "#9ab0c2",
                  }}
                >{label}{count != null && <span style={{ fontWeight: 600, opacity: 0.8 }}> {count}</span>}</button>
              );
            })}
          </div>
        )}
      </div>

      <div {...panel("regel")}>
        <TopicBody topic={topic} lang={lang} onGlossary={topic.key !== GLOSSARY_KEY ? () => onGo(GLOSSARY_KEY) : null} />
        <div style={{ ...sectionLabel, margin: "16px 0 8px" }}>BEISPIELE</div>
        {topic.examples.map((ex, i) => (
          <div key={i} style={{ marginBottom: i === topic.examples.length - 1 ? 0 : 10, padding: "8px 12px", borderRadius: 10, background: "#161d24" }}>
            <div style={{ fontSize: 14, color: "#f2f5f8", fontStyle: "italic" }}>
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
        {exercises.length > 0 && (
          <button
            type="button"
            onClick={() => pickTab("ueben")}
            style={{ display: "block", width: "100%", marginTop: 16, minHeight: 44, borderRadius: 12, border: "none", background: ACCENT, color: "#0e1419", fontSize: 14, fontWeight: 800, cursor: "pointer" }}
          >✏️ Jetzt üben · {exercises.length} Fragen →</button>
        )}
        {words.length > 0 && (
          <button
            type="button"
            onClick={() => pickTab("woerter")}
            style={{ display: "block", width: "100%", marginTop: 8, minHeight: 44, borderRadius: 12, border: "1px solid #2c3a47", background: "#1a232b", color: "#cdd8e2", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >🗂 Deine Wörter dazu · {words.length} →</button>
        )}
        <div style={{ ...sectionLabel, marginTop: 20, textAlign: "center" }}>MEHR DAZU</div>
        <LookupLinks links={topicLinks(titleDe)} question={topicQuestion(titleDe)} aiSubject={topicSubject(titleDe)} />
      </div>

      {exercises.length > 0 && (
        <div {...panel("ueben")}>
          <GrammarExercises items={exercises} lang={lang} best={best} onDone={onScore} onAnswer={onAnswer} />
        </div>
      )}

      {words.length > 0 && (
        <div {...panel("woerter")}>
          <div style={{ ...sectionLabel, marginBottom: 8 }}>DEINE WÖRTER ({words.length}) · antippen für die Karte</div>
          <TopicWords words={words} lang={lang} onOpenChapter={onOpenChapter} />
        </div>
      )}

      {(prev || next) && (
        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {[["‹", prev], ["›", next]].map(([arrow, t]) => (
            <button
              key={arrow}
              type="button"
              disabled={!t}
              onClick={() => t && onGo(t.key)}
              style={{ flex: 1, minWidth: 0, minHeight: 48, padding: "6px 10px", borderRadius: 12, border: "1px solid #2c3a47", background: "#161d24", color: "#9ab0c2", fontSize: 12, cursor: t ? "pointer" : "default", opacity: t ? 1 : 0.35, textAlign: arrow === "‹" ? "left" : "right" }}
            >
              <div style={{ fontSize: 11, color: "#7d8d9c" }}>{arrow === "‹" ? "‹ Vorheriges" : "Nächstes ›"}</div>
              <div style={{ fontWeight: 700, color: "#cdd8e2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t ? localize(t.title, lang) : "–"}</div>
            </button>
          ))}
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

const topicShape = PropTypes.shape({
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
});

GrammarTopicPage.propTypes = {
  topic: topicShape.isRequired,
  words: PropTypes.arrayOf(grammarWordShape),
  lang: PropTypes.string,
  exercises: PropTypes.array,
  best: PropTypes.number,
  due: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  closeLabel: PropTypes.string.isRequired,
  prev: topicShape,
  next: topicShape,
  onGo: PropTypes.func.isRequired,
  onScore: PropTypes.func,
  onAnswer: PropTypes.func,
  onOpenChapter: PropTypes.func,
};

// one line of the topic list: level, title, and what's there (📅 due,
// best ✏️ score, word count); a tap opens the topic's page
function TopicRow({ topic, lang, words = 0, exercises = 0, best, due, onOpen }) {
  return (
    <button
      type="button"
      id={`grammar-topic-${topic.key}`}
      onClick={onOpen}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10, marginBottom: 8, minHeight: 52, scrollMarginTop: 64,
        padding: "10px 12px 10px 14px", borderRadius: 12, border: `1px solid ${due ? "#6b4a2c" : "#2c3a47"}`, background: "#161d24", cursor: "pointer", textAlign: "left",
      }}
    >
      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: levelColor(topic.level), border: `1px solid ${levelColor(topic.level)}`, borderRadius: 6, padding: "2px 6px" }}>
        {topic.level}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#f2f5f8", lineHeight: 1.3 }}>{localize(topic.title, lang)}</span>
        {(due || best != null || words > 0) && (
          <span style={{ display: "flex", flexWrap: "wrap", gap: "0 10px", marginTop: 3, fontSize: 11, color: "#7d8d9c" }}>
            {due && <span style={{ color: ACCENT, fontWeight: 700 }}>📅 fällig</span>}
            {best != null && <span style={{ color: best === exercises ? "#5fa85f" : "#9ab0c2" }}>✏️ {best}/{exercises}</span>}
            {words > 0 && <span>{words} {words === 1 ? "Wort" : "Wörter"}</span>}
          </span>
        )}
      </span>
      <span aria-hidden="true" style={{ flexShrink: 0, color: "#7d8d9c", fontSize: 18 }}>›</span>
    </button>
  );
}

TopicRow.propTypes = {
  topic: topicShape.isRequired,
  lang: PropTypes.string,
  words: PropTypes.number,
  exercises: PropTypes.number,
  best: PropTypes.number,
  due: PropTypes.bool,
  onOpen: PropTypes.func.isRequired,
};

// best ✏️ Üben score per topic: { [key]: number }, kept in localStorage
const readScores = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.GRAMMAR_SCORES)) || {}; } catch { return {}; }
};

// The Grammatik tab: a short list of topics with group chips on top (they
// stay on screen and filter the list: Alle · 📅 fällig · one group), or one
// topic as its own page (GrammarTopicPage).
// openKey / onOpenTopic(key | null): the open topic, kept in App.jsx so the
// phone's back gesture can close it.
// focus: { key, n } - set when something outside opened a topic (a card's
// grammar chip, a search result, the 🎯 plan); onBack: return there, with
// backLabel on the button.
// onOpenChapter(deck, front): show a word's card in its chapter.
// onExerciseAnswer(topicKey, item, correct): every ✏️ Üben answer (Fehlerheft).
// dueKeys: topics whose review is due (engine/grammarReview.js);
// onExerciseDone(topicKey, right, total): a finished ✏️ Üben round.
function GrammarView({ topics, words = {}, lang = "en", openKey = null, onOpenTopic, focus, onBack, backLabel = "← Zurück", onOpenChapter, onExerciseAnswer, dueKeys = [], onExerciseDone }) {
  const [scores, setScores] = useState(readScores);
  const [filter, setFilter] = useState("all"); // all | due | a group's German name
  const saveScore = (key, score) => {
    setScores((prev) => {
      if (prev[key] != null && prev[key] >= score) return prev;
      const next = { ...prev, [key]: score };
      try { localStorage.setItem(STORAGE_KEYS.GRAMMAR_SCORES, JSON.stringify(next)); } catch { /* storage off */ }
      return next;
    });
  };
  const topRef = useRef(null);
  // A topic opens at its top; closing it returns to its row in the list.
  const lastOpen = useRef(openKey);
  useEffect(() => {
    const closed = lastOpen.current;
    lastOpen.current = openKey;
    const el = openKey ? topRef.current : closed && document.getElementById(`grammar-topic-${closed}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (openKey && top >= 0 && top < window.innerHeight * 0.3) return;
    if (openKey) window.scrollTo({ top: Math.max(0, window.scrollY + top - 8) });
    else el.scrollIntoView({ block: "center" });
  }, [openKey, focus]);

  const groups = [];
  for (const t of topics) {
    const g = t.group ? localize(t.group, "de") : "";
    const last = groups[groups.length - 1];
    if (last && last.key === g) last.topics.push(t);
    else groups.push({ key: g, label: t.group ? localize(t.group, lang) : "", topics: [t] });
  }

  const open = openKey && topics.find((t) => t.key === openKey);
  if (open) {
    const i = topics.indexOf(open);
    return (
      <div ref={topRef}>
        <GrammarTopicPage
          key={open.key}
          topic={open}
          words={words[open.key]}
          lang={lang}
          exercises={GRAMMAR_EXERCISES[open.key]}
          best={scores[open.key]}
          due={dueKeys.includes(open.key)}
          onClose={onBack || (() => onOpenTopic(null))}
          closeLabel={onBack ? backLabel.replace(/^← /, "") : "Alle Themen"}
          prev={topics[i - 1]}
          next={topics[i + 1]}
          onGo={(key) => onOpenTopic(key)}
          onScore={(score) => { saveScore(open.key, score); if (onExerciseDone) onExerciseDone(open.key, score, (GRAMMAR_EXERCISES[open.key] || []).length); }}
          onOpenChapter={onOpenChapter}
          onAnswer={onExerciseAnswer ? (item, correct) => onExerciseAnswer(open.key, item, correct) : undefined}
        />
      </div>
    );
  }

  const chips = [
    ["all", "Alle", topics.length],
    dueKeys.length > 0 && ["due", "📅 fällig", dueKeys.length],
    ...groups.filter((g) => g.key).map((g) => [g.key, g.label, g.topics.length]),
  ].filter(Boolean);
  const active = chips.some(([k]) => k === filter) ? filter : "all";
  const shown = active === "all" ? groups
    : active === "due" ? [{ key: "due", label: "", topics: topics.filter((t) => dueKeys.includes(t.key)) }]
    : groups.filter((g) => g.key === active).map((g) => ({ ...g, label: "" }));
  const row = (topic) => (
    <TopicRow
      key={topic.key}
      topic={topic}
      lang={lang}
      words={(words[topic.key] || []).length}
      exercises={(GRAMMAR_EXERCISES[topic.key] || []).length}
      best={scores[topic.key]}
      due={dueKeys.includes(topic.key)}
      onOpen={() => onOpenTopic(topic.key)}
    />
  );
  return (
    <div ref={topRef}>
      {onBack && (
        <button
          onClick={onBack}
          style={{ position: "sticky", top: 8, zIndex: 4, marginBottom: 12, background: ACCENT, border: "none", borderRadius: 10, padding: "8px 14px", minHeight: 40, color: "#0e1419", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.5)" }}
        >{backLabel}</button>
      )}
      <div style={{ fontSize: 12, color: "#8fb8d8", textAlign: "center", marginBottom: 4 }}>
        📖 Grammatik · {topics.length} Themen
        {dueKeys.length > 0 && <span style={{ color: ACCENT, fontWeight: 700 }}> · 📅 {dueKeys.length} heute fällig</span>}
      </div>
      <div style={{ position: "sticky", top: 0, zIndex: 3, background: "#0e1419", margin: "0 -16px 8px", padding: "8px 0" }}>
        <div role="tablist" aria-label="Gruppen" className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 16px" }}>
          {chips.map(([key, label, n]) => {
            const on = active === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => { setFilter(key); if (topRef.current && topRef.current.getBoundingClientRect().top < 0) topRef.current.scrollIntoView({ block: "start" }); }}
                style={{
                  flexShrink: 0, minHeight: 36, padding: "6px 12px", borderRadius: 18, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  border: on ? "none" : `1px solid ${key === "due" ? "#6b4a2c" : "#2c3a47"}`,
                  background: on ? ACCENT : "#1a232b", color: on ? "#0e1419" : key === "due" ? ACCENT : "#9ab0c2",
                }}
              >{label} <span style={{ fontWeight: 600, opacity: 0.75 }}>{n}</span></button>
            );
          })}
        </div>
      </div>
      {shown.map((g, gi) => (
        <Fragment key={g.key || gi}>
          {g.label && (
            <h3 style={{ margin: gi === 0 ? "4px 2px 8px" : "18px 2px 8px", fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: ACCENT }}>
              {g.label} <span style={{ color: "#7d8d9c", fontWeight: 600 }}>· {g.topics.length}</span>
            </h3>
          )}
          {g.topics.map(row)}
        </Fragment>
      ))}
    </div>
  );
}

GrammarView.propTypes = {
  topics: PropTypes.arrayOf(topicShape).isRequired,
  words: PropTypes.objectOf(PropTypes.arrayOf(grammarWordShape)),
  lang: PropTypes.string,
  openKey: PropTypes.string,
  onOpenTopic: PropTypes.func.isRequired,
  focus: PropTypes.shape({ key: PropTypes.string.isRequired, n: PropTypes.number }),
  onBack: PropTypes.func,
  backLabel: PropTypes.string,
  onOpenChapter: PropTypes.func,
  onExerciseAnswer: PropTypes.func,
  dueKeys: PropTypes.arrayOf(PropTypes.string),
  onExerciseDone: PropTypes.func,
};

export default GrammarView;
