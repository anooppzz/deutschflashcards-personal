import { useState, useRef, useCallback, useLayoutEffect } from "react";
import PropTypes from "prop-types";

// Drag-to-select word search grid. Deliberately does NOT use per-cell
// onPointerEnter to track the drag path - that pattern works for mouse but
// is unreliable for touch, since a touch drag captures to its starting
// element and doesn't naturally fire enter events on other elements as the
// finger moves. Instead, pointermove is handled once at the container
// level and uses document.elementFromPoint to find whatever cell is
// currently under the finger/cursor - this works identically for mouse
// and touch.
const DIRECTIONS = [
  { dr: 0, dc: 1 }, { dr: 0, dc: -1 },
  { dr: 1, dc: 0 }, { dr: -1, dc: 0 },
  { dr: 1, dc: 1 }, { dr: -1, dc: -1 },
  { dr: 1, dc: -1 }, { dr: -1, dc: 1 },
];
// The grid only ever PLACES words in 4 forward directions (see buildGrid.js),
// but the player is allowed to DRAG from either end of a placed word - so
// selection itself checks all 8 directions; matching against placements
// then accepts the drag read forwards OR backwards.

const straightPath = (start, end) => {
  const dr = end.row - start.row;
  const dc = end.col - start.col;
  const dir = DIRECTIONS.find((d) => {
    if (d.dr === 0) return dr === 0 && Math.sign(dc) === d.dc;
    if (d.dc === 0) return dc === 0 && Math.sign(dr) === d.dr;
    return Math.sign(dr) === d.dr && Math.sign(dc) === d.dc && Math.abs(dr) === Math.abs(dc);
  });
  if (!dir) return null;
  const len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
  return Array.from({ length: len }, (_, i) => ({ row: start.row + dir.dr * i, col: start.col + dir.dc * i }));
};

const pathsMatch = (a, b) =>
  a.length === b.length && a.every((cell, i) => cell.row === b[i].row && cell.col === b[i].col);

function WordSearchGrid({ grid, size, placements, foundWords, onFound, revealed }) {
  const [dragPath, setDragPath] = useState(null);
  const dragStartRef = useRef(null);
  const containerRef = useRef(null);
  // The grid always fits the width it has: on a phone a 14×14 grid with
  // fixed cells was wider than the screen, had to be scrolled, and a word
  // across the whole width couldn't be dragged at all.
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cellFromPoint = useCallback((clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    const cellEl = el && el.closest ? el.closest("[data-row]") : null;
    if (!cellEl) return null;
    return { row: Number(cellEl.dataset.row), col: Number(cellEl.dataset.col) };
  }, []);

  const finishDrag = useCallback((path) => {
    if (path && path.length > 1) {
      const reversed = [...path].reverse();
      const hit = placements.find(
        (p) => !foundWords.has(p.word) && (pathsMatch(p.path, path) || pathsMatch(p.path, reversed))
      );
      if (hit) onFound(hit.word);
    }
    setDragPath(null);
    dragStartRef.current = null;
  }, [placements, foundWords, onFound]);

  const handlePointerDown = (row, col) => (e) => {
    e.preventDefault();
    dragStartRef.current = { row, col };
    setDragPath([{ row, col }]);
  };

  const handlePointerMove = (e) => {
    if (!dragStartRef.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    const path = straightPath(dragStartRef.current, cell);
    if (path) setDragPath(path);
  };

  const handlePointerUp = () => finishDrag(dragPath);

  const inPath = (row, col, path) => !!path && path.some((c) => c.row === row && c.col === col);
  const foundCells = placements.filter((p) => foundWords.has(p.word)).flatMap((p) => p.path);
  const revealedCells = revealed ? placements.filter((p) => !foundWords.has(p.word)).flatMap((p) => p.path) : [];

  const GAP = 2;
  const cellSizePx = width ? Math.max(14, Math.min(38, Math.floor((width - GAP * (size - 1)) / size))) : 24;

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => finishDrag(null)}
      onPointerLeave={() => { if (dragStartRef.current) finishDrag(dragPath); }}
      role="application"
      aria-label="Wortgitter - Wort durch Ziehen markieren"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${size}, ${cellSizePx}px)`,
        gap: GAP,
        justifyContent: "center",
        touchAction: "none",
        userSelect: "none",
        margin: "0 auto",
      }}
    >
      {grid.map((rowArr, r) =>
        rowArr.map((letter, c) => {
          const selected = inPath(r, c, dragPath);
          const isFound = foundCells.some((cell) => cell.row === r && cell.col === c);
          const isRevealed = revealedCells.some((cell) => cell.row === r && cell.col === c);
          return (
            <div
              key={`${r}-${c}`}
              data-row={r}
              data-col={c}
              onPointerDown={handlePointerDown(r, c)}
              aria-hidden="true"
              style={{
                width: cellSizePx, height: cellSizePx,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: cellSizePx < 24 ? 4 : 6, fontSize: Math.max(10, Math.round(cellSizePx * 0.55)), fontWeight: 700,
                cursor: "pointer",
                background: isFound ? "#5fa85f" : selected ? "#e0833b" : isRevealed ? "#3a4553" : "#161d24",
                color: isFound || selected ? "#0e1419" : "#cdd8e2",
                border: isRevealed && !isFound ? "1px dashed #7d8d9c" : "1px solid #2c3a47",
              }}
            >{letter}</div>
          );
        })
      )}
    </div>
    </div>
  );
}

WordSearchGrid.propTypes = {
  grid: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  size: PropTypes.number.isRequired,
  placements: PropTypes.arrayOf(
    PropTypes.shape({
      word: PropTypes.string.isRequired,
      path: PropTypes.arrayOf(PropTypes.shape({ row: PropTypes.number, col: PropTypes.number })).isRequired,
    })
  ).isRequired,
  foundWords: PropTypes.instanceOf(Set).isRequired,
  onFound: PropTypes.func.isRequired,
  revealed: PropTypes.bool,
};

export default WordSearchGrid;
