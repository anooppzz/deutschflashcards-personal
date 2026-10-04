// Barrel export for all training modes.
export { default as DeckView } from "./cards/DeckView";
export { buildDeckViews, initialSlice, visibleCards } from "./cards/deckViews";

export { default as ArticleTrainer } from "./article/ArticleTrainer";
export { default as ArticleSummary } from "./article/ArticleSummary";
export * from "./article/buildRound";

export { default as QuizTrainer } from "./quiz/QuizTrainer";
export { default as QuizSummary } from "./quiz/QuizSummary";
export { buildQuiz } from "./quiz/buildQuiz";

export { default as ReverseTrainer } from "./reverse/ReverseTrainer";
export { default as ReverseSummary } from "./reverse/ReverseSummary";

export { default as ClozeTrainer } from "./cloze/ClozeTrainer";
export { default as ClozeSummary } from "./cloze/ClozeSummary";
export { buildClozePool, buildClozeRound, saveClozeSizePref, resolveClozeRoundSize, isClozeCorrect, findAlternateWordMatch } from "./cloze/buildRound";

export { default as WordSearchTrainer } from "./wordsearch/WordSearchTrainer";
export { default as WordSearchSummary } from "./wordsearch/WordSearchSummary";
export { buildWordSearchPool, buildWordSearchRound, resolveWordSearchSize } from "./wordsearch/buildGrid";

export { default as GrammarView } from "./grammar/GrammarView";
export { default as SearchResults } from "./search/SearchResults";
export { default as ReviewSession } from "./review/ReviewSession";

export { default as FormsTrainer } from "./forms/FormsTrainer";
export { buildFormsPool } from "./forms/buildForms";
