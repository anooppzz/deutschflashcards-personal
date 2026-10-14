import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FlipCard, Reveal } from "../../components";
import WordLookup from "../../components/WordLookup";
import { GENDER_COLORS } from "../../constants";
import { DECK_META } from "../../data";
import { idOf, matchRanges, MIN_QUERY } from "../../engine";
import { localize } from "../grammar/richText";

// App-wide search results (see engine/globalSearch.js): grammar topics
// first - there are few and each opens its page - then cards from every
// deck. A card row opens into the full card right there (flip, audio,
// ✓ Gekonnt / Üben, grammar chips), so the learner never has to leave the
// search to study what they found. A word that isn't in the app gets the
// lookup panel (components/WordLookup.jsx: quick meaning, dictionaries, AI,
// 📌 suggest as a card); with results, "Nicht dabei?" opens the same panel.
// Shown inside the full-screen search layer (SearchOverlay.jsx). With both
// kinds of results, tabs on top switch between Alle / Karten / Grammatik;
// "Alle" shows the first GRAMMAR_PREVIEW topics, then the cards.

const ACCENT = "#e0833b";
const PAGE = 20;
const GRAMMAR_PREVIEW = 3;

// text with every occurrence of q highlighted
function Marked({ text, q }) {
  if (!text) return null;
  const ranges = matchRanges(text, q);
  if (!ranges.length) return text;
  const parts = [];
  let at = 0;
  ranges.forEach(([s, e], i) => {
    if (s > at) parts.push(text.slice(at, s));
    parts.push(<mark key={i} style={{ background: "rgba(224,131,59,.25)", color: "inherit", borderRadius: 3, padding: "0 1px" }}>{text.slice(s, e)}</mark>);
    at = e;
  });
  if (at < text.length) parts.push(text.slice(at));
  return parts;
}

// a short window of a long text around its first match
const around = (text, q, before = 40, after = 70) => {
  const [first] = matchRanges(text, q);
  if (!first || text.length <= before + after + 20) return text;
  const start = Math.max(0, first[0] - before);
  const end = Math.min(text.length, first[1] + after);
  return `${start > 0 ? "… " : ""}${text.slice(start, end).trim()}${end < text.length ? " …" : ""}`;
};

const sectionTitle = { margin: "18px 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#7d8d9c", textTransform: "uppercase" };
const rowStyle = {
  display: "flex", width: "100%", boxSizing: "border-box", alignItems: "center", gap: 10, textAlign: "left",
  padding: "10px 12px", marginBottom: 6, borderRadius: 12, border: "1px solid #2c3a47", background: "#1a232b",
  color: "#f2f5f8", cursor: "pointer", font: "inherit",
};
const chipStyle = { flexShrink: 0, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, color: "#8fb8d8", background: "#16202a", borderRadius: 8, padding: "2px 7px" };

function CardFront({ card, q }) {
  const m = card.type === "n" && card.gender && card.front.match(/^(der\/die|der|die|das)\s+(.*)$/);
  if (!m) return <Marked text={card.front} q={q} />;
  return (
    <>
      <span style={{ color: GENDER_COLORS[m[1]] || "#9ab0c2" }}>{m[1]}</span>{" "}
      <Marked text={m[2]} q={q} />
    </>
  );
}

