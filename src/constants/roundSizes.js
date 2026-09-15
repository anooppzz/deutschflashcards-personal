// Round-size and goal presets used across Article/Quiz/Reverse modes and
// the streak goal picker. Keeping these together makes it obvious what
// "sizes" exist in the app without hunting through each trainer.

// Cap for both quiz and article rounds - what makes weighting matter.
export const ROUND_SIZE = 15;

// A10: only truncate a round when the pool is meaningfully bigger than one
// round - a small deck (e.g. 18 nouns) should just run in full rather than
// arbitrarily losing a few words to a cap that barely shortens anything.
export const ARTICLE_FULL_THRESHOLD = 20;

// A14: lets the person override the automatic round-size behaviour.
// Shared by Article and Reverse mode's "🔢 Runde" selector.
export const ARTICLE_SIZE_PRESETS = ["auto", 10, 15, 20, 25, "all"];

// Daily streak goal options shown in the streak UI.
export const GOAL_PRESETS = [10, 20, 30, 40, 50];
