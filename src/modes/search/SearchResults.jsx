import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FlipCard, NoResults } from "../../components";
import { GENDER_COLORS } from "../../constants";
import { DECK_META } from "../../data";
import { idOf, matchRanges, MIN_QUERY } from "../../engine";
import { localize } from "../grammar/richText";

// App-wide search results (see engine/globalSearch.js): grammar topics
// first - there are few and each opens its page - then cards from every
// deck. A card row opens into the full card right there (flip, audio,
// ✓ Gekonnt / Üben, grammar chips), so the learner never has to leave the
// search to study what they found.

const ACCENT = "#e0833b";
const PAGE = 20;

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

function SearchResults({ query, cards, topics, lang, onOpenTopic, onOpenChapter }) {
  const [open, setOpen] = useState(null); // index of the opened card
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { setOpen(null); setShown(PAGE); }, [query]);

  const q = query.trim();
  if (q.length < MIN_QUERY) {
    return <div role="status" style={{ textAlign: "center", padding: "40px 20px", color: "#7d8d9c", fontSize: 13 }}>Mindestens {MIN_QUERY} Buchstaben eingeben …</div>;
  }
  if (!cards.length && !topics.length) return <NoResults q={q} />;

  return (
    <div>
      <div role="status" style={{ fontSize: 12, color: "#7d8d9c", textAlign: "center" }}>
        Alle Themen · {cards.length} {cards.length === 1 ? "Karte" : "Karten"} · {topics.length} Grammatik
      </div>

      {topics.length > 0 && (
        <>
          <div style={sectionTitle}>📖 Grammatik</div>
          {topics.map(({ topic, snippet }) => {
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
        </>
      )}

      {cards.length > 0 && (
        <>
          <div style={sectionTitle}>🃏 Karten</div>
          {cards.slice(0, shown).map((card, i) => {
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
                  <div style={{ margin: "4px 0 14px" }}>
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
                      <button type="button" onClick={() => onOpenChapter(card.deck)} style={{ display: "block", margin: "8px auto 0", background: "none", border: "none", color: "#8fb8d8", fontSize: 13, cursor: "pointer" }}>
                        {meta.icon} {meta.label} öffnen →
                      </button>
                    )}
                  </div>
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
};
Marked.propTypes = { text: PropTypes.string, q: PropTypes.string.isRequired };
CardFront.propTypes = { card: PropTypes.object.isRequired, q: PropTypes.string.isRequired };

export default SearchResults;