function SearchResults({ query, cards, topics, lang, onOpenTopic, onOpenChapter, onSuggestCard }) {
  const [open, setOpen] = useState(null); // index of the opened card
  const [shown, setShown] = useState(PAGE);
  const [lookup, setLookup] = useState(false); // "Nicht dabei?" panel
  const [tab, setTab] = useState("all"); // all | cards | grammar
  useEffect(() => { setOpen(null); setShown(PAGE); setLookup(false); setTab("all"); }, [query]);

  const q = query.trim();
  if (!q) {
    return <div role="status" style={{ textAlign: "center", padding: "40px 20px", color: "#7d8d9c", fontSize: 14, lineHeight: 1.6 }}>Ein Wort eingeben – Deutsch oder Englisch.<br />Gesucht wird in allen Kapiteln und der Grammatik.</div>;
  }
  if (q.length < MIN_QUERY) {
    return <div role="status" style={{ textAlign: "center", padding: "40px 20px", color: "#7d8d9c", fontSize: 13 }}>Mindestens {MIN_QUERY} Buchstaben eingeben …</div>;
  }
  if (!cards.length && !topics.length) return <WordLookup q={q} missing onSuggest={onSuggestCard} />;

  const both = cards.length > 0 && topics.length > 0;
  const showTopics = tab === "cards" ? [] : tab === "all" ? topics.slice(0, GRAMMAR_PREVIEW) : topics;
  const showCards = tab === "grammar" ? [] : cards;
  const tabs = [
    ["all", "Alle", cards.length + topics.length],
    ["cards", "🃏 Karten", cards.length],
    ["grammar", "📖 Grammatik", topics.length],
  ];

  return (
    <div>
      {both ? (
        <div role="tablist" aria-label="Ergebnisse" style={{ display: "flex", gap: 6 }}>
          {tabs.map(([key, label, n]) => {
            const on = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(key)}
                style={{
                  flex: key === "all" ? "0 0 auto" : 1, minHeight: 40, padding: "6px 12px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  border: on ? "none" : "1px solid #2c3a47", background: on ? ACCENT : "#1a232b", color: on ? "#0e1419" : "#9ab0c2",
                }}
              >{label} <span style={{ fontWeight: 600, opacity: 0.8 }}>{n}</span></button>
            );
          })}
        </div>
      ) : (
        <div role="status" style={{ fontSize: 12, color: "#7d8d9c", textAlign: "center" }}>
          {cards.length ? `${cards.length} ${cards.length === 1 ? "Karte" : "Karten"}` : `${topics.length} Grammatik`} · alle Kapitel
        </div>
      )}

      {showTopics.length > 0 && (
        <>
          <div style={sectionTitle}>📖 Grammatik</div>
          {showTopics.map(({ topic, snippet }) => {
            const title = localize(topic.title, lang);
            const showSnippet = snippet && snippet !== title && !snippet.startsWith(title);
            return (
              <button key={topic.key} type="button" onClick={() => onOpenTopic(topic.key)} style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                <span style={{ display: "flex", gap: 8, alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}><Marked text={title} q={q} /></span>
                  {topic.group && <span style={chipStyle}>{localize(topic.group, lang)}</span>}
                </span>
                {showSnippet && <span style={{ fontSize: 12, color: "#9ab0c2", lineHeight: 1.45 }}><Marked text={around(snippet, q)} q={q} /></span>}
              </button>
            );
          })}
          {tab === "all" && topics.length > GRAMMAR_PREVIEW && (
            <button type="button" onClick={() => setTab("grammar")} style={{ ...rowStyle, justifyContent: "center", color: "#8fb8d8", fontSize: 13, fontWeight: 700 }}>
              Alle {topics.length} Grammatik-Treffer →
            </button>
          )}
        </>
      )}

      {showCards.length > 0 && (
        <>
          <div style={sectionTitle}>🃏 Karten</div>
          {showCards.slice(0, shown).map((card, i) => {
            const meta = DECK_META[card.deck];
            const isOpen = open === i;
            return (
              <div key={`${card.deck}|${card.front}`}>
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)} style={{ ...rowStyle, borderColor: isOpen ? ACCENT : "#2c3a47" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}><CardFront card={card} q={q} /></span>
                    <span style={{ display: "block", fontSize: 12, color: "#9ab0c2", marginTop: 2 }}>
                      <Marked text={card.english} q={q} />
                      {card.sub && <span style={{ color: "#6f8293" }}> · <Marked text={card.sub} q={q} /></span>}
                    </span>
                  </span>
                  {meta && <span style={chipStyle}>{meta.icon} {meta.label}</span>}
                </button>
                {isOpen && (
                  <Reveal style={{ margin: "4px 0 14px" }}>
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
                    {meta && (
                      <button type="button" onClick={() => onOpenChapter(card.deck, card.front)} style={{ display: "block", margin: "8px auto 0", background: "none", border: "none", color: "#8fb8d8", fontSize: 13, cursor: "pointer" }}>
                        {meta.icon} {meta.label} öffnen →
                      </button>
                    )}
                  </Reveal>
                )}
              </div>
            );
          })}
          {cards.length > shown && (
            <button type="button" onClick={() => setShown(shown + PAGE)} style={{ ...rowStyle, justifyContent: "center", color: "#9ab0c2", fontSize: 13 }}>
              Mehr zeigen ({cards.length - shown} weitere)
            </button>
          )}
        </>
      )}

      <button type="button" aria-expanded={lookup} onClick={() => setLookup((v) => !v)} style={{ ...rowStyle, justifyContent: "center", marginTop: 14, border: "1px dashed #3a5670", background: "transparent", color: "#8fb8d8", fontSize: 13, fontWeight: 700 }}>
        Nicht dabei? „{q}“ nachschlagen {lookup ? "▴" : "▾"}
      </button>
      {lookup && <WordLookup q={q} onSuggest={onSuggestCard} />}
    </div>
  );
}

const textShape = PropTypes.oneOfType([PropTypes.string, PropTypes.objectOf(PropTypes.string)]);

SearchResults.propTypes = {
  query: PropTypes.string.isRequired,
  cards: PropTypes.arrayOf(PropTypes.shape({
    deck: PropTypes.string.isRequired,
    front: PropTypes.string.isRequired,
    english: PropTypes.string,
    sub: PropTypes.string,
  })).isRequired,
  topics: PropTypes.arrayOf(PropTypes.shape({
    topic: PropTypes.shape({ key: PropTypes.string.isRequired, title: textShape, group: textShape }).isRequired,
    snippet: PropTypes.string,
  })).isRequired,
  lang: PropTypes.string,
  onOpenTopic: PropTypes.func.isRequired,
  onOpenChapter: PropTypes.func.isRequired,
  onSuggestCard: PropTypes.func.isRequired,
};
Marked.propTypes = { text: PropTypes.string, q: PropTypes.string.isRequired };
CardFront.propTypes = { card: PropTypes.object.isRequired, q: PropTypes.string.isRequired };

export default SearchResults;
