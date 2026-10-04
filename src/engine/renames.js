// Progress is stored per card id: "<deck>::<front>" (see idOf). Changing a
// card's front (a typo fix) or moving it to another deck changes its id,
// which would silently orphan its progress. src/data/renames.json maps old
// ids to new ones; the app applies it when progress loads, so the progress
// follows the card. A value of null records a card removed on purpose.
//
// When an old and a new id both have progress, the new one is kept - it is
// the card the learner has been practising since the change.
export const applyRenames = (progress, renames) => {
  let changed = false;
  const out = { ...progress };
  for (const [from, to] of Object.entries(renames)) {
    if (!(from in out)) continue;
    if (to && !(to in out)) out[to] = out[from];
    if (to) { delete out[from]; changed = true; }
  }
  return { progress: out, changed };
};
