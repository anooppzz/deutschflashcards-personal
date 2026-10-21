import { useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { FlipCard } from "../../components";
import Reveal from "../../components/Reveal";
import { ProgressCtx } from "../../context/ProgressCtx";
import { ConjugationCtx } from "../../context/ConjugationCtx";
import { VERB_FORMS } from "../../data";
import { isKnownStability } from "../../engine";

// 📋 Wortlisten (data/lists/lists.json): word lists from other books, as a
// full-screen layer like the 🔍 search. Without openKey: the lists; with
// one: its table - the book's forms per row, the word's card on a tap
// (the same card as in its chapter, so ✓ Gekonnt there counts here) and
// "🃏 Lernen" to study the list in every mode. ← and the phone's back
// gesture (App.jsx backAction) step back.

const norm = (s) => s.toLowerCase().replace(/[()]/g, "");

function ListView({ lists, openKey, onOpen, onStudy, onClose, cardById, deckMeta, lang }) {
  const { progress } = useContext(ProgressCtx);
  const { openConjugation } = useContext(ConjugationCtx);
  const [filter, setFilter] = useState("");
  const [shown, setShown] = useState(null); // the row whose card is open
  const scrollRef = useRef(null);
  const list = lists.find((l) => l.key === openKey);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    setFilter("");
    setShown(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [openKey]);

  const known = (id) => isKnownStability(progress[id]?.stability || 0);
  const rows = useMemo(() => {
    if (!list) return [];
    const q = norm(filter.trim());
    return list.rows.filter((r) => {
      if (!q) return true;
      const card = cardById.get(r.cards[0]);
      return [r.inf, r.praes, r.praet, r.perf, r.example, card && card.english].some((t) => t && norm(t).includes(q));
    });
  }, [list, filter, cardById]);

  const header = (
    <div style={{ position: "sticky", top: 0, zIndex: 2, background: "#0e1419", borderBottom: "1px solid #1f2a33", padding: "calc(10px + env(safe-area-inset-top, 0px)) 12px 10px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={list ? () => onOpen(null) : onClose}
          aria-label={list ? "Zurück zu den Listen" : "Wortlisten schließen"}
          style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, border: "1px solid #2c3a47", background: "#1a232b", color: "#f2f5f8", fontSize: 18, cursor: "pointer" }}
        >←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#f2f5f8", lineHeight: 1.25 }}>
            {list ? `${list.icon} ${list.label}` : "📋 Wortlisten"}
          </div>
          <div style={{ fontSize: 12, color: "#7d8d9c" }}>{list ? `📖 ${list.source} · ${list.rows.length} Wörter` : "Wörter aus anderen Büchern"}</div>
        </div>
        {list && (
          <button
            type="button"
            onClick={() => onStudy(list.key)}
            style={{ flexShrink: 0, minHeight: 44, padding: "0 14px", borderRadius: 12, border: "none", background: "#e0833b", color: "#0e1419", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
          >🃏 Lernen</button>
        )}
      </div>
      {list && (
        <div style={{ maxWidth: 480, margin: "8px auto 0" }}>
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            placeholder="In der Liste suchen"
            aria-label="In der Liste suchen"
            style={{ width: "100%", boxSizing: "border-box", height: 40, padding: "0 12px", borderRadius: 10, border: "1px solid #2c3a47", background: "#161d24", color: "#f2f5f8", fontSize: 15 }}
          />
        </div>
      )}
    </div>
  );

  // the lists themselves
  const overview = (
    <>
      <p style={{ fontSize: 13, color: "#9ab0c2", lineHeight: 1.5, margin: "4px 0 14px" }}>
        Each word stays in its own chapter. A list only collects them: progress is shared, and the book shows up in the 📖 source filter of every chapter.
      </p>
      {lists.map((l) => {
        const done = l.rows.filter((r) => known(r.cards[0])).length;
        return (
          <button
            key={l.key}
            type="button"
            onClick={() => onOpen(l.key)}
            style={{
              display: "flex", width: "100%", alignItems: "center", gap: 12, marginBottom: 10, minHeight: 64, padding: "10px 14px",
              borderRadius: 12, border: "1px solid #2c3a47", background: "#1a232b", color: "#f2f5f8", cursor: "pointer", textAlign: "left", font: "inherit",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 24 }}>{l.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{l.label}</span>
              <span style={{ display: "block", fontSize: 12, color: "#7d8d9c" }}>📖 {l.source} · {l.rows.length} Wörter · ✓ {done} gekonnt</span>
            </span>
            <span aria-hidden="true" style={{ color: "#7d8d9c", fontSize: 18 }}>›</span>
          </button>
        );
      })}
    </>
  );

  const rowView = (r, i) => {
    const id = r.cards[0];
    const card = cardById.get(id);
    const open = shown === id;
    const meta = card && deckMeta[card.deck];
    return (
      <div key={`${r.inf}-${i}`} style={{ borderTop: "1px solid #1f2a33" }}>
        <button
          type="button"
          onClick={() => setShown(open ? null : id)}
          aria-expanded={open}
          style={{ display: "block", width: "100%", padding: "9px 4px", background: "none", border: "none", color: "#f2f5f8", cursor: "pointer", textAlign: "left", font: "inherit" }}
        >
          <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span aria-label={known(id) ? "gekonnt" : undefined} style={{ fontSize: 15, fontWeight: 700 }}>{known(id) ? "✓ " : ""}{r.inf}</span>
            {card && <span style={{ fontSize: 13, color: "#9ab0c2" }}>{card.english}</span>}
            {meta && <span style={{ marginLeft: "auto", fontSize: 11, color: "#7d8d9c", whiteSpace: "nowrap" }}>{meta.icon} {meta.label}</span>}
          </span>
          {r.perf && (
            <span style={{ display: "block", marginTop: 2, fontSize: 14, color: "#e8c39e" }}>
              {r.praes} · {r.praet} · {r.perf}
            </span>
          )}
          {r.example && (
            <span style={{ display: "block", marginTop: 2, fontSize: 14, color: "#e8c39e" }}>
              {r.example}
              <span style={{ display: "block", fontSize: 12, color: "#7d8d9c" }}>{r.en}</span>
            </span>
          )}
        </button>
        {open && card && (
          <Reveal style={{ margin: "4px 0 14px" }}>
            {openConjugation && VERB_FORMS.has(id) && (
              <button
                type="button"
                onClick={() => openConjugation(id)}
                style={{ display: "block", margin: "0 0 8px", padding: "6px 12px", borderRadius: 8, border: "1px solid #6b5a44", background: "transparent", color: "#e8c39e", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >📊 Alle Formen von {r.inf}</button>
            )}
            <FlipCard
              front={card.front}
              sub={card.sub}
              english={card.english}
              example={card.example}
              exampleEn={card.exampleEn}
              type={card.type}
              gender={card.gender}
              deck={card.deck}
              cardId={id}
              lang={lang}
              level={card.level}
              source={card.source}
              sources={card.sources}
              note={card.note}
            />
          </Reveal>
        )}
      </div>
    );
  };

  // a list's rows, under its group headings (Akkusativ und Dativ · Dativ)
  const table = list && (
    <>
      {list.note && <p style={{ fontSize: 12, color: "#7d8d9c", margin: "4px 0 10px" }}>{list.note} · tap a word for its card</p>}
      {rows.length === 0 && <p style={{ fontSize: 14, color: "#9ab0c2" }}>Nichts gefunden.</p>}
      {rows.map((r, i) => (
        <div key={`${r.inf}-${i}`}>
          {r.group && (i === 0 || rows[i - 1].group !== r.group) && (
            <div style={{ margin: "14px 0 4px", fontSize: 12, fontWeight: 800, letterSpacing: 0.4, color: "#8fb8d8" }}>{r.group.toUpperCase()}</div>
          )}
          {rowView(r, i)}
        </div>
      ))}
    </>
  );

  return (
    <div
      ref={scrollRef}
      role="dialog"
      aria-modal="true"
      aria-label="Wortlisten"
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "#0e1419", overflowY: "auto", overscrollBehavior: "contain", fontFamily: "system-ui, sans-serif" }}
    >
      {header}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "10px 16px 40px" }}>
        {list ? table : overview}
      </div>
    </div>
  );
}

ListView.propTypes = {
  lists: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    icon: PropTypes.string,
    label: PropTypes.string.isRequired,
    source: PropTypes.string.isRequired,
    note: PropTypes.string,
    rows: PropTypes.array.isRequired,
  })).isRequired,
  openKey: PropTypes.string,
  onOpen: PropTypes.func.isRequired,
  onStudy: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  cardById: PropTypes.instanceOf(Map).isRequired,
  deckMeta: PropTypes.object.isRequired,
  lang: PropTypes.string,
};

export default ListView;
