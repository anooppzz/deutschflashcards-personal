// Word Search (Wortgitter): pick N words from the current selection, place
// them in a letter grid, find them by dragging in a straight line. See
// project conversation history for the design decisions this encodes:
// - German word list originally, then REVISED to English-first with
//   tap-to-reveal (see WordSearchTrainer.jsx) after hands-on testing -
//   pure recognition was too easy, pure recall-without-spelling-help was
//   too hard to scan for; hinting solves both.
// - Umlauts substituted for grid purposes only (ä→AE, ö→OE, ü→UE, ß→SS) -
//   the found-word reveal still shows the real spelling.
// - Forward-only placement (→, ↓, ↘, ↙) - approachable, not a "gotcha" puzzle.
// - NOT wired into FSRS/progress - recognizing a word in a grid is a much
//   easier task than Reverse's production or Cloze's in-context recall,
//   and mixing that signal into the same difficulty model would make the
//   progress data less meaningful, not more. Purely for engagement.
import { bareForm } from "../../engine/wordForm";

const MIN_WORD_LEN = 3;
const MAX_WORD_LEN = 12;
const MIN_GRID = 8;
const MAX_GRID = 14;
const MAX_PLACEMENT_ATTEMPTS = 200;

// → right, ↓ down, ↘ diagonal down-right, ↙ diagonal down-left. Deliberately
// forward-only (no upward/backward-horizontal directions) - see header note.
const DIRECTIONS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
];

const substituteUmlauts = (s) =>
  s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss");

// The clean, grid-ready letters for a card, or null if this card can't be
// used in a word search at all (multi-word phrase, too short/long, or
// anything left over after cleanup that isn't a plain letter).
export const gridWord = (front) => {
  const bare = substituteUmlauts(bareForm(front)).toUpperCase();
  if (!/^[A-Z]+$/.test(bare)) return null;
  if (bare.length < MIN_WORD_LEN || bare.length > MAX_WORD_LEN) return null;
  return bare;
};

// Eligible pool: needs a usable grid word AND an example + translation to
// show on the found-word reveal (same reveal shape as FlipCard's back
// face - word, meaning, example sentence).
export const buildWordSearchPool = (cards) =>
  cards
    .map((c) => ({ ...c, gridWord: gridWord(c.front) }))
    .filter((c) => c.gridWord && c.example && c.exampleEn);

const randInt = (n) => Math.floor(Math.random() * n);

// Try to place one word into the grid at a random valid position/direction.
// Crossing an already-placed word is allowed (and encouraged - it's what
// makes packing reliable) as long as the overlapping letters agree.
// Returns the placement's cell path on success, or null if it couldn't be
// placed after MAX_PLACEMENT_ATTEMPTS tries.
const tryPlaceWord = (grid, size, word) => {
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    const dir = DIRECTIONS[randInt(DIRECTIONS.length)];
    const maxRow = dir.dr >= 0 ? size - 1 - dir.dr * (word.length - 1) : size - 1;
    const minRow = dir.dr < 0 ? -dir.dr * (word.length - 1) : 0;
    const maxCol = dir.dc >= 0 ? size - 1 - dir.dc * (word.length - 1) : size - 1;
    const minCol = dir.dc < 0 ? -dir.dc * (word.length - 1) : 0;
    if (maxRow < minRow || maxCol < minCol) continue;
    const row = minRow + randInt(maxRow - minRow + 1);
    const col = minCol + randInt(maxCol - minCol + 1);

    const path = [];
    let ok = true;
    for (let i = 0; i < word.length; i++) {
      const r = row + dir.dr * i;
      const c = col + dir.dc * i;
      const existing = grid[r][c];
      if (existing && existing !== word[i]) { ok = false; break; }
      path.push({ row: r, col: c });
    }
    if (!ok) continue;

    path.forEach((p, i) => { grid[p.row][p.col] = word[i]; });
    return path;
  }
  return null;
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Build a grid + placements for a set of already-selected cards. Words
// that can't be placed after enough attempts are simply dropped from the
// round (fail closed, same philosophy as Cloze's unmatchable-card
// exclusion) rather than forced in or crashing the round.
export const buildWordSearchGrid = (cards) => {
  const withWords = cards.map((c) => ({ ...c, gridWord: c.gridWord || gridWord(c.front) })).filter((c) => c.gridWord);
  const longest = withWords.reduce((m, c) => Math.max(m, c.gridWord.length), 0);
  const size = Math.min(MAX_GRID, Math.max(MIN_GRID, longest + 2));

  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const sorted = [...withWords].sort((a, b) => b.gridWord.length - a.gridWord.length);

  const placements = [];
  sorted.forEach((c) => {
    const path = tryPlaceWord(grid, size, c.gridWord);
    if (path) placements.push({ card: c, word: c.gridWord, path, found: false });
  });

  for (let r = 0; r < size; r++) {
    for (let cIdx = 0; cIdx < size; cIdx++) {
      if (!grid[r][cIdx]) grid[r][cIdx] = ALPHABET[randInt(ALPHABET.length)];
    }
  }

  return { grid, size, placements };
};

// Round builder: not FSRS-weighted (see header note) - a plain shuffle so
// every session feels fresh rather than favoring "due" words the way
// graded modes do.
export const buildWordSearchRound = (pool, n) => {
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
  return buildWordSearchGrid(shuffled);
};

export const resolveWordSearchSize = (pref, poolLen) => {
  const presets = [5, 8, 10];
  if (pref === "all") return Math.min(poolLen, 10);
  if (presets.includes(pref)) return Math.min(pref, poolLen);
  return Math.min(8, poolLen);
};
