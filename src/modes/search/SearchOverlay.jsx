import { useEffect, useRef } from "react";
import PropTypes from "prop-types";

// 🔍 The app-wide search as a full-screen layer: the search box stays at the
// top and the results fill the screen right under it, so nothing (mode
// tabs, filters, the day plan) sits between the box and what was found.
// ← or the phone's back gesture (App.jsx backAction) closes it; the query is
// kept, so opening it again shows the same results. Dialogs opened from a
// result (✨ KI fragen: z 150, Modal: z 200) sit above it.
function SearchOverlay({ query, onQuery, onClose, children }) {
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  // focus the box (keyboard up) and select an old query, so typing replaces it
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);
  // the page underneath must not scroll along
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  // a new query starts at the top of its results (not on opening: back from
  // a grammar topic puts the old position back)
  const firstQuery = useRef(true);
  useEffect(() => {
    if (firstQuery.current) { firstQuery.current = false; return; }
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [query]);

  return (
    <div
      ref={scrollRef}
      data-scroll-layer
      role="dialog"
      aria-modal="true"
      aria-label="Suche"
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "#0e1419", overflowY: "auto", overscrollBehavior: "contain", fontFamily: "system-ui, sans-serif" }}
    >
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: "#0e1419", borderBottom: "1px solid #1f2a33", padding: "calc(10px + env(safe-area-inset-top, 0px)) 12px 10px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Suche schließen"
            style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, border: "1px solid #2c3a47", background: "#1a232b", color: "#f2f5f8", fontSize: 18, cursor: "pointer" }}
          >←</button>
          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#7d8d9c", pointerEvents: "none" }}>🔍</span>
            <input
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              aria-label="Suchen in allen Wörtern und der Grammatik"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              // Enter/"Suchen" on the keyboard: hide the keyboard to see the results
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              placeholder="Wörter & Grammatik"
              style={{
                width: "100%", boxSizing: "border-box", height: 44, padding: "0 40px 0 34px",
                borderRadius: 12, border: "1px solid #e0833b", background: "#161d24",
                // 16px: smaller text makes iPhones zoom into the page on focus
                color: "#f2f5f8", fontSize: 16, outline: "none", appearance: "none",
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => { onQuery(""); if (inputRef.current) inputRef.current.focus(); }}
                aria-label="Suche löschen"
                style={{ position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, background: "none", border: "none", color: "#7d8d9c", fontSize: 20, cursor: "pointer" }}
              >×</button>
            )}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 16px calc(28px + env(safe-area-inset-bottom, 0px))" }}>
        {children}
      </div>
    </div>
  );
}

SearchOverlay.propTypes = {
  query: PropTypes.string.isRequired,
  onQuery: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default SearchOverlay;
