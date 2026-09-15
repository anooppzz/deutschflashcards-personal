// Shared time constant. The old fixed-box Leitner interval table
// (LEITNER_INTERVAL_DAYS, MAX_BOX, KNOWN_BOX_THRESHOLD) was retired when
// the review engine moved to an adaptive difficulty/stability model - see
// engine/fsrs.js. DAY_MS is the one piece still needed everywhere.
export const DAY_MS = 24 * 60 * 60 * 1000;
