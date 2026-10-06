/* ============================================================
   🧑‍🎓 PERSONAL — german-flashcards-personal
   Forked from german-flashcards-shared (the study-group version)
   on 2026-07-15. This is now the actively developed branch,
   built for single-user personal study rather than group
   distribution. Roadmap: bring-your-own-key AI assistant
   (engine/ai/), a hybrid static+AI grammar section, FSRS-style
   adaptive spaced repetition, and deeper practice modes (Cloze,
   listen-and-type). See conversation history for the full plan.
   Not intended to be redistributed to the study group as-is -
   see german-flashcards-shared for that.
   ============================================================ */

/* ============================================================
   VERSION 1 - in progress
   Starting point: identical to V0. This is where the rewrite
   happens: window.storage → localStorage, AI translation →
   client-side WASM model (+ Chrome native Translator API as a
   bonus fast-path), example sentences → static-only or a small
   serverless proxy, depending on what's chosen.
   Goal: fully hostable on a free static platform (GitHub Pages,
   Cloudflare Pages, Netlify, Vercel) with no ongoing AI cost to
   anyone.
   ============================================================ */

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  STORAGE_KEYS,
  TYPE_META,
  ROUND_SIZE, ARTICLE_SIZE_PRESETS, GOAL_PRESETS, REVIEW_SIZE,
  LANGUAGES,
  MODE, MODE_TABS, DAY_MS, buildLabel,
} from "./constants";
import {
  IRREGULAR_VERBS, INSEPARABLE_VERBS, HAUSHALT, VERKEHR, KLEIDUNG,
  EXTRA_TOPICS, DECK_META, GRAMMAR_TOPICS,
  DECK_SOURCE, EXTRA_BY_KEY, ALL_CARDS, GRAMMAR_EXERCISES, READING_TEXTS, DTZ_SETS,
} from "./data";
import {
  storage,
  idOf, saveProgress,
  reviewFsrsCard, knownFsrsCard, reviewNowFsrsCard,
  isKnownStability, migrateBoxEntry,
  localDateStr, addDaysStr, saveStreak, effectiveStreakDisplay,
  weightedSample, shuffled,
  checkReverseAnswer, checkDictation, isDictatable, isArticleCorrect,
  recordAnswer, sortedEntries, grammarMistakeId, isGrammarMistakeId, newTopicsOf, textsForDecks,
  freshDaily, addNewId, newCardsFor, NEW_PER_DAY_PRESETS, DEFAULT_NEW_PER_DAY,
  scheduleTopic, isTopicDue, nextGrammarTopic,
  distinctLevels, distinctSources, passesGlobalFilters,
  buildGrammarIndex, buildGrammarSearchIndex, searchCards, searchGrammar, dueCards, applyRenames,
} from "./engine";
import {
  FlipCard, Controls, NoResults, CategoryFilter,
  StreakBar, ProgressBar, RoundSizeSelector, ErrorBoundary, BackupModal, WelcomeModal, HelpModal, Swipeable, DailyPlan,
} from "./components";
import RENAMES from "./data/renames.json";
import { ProgressCtx } from "./context/ProgressCtx";
import { GrammarNavCtx } from "./context/GrammarNavCtx";
import { useBackButton } from "./engine/useBackButton";
import {
  DeckView, buildDeckViews, visibleCards, initialSlice,
  ArticleTrainer, ArticleSummary,
  buildArticleRoundStratified, saveArticleSizePref, resolveArticleRoundSize, articleSizeLabel,
  QuizTrainer, QuizSummary, buildQuiz,
  ReverseTrainer, ReverseSummary,
  ClozeTrainer, ClozeSummary, buildClozePool, buildClozeRound, saveClozeSizePref, resolveClozeRoundSize, isClozeCorrect,
  WordSearchTrainer, WordSearchSummary, buildWordSearchPool, buildWordSearchRound, resolveWordSearchSize,
  GrammarView, SearchResults, ReviewSession, FormsTrainer, buildFormsPool, MistakeBook,
  SatzbauTrainer, buildSatzbauPool, ReadingView, DtzTrainer,
} from "./modes";

/* ============================================================
   COLORS / META
   Vocabulary data (Kleidung, Verkehr, Haushalt, Irregular/Inseparable
   verbs, Lektion topics, static translations) now lives in src/data/ -
   see data/index.js for the single import point.
   ============================================================ */


const step = (setIdx, total) => (dir) => {
  if (!total) return;
  setIdx((i) => (i + dir + total) % total);
};

// category lists for the multi-select filters
// Wortgitter round sizes, cycled by its round-size button
const WS_SIZE_PRESETS = [5, 8, 10];
const FULL_CATS = [["n", "Nomen"], ["v", "Verben"], ["adj", "Adjektive"], ["sonst", "Sonstige"]];
const FULL_KEYS = FULL_CATS.map(([k]) => k);

// deck registry for the multi-topic (combined) mode - see data/index.js

// precompute filter categories per topic + register in the global maps
EXTRA_TOPICS.forEach((t) => {
  const present = new Set(t.cards.map((c) => c.type));
  t.cats = FULL_CATS.filter(([k]) => present.has(k));
  t.keys = t.cats.map(([k]) => k);
  DECK_META[t.key] = { label: t.label, icon: t.icon };
  DECK_SOURCE[t.key] = t.cards;
});

// every deck the Karten mode shows on its own (modes/cards/deckViews.js)
const DECK_VIEWS = buildDeckViews();

// The selected topics and the study mode survive a reload. Read straight
// from localStorage (synchronously) so the first render already shows the
// saved selection; anything no longer valid (a renamed or removed chapter)
// is dropped, falling back to the default.
const readSaved = (key) => {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};
const savedTabs = () => {
  const v = readSaved(STORAGE_KEYS.TABS);
  const valid = Array.isArray(v) ? v.filter((k) => k in DECK_SOURCE) : [];
  return valid.length ? valid : ["kleidung"];
};
const savedMode = () => {
  const v = readSaved(STORAGE_KEYS.MODE);
  return Object.values(MODE).includes(v) ? v : MODE.CARDS;
};

// Unified card normalization (schema v1)
// Converts all deck shapes (irregular, inseparable, typed, extra topics) into one consistent output.
// Design goal: every learning mode reads the same fields, same optional-field structure.
// No display logic (accent/badge) is computed here — components handle that.
// Card <-> grammar topic links for every card, built once: cards look up
// their 📖 chips by card id, and each grammar topic lists its words.
const GRAMMAR_INDEX = buildGrammarIndex(ALL_CARDS, GRAMMAR_TOPICS);
const grammarLinksById = (id) => GRAMMAR_INDEX.linksById[id] || [];
// every card by id (full fields: sub, note …) for modes that need more
// than the selection's own card objects carry
const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [idOf(c.deck, c.front), c]));
// 📕 Fehlerheft: grammar questions by their mistake id
const GRAMMAR_QUESTION_BY_ID = new Map(Object.entries(GRAMMAR_EXERCISES).flatMap(([key, items]) => {
  const topic = GRAMMAR_TOPICS.find((t) => t.key === key);
  const topicTitle = topic ? topic.title.de || topic.title.en : key;
  return items.map((item) => [grammarMistakeId(key, item.q), { item, topicTitle }]);
}));
// the text of every grammar topic, indexed once for the app-wide search
const GRAMMAR_SEARCH = buildGrammarSearchIndex(GRAMMAR_TOPICS);

function normalizeCard(deckKey, c) {
  // irregular verbs: { group, infinitiv, präteritum, hilfsverb, partizip, english, example }
  if (deckKey === "irregular") {
    const normalizedIrregular = {
      deck: deckKey,
      type: "v",
      front: c.infinitiv,
      english: c.english,
      example: c.example,
      conjugation: {
        präteritum: c.präteritum,
        hilfsverb: c.hilfsverb,
        partizip: c.partizip,
        group: c.group,
      },
    };
    if (c.level) normalizedIrregular.level = c.level;
    if (c.source) normalizedIrregular.source = c.source;
    return normalizedIrregular;
  }

  // inseparable verbs: { infinitiv, partizip, english, example, exampleEn }
  if (deckKey === "inseparable") {
    const normalizedInseparable = {
      deck: deckKey,
      type: "v",
      front: c.infinitiv,
      english: c.english,
      example: c.example,
      exampleEn: c.exampleEn,
      conjugation: {
        partizip: c.partizip,
      },
    };
    if (c.level) normalizedInseparable.level = c.level;
    if (c.source) normalizedInseparable.source = c.source;
    return normalizedInseparable;
  }

  // all other decks: typed nouns/verbs/adjectives + extra topics
  // shape: { type, gender?, front, sub, english, example?, exampleEn? }
  const normalized = {
    deck: deckKey,
    type: c.type,
    front: c.front,
    english: c.english,
  };

  // optional: gender (nouns only)
  if (c.gender) normalized.gender = c.gender;

  // optional: example and example translation
  if (c.example) normalized.example = c.example;
  if (c.exampleEn) normalized.exampleEn = c.exampleEn;

  // optional: CEFR level (A1/A2) - not every card is classified yet
  if (c.level) normalized.level = c.level;

  // optional: source book/unit (e.g. "Menschen A2 · Einheit 3") - lets the
  // existing generic search find every card from a given chapter across
  // ALL topics at once, regardless of which thematic deck it landed in.
  if (c.source) normalized.source = c.source;

  // optional: a short per-card note shown on the back (e.g. "von zeichnen")
  if (c.note) normalized.note = c.note;

  // optional: plural (nouns) or opposite (adjectives) — both stored in c.sub
  if (c.sub) {
    if (c.type === "n") {
      normalized.plural = c.sub;
    } else if (c.type === "adj") {
      // check if this is a Gegenteil (↔) pair
      if (c.sub.includes("↔")) {
        normalized.opposite = c.sub.split("↔").map(s => s.trim())[1];
      } else {
        // store it as a fallback generic subtitle (e.g. for temporal adjectives)
        normalized.subtitle = c.sub;
      }
    } else {
      // for sonst/phrases, keep as generic subtitle
      normalized.subtitle = c.sub;
    }
  }

  return normalized;
}


/* ============================================================
   COMPONENTS
   ============================================================ */


// translation language + onboarding flags (engine/translation/chain.js explains the translation order)
const saveLang = (v) => { try { storage.set(STORAGE_KEYS.LANG, JSON.stringify(v)); } catch {} };
const saveCustomLangs = (arr) => { try { storage.set(STORAGE_KEYS.CUSTOM_LANGS, JSON.stringify(arr)); } catch {} };
const saveWelcomeSeen = () => { try { storage.set(STORAGE_KEYS.WELCOME_SEEN, "1"); } catch {} };


/* ============================================================
   APP
   ============================================================ */

function App() {
  const [tabs, setTabs] = useState(savedTabs); // multi-select topics
  useEffect(() => { storage.set(STORAGE_KEYS.TABS, JSON.stringify(tabs)); }, [tabs]);
  // the topic picker is folded into one row until opened, so the card
  // stays near the top of a phone screen
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [query, setQuery] = useState("");

  // combined (multi-topic) mode state
  const [comboFilter, setComboFilter] = useState(FULL_KEYS);
  const [comboIdx, setComboIdx] = useState(0);
  const [comboDeck, setComboDeck] = useState(KLEIDUNG.map((c) => normalizeCard("kleidung", c)));
  const [comboShuffled, setComboShuffled] = useState(false);

  // each deck's place in Karten mode: { [key]: { idx, filter, order, shuffled } }
  const [extra, setExtra] = useState(() =>
    Object.fromEntries(Object.values(DECK_VIEWS).map((v) => [v.key, initialSlice(v)]))
  );
  // back to the first card in every deck (after the A1/A2 or chapter filter changes)
  const resetDeckPositions = () => {
    setExtra((prev) => Object.fromEntries(Object.entries(prev).map(([k, sl]) => [k, { ...sl, idx: 0 }])));
    setComboIdx(0);
  };
  const setExtraSlice = (key) => (patch) =>
    setExtra((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const single = tabs.length === 1;
  const onlyTab = single ? tabs[0] : null;

  // base combined deck (natural order) from selected topics
  const comboBase = useMemo(
    () => tabs.flatMap((k) => DECK_SOURCE[k].map((c) => normalizeCard(k, c))),
    [tabs]
  );
  // which category chips to show in combined mode (only types actually present)
  const comboCats = useMemo(() => {
    const present = new Set(comboBase.map((c) => c.type));
    return FULL_CATS.filter(([k]) => present.has(k));
  }, [comboBase]);
  const comboKeys = useMemo(() => comboCats.map(([k]) => k), [comboCats]);

  // ---- Global level (A1/A2) + source (book · chapter) filters ----
  // Crosscutting facets, independent of topic - see project conversation
  // history. These apply everywhere a card gets shown or drawn into a
  // practice round: Cards mode (every deck view + combined), and via
  // selectionCards below, Quiz/Article/Reverse/Cloze/Word Search pools too.
  const availableLevels = useMemo(() => distinctLevels(comboBase), [comboBase]);
  const availableSources = useMemo(() => distinctSources(comboBase), [comboBase]);
  const [levelFilter, setLevelFilter] = useState(availableLevels);
  const [sourceFilter, setSourceFilter] = useState(availableSources);
  // reset to "everything selected" whenever the available set changes
  // (topic selection changed, or the set of chapters present shifted) -
  // same reset pattern already used for comboFilter/comboKeys below.
  useEffect(() => { setLevelFilter(availableLevels); }, [availableLevels]);
  useEffect(() => { setSourceFilter(availableSources); }, [availableSources]);

  // when topic selection changes, reset the combined deck order + select all kinds
  useEffect(() => {
    setComboDeck(comboBase);
    setComboFilter(comboKeys);
    setComboIdx(0);
    setComboShuffled(false);
  }, [comboBase, comboKeys]);

  // ---- progress (persisted) - Leitner box per card, migrated from the older known/review strings ----
  // ---- progress (persisted) - adaptive difficulty/stability per card (see
  // engine/fsrs.js), migrated forward from both the older known/review
  // strings AND the fixed-box Leitner format that preceded this model ----
  const [progress, setProgress] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(STORAGE_KEYS.PROGRESS);
        if (!r || !r.value) return;
        const raw = JSON.parse(r.value);
        const migrated = {};
        let anyMigrated = false;
        Object.entries(raw).forEach(([id, v]) => {
          if (typeof v === "string") {
            // pre-SRS format: a bare "known"/"review" label
            migrated[id] = v === "known" ? knownFsrsCard() : reviewNowFsrsCard();
            anyMigrated = true;
          } else if (v && typeof v.box === "number") {
            // old fixed-box Leitner format - convert to the adaptive model
            migrated[id] = migrateBoxEntry(v);
            anyMigrated = true;
          } else if (v && typeof v.stability === "number") {
            // already the current adaptive format
            migrated[id] = v;
          }
        });
        // cards renamed or moved since: their progress follows (data/renames.json)
        const renamed = applyRenames(migrated, RENAMES);
        setProgress(renamed.progress);
        if (anyMigrated || renamed.changed) saveProgress(renamed.progress);
      } catch {}
    })();
  }, []);

  // ---- daily goal & streak (#6) ----
  const [streakData, setStreakData] = useState({ goal: 20, date: localDateStr(), count: 0, streak: 0, recordStreak: 0, metToday: false });
  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(STORAGE_KEYS.STREAK);
        if (r && r.value) {
          const loaded = JSON.parse(r.value);
          // migrate old saved data that predates the metToday flag: infer it
          // conservatively from count/goal so an already-earned day doesn't
          // get silently un-credited, without ever double-crediting either
          if (typeof loaded.metToday !== "boolean") loaded.metToday = loaded.count >= loaded.goal;
          setStreakData(loaded);
        }
      } catch {}
    })();
  }, []);
  const bumpStreak = useCallback(() => {
    setStreakData((prev) => {
      const today = localDateStr();
      let { goal, date, count, streak, recordStreak, metToday } = prev;
      recordStreak = recordStreak || 0;
      if (date !== today) {
        const yesterday = addDaysStr(today, -1);
        if (!(date === yesterday && count >= goal)) streak = 0; // gap, or yesterday's goal was missed
        date = today;
        count = 0;
        metToday = false;
      }
      count += 1;
      // >= instead of the old strict === : count only ever goes up, so if the
      // goal is lowered (via cycleGoal) after count already passed the old
      // goal, count can never land on the new value exactly again - that
      // permanently broke crediting for the rest of the day. metToday makes
      // crediting exactly-once regardless of how many times count clears the
      // threshold, so overshooting the goal (e.g. 37/20) stays harmless.
      if (!metToday && count >= goal) {
        metToday = true;
        streak += 1;
        recordStreak = Math.max(recordStreak, streak);
      }
      const next = { goal, date, count, streak, recordStreak, metToday };
      saveStreak(next);
      return next;
    });
  }, []);
  const cycleGoal = useCallback(() => {
    setStreakData((prev) => {
      const i = GOAL_PRESETS.indexOf(prev.goal);
      const goal = GOAL_PRESETS[(i + 1) % GOAL_PRESETS.length] ?? GOAL_PRESETS[0];
      const next = { ...prev, goal };
      saveStreak(next);
      return next;
    });
  }, []);
  const displayStreak = effectiveStreakDisplay(streakData);

  // 🎯 Heute lernen (engine/dailyPlan.js): what was done today
  const [daily, setDaily] = useState(() => freshDaily(readSaved(STORAGE_KEYS.DAILY), localDateStr()));
  const updateDaily = useCallback((fn) => setDaily((prev) => {
    const next = fn(freshDaily(prev, localDateStr()));
    try { localStorage.setItem(STORAGE_KEYS.DAILY, JSON.stringify(next)); } catch { /* storage off */ }
    return next;
  }), []);
  // a card is new until its first review; read through a ref so the graders stay stable
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // manual override from the flashcard's ✓ Gekonnt / ↻ Üben buttons
  const mark = useCallback((id, status) => {
    if (!id) return;
    if (status && !progressRef.current[id]) updateDaily((d) => addNewId(d, id));
    setProgress((prev) => {
      const next = { ...prev };
      if (status === "known") {
        next[id] = knownFsrsCard();
      } else if (status === "review") {
        next[id] = reviewNowFsrsCard();
      } else {
        delete next[id];
      }
      saveProgress(next);
      return next;
    });
    if (status === "known" || status === "review") bumpStreak();
  }, [bumpStreak, updateDaily]);

  // graded result from Quiz/Article/Reverse/Cloze: runs the adaptive
  // difficulty/stability model (see engine/fsrs.js) instead of a fixed
  // Leitner box step.
  // 📕 Fehlerheft (engine/mistakes.js): wrong answers from every trainer
  // and grammar exercise, until answered right on two different days
  const [mistakeBook, setMistakeBook] = useState(() => {
    const saved = readSaved(STORAGE_KEYS.MISTAKES);
    return saved && typeof saved === "object" ? applyRenames(saved, RENAMES).progress : {};
  });
  const recordMistake = useCallback((id, correct) => {
    setMistakeBook((prev) => {
      const next = recordAnswer(prev, id, correct, localDateStr());
      if (next !== prev) { try { localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(next)); } catch { /* storage off */ } }
      return next;
    });
  }, []);
  const [showMistakes, setShowMistakes] = useState(false);
  // 🎓 DTZ trainer (modes/exam): null = closed, else { kind: "home" | "teil" | "sim", … }
  const [dtzView, setDtzView] = useState(null);
  // On a phone the mode tabs sit at the bottom of the first screen, so what
  // a tap opens (a tab, 🎓 DTZ, a 🎯 plan step, a text) starts below the fold.
  // showContent("tabs") brings the tab row to the top (skipped when it is
  // already near the top); showContent("content") the opened view itself.
  const tabsRef = useRef(null);
  const contentRef = useRef(null);
  const [scrollTarget, setScrollTarget] = useState(null); // { to, n }
  const showContent = (to) => setScrollTarget({ to, n: Date.now() });
  useEffect(() => {
    if (!scrollTarget) return;
    const el = (scrollTarget.to === "tabs" ? tabsRef : contentRef).current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (scrollTarget.to === "tabs" && top >= 0 && top < window.innerHeight * 0.25) return;
    window.scrollTo({ top: Math.max(0, window.scrollY + top - 8), behavior: "smooth" });
  }, [scrollTarget]);
  const [dtzResults, setDtzResults] = useState(() => {
    const v = readSaved(STORAGE_KEYS.DTZ_RESULTS);
    return Array.isArray(v) ? v : [];
  });
  const saveDtzResult = (r) => setDtzResults((prev) => {
    const next = [{ at: new Date().toISOString(), mode: r.mode, label: r.label, right: r.right, total: r.total }, ...prev].slice(0, 50);
    try { localStorage.setItem(STORAGE_KEYS.DTZ_RESULTS, JSON.stringify(next)); } catch { /* storage off */ }
    return next;
  });

  // opts.learning: a first look at new words (🎯 plan) - not knowing a word
  // you have never seen isn't a mistake, so it stays out of the Fehlerheft
  const reviewResult = useCallback((id, correct, opts = {}) => {
    if (!id) return;
    const isNew = !progressRef.current[id];
    if (isNew) updateDaily((d) => addNewId(d, id));
    setProgress((prev) => {
      const next = { ...prev };
      next[id] = reviewFsrsCard(prev[id], correct);
      saveProgress(next);
      return next;
    });
    bumpStreak();
    if (!(isNew && opts.learning)) recordMistake(id, correct);
  }, [bumpStreak, recordMistake, updateDaily]);

  // full id list + noun list for the current selection (for progress bar & article trainer)
  const selectionCards = useMemo(() => {
    let base;
    if (!single) {
      base = comboBase.map((c) => ({ deck: c.deck, front: c.front, type: c.type, gender: c.gender, english: c.english, example: c.example, exampleEn: c.exampleEn, level: c.level, source: c.source }));
    } else {
      const map = {
        irregular: IRREGULAR_VERBS.map((v) => ({ deck: "irregular", front: v.infinitiv, type: "v", english: v.english, example: v.example, level: v.level, source: v.source })),
        inseparable: INSEPARABLE_VERBS.map((v) => ({ deck: "inseparable", front: v.infinitiv, type: "v", english: v.english, example: v.example, exampleEn: v.exampleEn, level: v.level, source: v.source })),
        haushalt: HAUSHALT.map((w) => ({ deck: "haushalt", front: w.front, type: w.type, gender: w.gender, english: w.english, example: w.example, exampleEn: w.exampleEn, level: w.level, source: w.source })),
        verkehr: VERKEHR.map((w) => ({ deck: "verkehr", front: w.front, type: w.type, gender: w.gender, english: w.english, example: w.example, exampleEn: w.exampleEn, level: w.level, source: w.source })),
        kleidung: KLEIDUNG.map((w) => ({ deck: "kleidung", front: w.front, type: w.type, gender: w.gender, english: w.english, example: w.example, exampleEn: w.exampleEn, level: w.level, source: w.source })),
      };
      if (map[onlyTab]) base = map[onlyTab];
      else {
        const t = EXTRA_BY_KEY[onlyTab];
        base = t ? t.cards.map((c) => ({ deck: onlyTab, front: c.front, type: c.type, gender: c.gender, english: c.english, example: c.example, exampleEn: c.exampleEn, level: c.level, source: c.source })) : [];
      }
    }
    return base.filter((c) => passesGlobalFilters(c, levelFilter, sourceFilter));
  }, [single, onlyTab, comboBase, levelFilter, sourceFilter]);

  const knownCount = useMemo(
    () => selectionCards.filter((c) => isKnownStability(progress[idOf(c.deck, c.front)]?.stability || 0)).length,
    [selectionCards, progress]
  );
  const dueCount = useMemo(() => {
    const now = Date.now();
    return selectionCards.filter((c) => {
      const e = progress[idOf(c.deck, c.front)];
      return !e || e.due <= now;
    }).length;
  }, [selectionCards, progress]);
  // 🔁 Formen (modes/forms): Perfekt and plural questions from the selection
  const formsPools = useMemo(() => {
    const cards = selectionCards.map((c) => CARD_BY_ID.get(idOf(c.deck, c.front))).filter(Boolean);
    return { perfekt: buildFormsPool(cards, "perfekt"), plural: buildFormsPool(cards, "plural") };
  }, [selectionCards]);
  const [formsKind, setFormsKind] = useState(() => (readSaved(STORAGE_KEYS.FORMS_KIND) === "plural" ? "plural" : "perfekt"));
  useEffect(() => { storage.set(STORAGE_KEYS.FORMS_KIND, JSON.stringify(formsKind)); }, [formsKind]);
  const articleNouns = useMemo(
    () => selectionCards.filter((c) => c.type === "n" && c.gender),
    [selectionCards]
  );
  // 🧩 Satzbau: the selection's example sentences; 📰 Lesen: the selection's texts
  const satzbauPool = useMemo(() => buildSatzbauPool(selectionCards), [selectionCards]);
  const readingTexts = useMemo(() => textsForDecks(READING_TEXTS, tabs), [tabs]);
  const [readingKey, setReadingKey] = useState(null); // the open text
  const [readingScores, setReadingScores] = useState(() => readSaved(STORAGE_KEYS.READING_SCORES) || {});
  const saveReadingScore = (key, right) => setReadingScores((prev) => {
    if (prev[key] != null && prev[key] >= right) return prev;
    const next = { ...prev, [key]: right };
    try { localStorage.setItem(STORAGE_KEYS.READING_SCORES, JSON.stringify(next)); } catch { /* storage off */ }
    return next;
  });

  // ---- study mode: cards | article | quiz ----
  const [mode, setMode] = useState(savedMode);
  useEffect(() => { storage.set(STORAGE_KEYS.MODE, JSON.stringify(mode)); }, [mode]);
  // grammar links: a card's 📖 chip opens the Grammatik tab on that topic,
  // remembering which mode it came from so "← Zurück" can return there.
  const [grammarFocus, setGrammarFocus] = useState(null);
  // 📅 grammar topics come back for review (engine/grammarReview.js)
  const [grammarSchedule, setGrammarSchedule] = useState(() => readSaved(STORAGE_KEYS.GRAMMAR_REVIEW) || {});
  const finishGrammarRound = (key, right, total) => {
    setGrammarSchedule((prev) => {
      const next = { ...prev, [key]: scheduleTopic(prev[key], right, total, localDateStr()) };
      try { localStorage.setItem(STORAGE_KEYS.GRAMMAR_REVIEW, JSON.stringify(next)); } catch { /* storage off */ }
      return next;
    });
    updateDaily((d) => ({ ...d, grammar: true }));
  };
  const [grammarFrom, setGrammarFrom] = useState(null);
  const openGrammar = useCallback((key) => {
    setShowMistakes(false);
    setGrammarFrom(mode === MODE.GRAMMAR ? null : mode);
    setGrammarFocus({ key, n: Date.now() });
    setMode(MODE.GRAMMAR);
  }, [mode]);
  const grammarNav = useMemo(() => ({ openGrammar, linksFor: grammarLinksById }), [openGrammar]);
  // Entering a training mode normally starts a new round (see the
  // round-building effect below). "← Zurück" from the Grammatik tab should
  // instead return to the round in progress, so it sets this ref and that
  // effect skips one rebuild.
  const resumeRoundRef = useRef(false);
  // the cards changed while on the Grammatik tab -> that round is stale, so
  // drop the way back to it; switching tabs then starts a fresh round
  useEffect(() => { setGrammarFrom(null); }, [selectionCards]);
  const backFromGrammar = () => {
    resumeRoundRef.current = true;
    setMode(grammarFrom);
    setGrammarFrom(null);
    setGrammarFocus(null);
    showContent("tabs");
  };

  // #2: language toggle - EN/RU/AR, personal + persisted
  const [lang, setLang] = useState("en");
  const [customLangs, setCustomLangs] = useState([]);
  const [addingLang, setAddingLang] = useState(false);
  const [langOpen, setLangOpen] = useState(false); // language picker, folded into the header button
  const [newLangText, setNewLangText] = useState("");
  // onboarding: welcome modal (first visit only) + always-available help panel
  const [showWelcome, setShowWelcome] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // backup (components/BackupModal.jsx): a reminder appears once there is
  // real progress to lose and no backup from the last two weeks
  const [showBackup, setShowBackup] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState(() => {
    const v = readSaved(STORAGE_KEYS.BACKUP_AT);
    return typeof v === "number" ? v : null;
  });
  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(STORAGE_KEYS.LANG);
        if (r && r.value) setLang(JSON.parse(r.value));
        const rc = await storage.get(STORAGE_KEYS.CUSTOM_LANGS);
        if (rc && rc.value) setCustomLangs(JSON.parse(rc.value));
        const rw = await storage.get(STORAGE_KEYS.WELCOME_SEEN);
        if (!rw || !rw.value) setShowWelcome(true);
      } catch {}
    })();
  }, []);
  const addCustomLang = () => {
    const name = newLangText.trim();
    if (!name) { setAddingLang(false); return; }
    const isDup = LANGUAGES.some(([k, l]) => k.toLowerCase() === name.toLowerCase() || l.toLowerCase() === name.toLowerCase())
      || customLangs.some((c) => c.toLowerCase() === name.toLowerCase());
    if (!isDup) {
      const next = [...customLangs, name];
      setCustomLangs(next);
      saveCustomLangs(next);
    }
    setLang(name);
    saveLang(name);
    setNewLangText("");
    setAddingLang(false);
  };
  const removeCustomLang = (name) => {
    const next = customLangs.filter((c) => c !== name);
    setCustomLangs(next);
    saveCustomLangs(next);
    if (lang === name) { setLang("en"); saveLang("en"); }
  };
  // Always starts at "auto" on a fresh visit, rather than restoring a
  // previously cycled value from an earlier session. Cycling still works
  // normally for the rest of the current session via cycleArticleSize below.
  const [articleSizePref, setArticleSizePref] = useState("auto");
  const cycleArticleSize = useCallback(() => {
    setArticleSizePref((prev) => {
      const i = ARTICLE_SIZE_PRESETS.indexOf(prev);
      const next = ARTICLE_SIZE_PRESETS[(i + 1) % ARTICLE_SIZE_PRESETS.length];
      saveArticleSizePref(next);
      return next;
    });
  }, []);
  const [reverseSizePref, setReverseSizePref] = useState("auto");
  const cycleReverseSize = useCallback(() => {
    setReverseSizePref((prev) => {
      const i = ARTICLE_SIZE_PRESETS.indexOf(prev);
      const next = ARTICLE_SIZE_PRESETS[(i + 1) % ARTICLE_SIZE_PRESETS.length];
      saveArticleSizePref(next); // reuse the same storage key for now
      return next;
    });
  }, []);
  // the usable Cloze pool: every selected card with a confident blank match
  // (see modes/cloze/buildRound.js) - a strict subset of selectionCards,
  // recomputed only when the underlying selection changes.
  const clozePool = useMemo(() => buildClozePool(selectionCards), [selectionCards]);
  const [clozeSizePref, setClozeSizePref] = useState("auto");
  const cycleClozeSize = useCallback(() => {
    setClozeSizePref((prev) => {
      const i = ARTICLE_SIZE_PRESETS.indexOf(prev);
      const next = ARTICLE_SIZE_PRESETS[(i + 1) % ARTICLE_SIZE_PRESETS.length];
      saveClozeSizePref(next);
      return next;
    });
  }, []);
  // the usable Word Search pool: every selected card with a usable grid
  // word AND an example+translation for the end-of-round reveal.
  const wsPool = useMemo(() => buildWordSearchPool(selectionCards), [selectionCards]);
  const [wsSizePref, setWsSizePref] = useState("auto");
  const cycleWsSize = useCallback(() => {
    setWsSizePref((prev) => {
      const i = WS_SIZE_PRESETS.indexOf(prev);
      return i === -1 || i === WS_SIZE_PRESETS.length - 1 ? WS_SIZE_PRESETS[0] : WS_SIZE_PRESETS[i + 1];
    });
  }, []);
  const [aOrder, setAOrder] = useState([]);
  const [aIdx, setAIdx] = useState(0);
  const [aChoice, setAChoice] = useState(null);
  const [aScore, setAScore] = useState({ right: 0, total: 0 });
  const [aMistakes, setAMistakes] = useState([]);
  const [aFinished, setAFinished] = useState(false);
  const [qOrder, setQOrder] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [qChoice, setQChoice] = useState(null);
  const [qScore, setQScore] = useState({ right: 0, total: 0 });
  const [qMistakes, setQMistakes] = useState([]);
  const [qFinished, setQFinished] = useState(false);
  // ---- Reverse Mode: produce German from meaning ----
  const [rOrder, setROrder] = useState([]);
  // 📖 Lesen (meaning → German) or 🎧 Hören (hear it → German)
  const [reversePrompt, setReversePrompt] = useState(() => (readSaved(STORAGE_KEYS.REVERSE_PROMPT) === "audio" ? "audio" : "meaning"));
  const changeReversePrompt = (p) => {
    setReversePrompt(p);
    try { localStorage.setItem(STORAGE_KEYS.REVERSE_PROMPT, JSON.stringify(p)); } catch { /* storage off */ }
  };
  // Hören only uses cards that can be read aloud as one clear answer
  const reversePool = useMemo(
    () => (reversePrompt === "audio" ? selectionCards.filter((c) => isDictatable(c.front)) : selectionCards),
    [reversePrompt, selectionCards]
  );
  const [rIdx, setRIdx] = useState(0);
  const [rInput, setRInput] = useState("");
  const [rFlipped, setRFlipped] = useState(false);
  const [rScore, setRScore] = useState({ right: 0, total: 0 });
  const [rMistakes, setRMistakes] = useState([]);
  const [rFinished, setRFinished] = useState(false);
  // ---- Cloze Mode: fill in the blank inside the card's own example sentence ----
  const [cOrder, setCOrder] = useState([]);
  const [cIdx, setCIdx] = useState(0);
  const [cInput, setCInput] = useState("");
  const [cFlipped, setCFlipped] = useState(false);
  const [cScore, setCScore] = useState({ right: 0, total: 0 });
  const [cMistakes, setCMistakes] = useState([]);
  const [cFinished, setCFinished] = useState(false);
  // ---- Word Search Mode: find German words hidden in a letter grid.
  // NOT tied to FSRS/progress (see modes/wordsearch/buildGrid.js header) -
  // purely for engagement, so there's no score/mistakes state here, just
  // which words have been found/hinted in the current puzzle. ----
  const [wsRoundData, setWsRoundData] = useState({ grid: [], size: 8, placements: [] });
  const [wsFound, setWsFound] = useState(new Set());
  const [wsHinted, setWsHinted] = useState(new Set());
  const [wsRevealed, setWsRevealed] = useState(false);
  const [wsFinished, setWsFinished] = useState(false);
  useEffect(() => {
    if (resumeRoundRef.current) { resumeRoundRef.current = false; return; }
    if (mode === MODE.ARTICLE) {
      const n = resolveArticleRoundSize(articleSizePref, articleNouns.length);
      setAOrder(buildArticleRoundStratified(articleNouns, progress, n)); setAIdx(0); setAChoice(null); setAScore({ right: 0, total: 0 });
      setAMistakes([]); setAFinished(false);
    } else if (mode === MODE.QUIZ) {
      setQOrder(buildQuiz(selectionCards, progress)); setQIdx(0); setQChoice(null); setQScore({ right: 0, total: 0 });
      setQMistakes([]); setQFinished(false);
    } else if (mode === MODE.REVERSE) {
      const n = resolveArticleRoundSize(reverseSizePref, reversePool.length);
      const pool = weightedSample(reversePool, Math.min(n, reversePool.length), progress || {});
      setROrder(pool); setRIdx(0); setRInput(""); setRFlipped(false); setRScore({ right: 0, total: 0 });
      setRMistakes([]); setRFinished(false);
    } else if (mode === MODE.CLOZE) {
      const n = resolveClozeRoundSize(clozeSizePref, clozePool.length);
      setCOrder(buildClozeRound(clozePool, progress, n)); setCIdx(0); setCInput(""); setCFlipped(false); setCScore({ right: 0, total: 0 });
      setCMistakes([]); setCFinished(false);
    } else if (mode === MODE.WORDSEARCH) {
      const n = resolveWordSearchSize(wsSizePref, wsPool.length);
      setWsRoundData(buildWordSearchRound(wsPool, n));
      setWsFound(new Set()); setWsHinted(new Set()); setWsRevealed(false); setWsFinished(false);
    }
    // articleNouns/selectionCards were previously missing from this dependency
    // list despite being used inside - that let aOrder/qOrder silently go
    // stale (built against an outdated noun pool) whenever the underlying
    // selection changed in a way not captured by mode/tabs alone, while the
    // "Runde: N" label kept showing the saved preference regardless, since
    // it reads articleSizePref directly rather than the actual round length.
  }, [mode, tabs, articleSizePref, reverseSizePref, clozeSizePref, wsSizePref, articleNouns, selectionCards, reversePool, clozePool, wsPool]); // eslint-disable-line
  const chooseArticle = (g) => {
    if (aChoice || !aOrder.length) return;
    const card = aOrder[aIdx % aOrder.length];
    const correct = isArticleCorrect(g, card.gender);
    setAChoice(g);
    setAScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
    if (!correct) setAMistakes((m) => [...m, card]);
    reviewResult(idOf(card.deck, card.front), correct);
  };
  // A1: reaching the last noun ends the round with a summary instead of looping forever
  const nextArticle = () => {
    if (aIdx >= aOrder.length - 1) { setAChoice(null); setAFinished(true); return; }
    setAChoice(null);
    setAIdx((i) => i + 1);
  };
  const restartArticle = () => {
    const n = resolveArticleRoundSize(articleSizePref, articleNouns.length);
    setAOrder(buildArticleRoundStratified(articleNouns, progress, n));
    setAIdx(0); setAChoice(null); setAScore({ right: 0, total: 0 }); setAMistakes([]); setAFinished(false);
  };
  const retryArticleMistakes = () => {
    setAOrder(shuffled(aMistakes));
    setAIdx(0); setAChoice(null); setAScore({ right: 0, total: 0 }); setAMistakes([]); setAFinished(false);
  };
  const chooseQuiz = (opt) => {
    if (qChoice || !qOrder.length) return;
    const q = qOrder[qIdx % qOrder.length];
    const correct = opt === q.answer;
    setQChoice(opt);
    setQScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
    if (!correct) setQMistakes((m) => [...m, q]);
    reviewResult(idOf(q.deck, q.front), correct);
  };
  // Q6: reaching the last question ends the round with a summary instead of looping forever
  const nextQuiz = () => {
    if (qIdx >= qOrder.length - 1) { setQChoice(null); setQFinished(true); return; }
    setQChoice(null);
    setQIdx((i) => i + 1);
  };
  const restartQuiz = () => {
    setQOrder(buildQuiz(selectionCards, progress));
    setQIdx(0); setQChoice(null); setQScore({ right: 0, total: 0 }); setQMistakes([]); setQFinished(false);
  };
  const retryMistakes = () => {
    const pool = qMistakes.map((m) => ({ deck: m.deck, front: m.front, type: m.type, english: m.answer, example: m.example, exampleEn: m.exampleEn }));
    setQOrder(buildQuiz(pool, progress, selectionCards)); // questions from mistakes, distractors from the wider selection
    setQIdx(0); setQChoice(null); setQScore({ right: 0, total: 0 }); setQMistakes([]); setQFinished(false);
  };

  // Reverse Mode handlers
  const submitReverse = () => {
    if (!rInput.trim() || rFlipped) return;
    const card = rOrder[rIdx % rOrder.length];
    // nouns need the right article too (engine/validation.js)
    const { correct, reason } = (reversePrompt === "audio" ? checkDictation : checkReverseAnswer)(rInput, card.front);
    setRFlipped(true);
    setRScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
    if (!correct) setRMistakes((m) => [...m, { ...card, userInput: rInput, reason }]);
    reviewResult(idOf(card.deck, card.front), correct);
  };
  const nextReverse = () => {
    if (rIdx >= rOrder.length - 1) { setRInput(""); setRFlipped(false); setRFinished(true); return; }
    setRInput("");
    setRFlipped(false);
    setRIdx((i) => i + 1);
  };
  const restartReverse = () => {
    const pool = weightedSample(reversePool, Math.min(ROUND_SIZE, reversePool.length), progress || {});
    setROrder(pool); setRIdx(0); setRInput(""); setRFlipped(false); setRScore({ right: 0, total: 0 }); setRMistakes([]); setRFinished(false);
  };
  const retryMistakesReverse = () => {
    if (rMistakes.length === 0) return;
    const pool = rMistakes.map((m) => ({ deck: m.deck, front: m.front, type: m.type, english: m.english, example: m.example, exampleEn: m.exampleEn }));
    setROrder(pool); setRIdx(0); setRInput(""); setRFlipped(false); setRScore({ right: 0, total: 0 }); setRMistakes([]); setRFinished(false);
  };

  // Cloze Mode handlers - validates against clozeAnswer (the word actually
  // removed from the sentence), not card.front, since the two can differ
  // (article-stripped nouns, conjugated verb forms - see buildRound.js).
  const submitCloze = () => {
    if (!cInput.trim() || cFlipped) return;
    const card = cOrder[cIdx % cOrder.length];
    const correct = isClozeCorrect(cInput, card);
    setCFlipped(true);
    setCScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
    if (!correct) setCMistakes((m) => [...m, { ...card, userInput: cInput }]);
    reviewResult(idOf(card.deck, card.front), correct);
  };
  const nextCloze = () => {
    if (cIdx >= cOrder.length - 1) { setCInput(""); setCFlipped(false); setCFinished(true); return; }
    setCInput("");
    setCFlipped(false);
    setCIdx((i) => i + 1);
  };
  const restartCloze = () => {
    const n = resolveClozeRoundSize(clozeSizePref, clozePool.length);
    setCOrder(buildClozeRound(clozePool, progress, n));
    setCIdx(0); setCInput(""); setCFlipped(false); setCScore({ right: 0, total: 0 }); setCMistakes([]); setCFinished(false);
  };
  const retryMistakesCloze = () => {
    if (cMistakes.length === 0) return;
    setCOrder(shuffled(cMistakes));
    setCIdx(0); setCInput(""); setCFlipped(false); setCScore({ right: 0, total: 0 }); setCMistakes([]); setCFinished(false);
  };

  // Word Search handlers - no scoring/mistakes tracking (see state
  // comment above: deliberately not FSRS-graded), just which words have
  // been found/hinted in the current puzzle.
  const foundWordWs = (word) => {
    setWsFound((prev) => new Set(prev).add(word));
  };
  const hintWordWs = (word) => {
    setWsHinted((prev) => new Set(prev).add(word));
  };
  const revealWs = () => setWsRevealed(true);
  const finishWs = () => setWsFinished(true);
  const restartWs = () => {
    const n = resolveWordSearchSize(wsSizePref, wsPool.length);
    setWsRoundData(buildWordSearchRound(wsPool, n));
    setWsFound(new Set()); setWsHinted(new Set()); setWsRevealed(false); setWsFinished(false);
  };

  // filtered decks

  // combined (multi-topic) filtered deck
  const filteredCombo = useMemo(
    () => comboDeck.filter((c) => comboFilter.includes(c.type) && passesGlobalFilters(c, levelFilter, sourceFilter)),
    [comboDeck, comboFilter, levelFilter, sourceFilter]
  );
  const comboCard = filteredCombo[comboIdx % (filteredCombo.length || 1)];

  // ---- app-wide search (engine/globalSearch.js): while there is a query,
  // the results replace the mode content below. Every card and every grammar
  // topic is searched, whatever topics are selected. A grammar result opens
  // its topic; "← Zurück" there returns to the results (the query stays).
  const searching = query.trim() !== "" && !grammarFocus;

  // ---- "📅 Heute fällig" (engine/review.js): every studied card whose
  // review date has come, from all decks, reviewed in sessions of
  // REVIEW_SIZE. While a session runs it replaces the mode content; the
  // cards are a snapshot, so grading one doesn't reshuffle the session.
  const dueAll = useMemo(() => dueCards(progress, ALL_CARDS), [progress]);
  const [review, setReview] = useState(null); // { cards, n }
  // opts: { learning, title } - the 🎯 plan's new-words session
  const startReview = (cards, opts = {}) => {
    setShowMistakes(false);
    setReview({ cards, n: Date.now(), ...opts });
    setQuery("");
    setGrammarFocus(null);
    setTopicsOpen(false);
    showContent("content");
  };
  const reviewing = Boolean(review) && !searching;
  const dtzOpen = Boolean(dtzView) && !searching && !reviewing;
  const mistakesOpen = showMistakes && !searching && !reviewing && !dtzOpen;
  // the Fehlerheft's entries that still exist (renamed or removed cards and
  // questions drop out)
  const mistakeEntries = useMemo(() => {
    const words = [];
    const grammar = [];
    for (const e of sortedEntries(mistakeBook)) {
      if (isGrammarMistakeId(e.id)) {
        const g = GRAMMAR_QUESTION_BY_ID.get(e.id);
        if (g) grammar.push({ ...e, ...g });
      } else {
        const card = CARD_BY_ID.get(e.id);
        if (card) words.push({ ...e, card });
      }
    }
    return { words, grammar };
  }, [mistakeBook]);
  const mistakeCount = mistakeEntries.words.length + mistakeEntries.grammar.length;
  // 🆕 chapters added recently that the learner hasn't opened yet (engine/newTopics.js)
  const [seenNew, setSeenNew] = useState(() => {
    const v = readSaved(STORAGE_KEYS.SEEN_NEW);
    return Array.isArray(v) ? v : [];
  });
  const markTopicSeen = (key) => setSeenNew((prev) => {
    const next = [...prev, key];
    try { localStorage.setItem(STORAGE_KEYS.SEEN_NEW, JSON.stringify(next)); } catch { /* storage off */ }
    return next;
  });
  const progressCount = Object.keys(progress).length;
  const backupDue = progressCount >= 20 && (!lastBackupAt || Date.now() - lastBackupAt > 14 * DAY_MS);
  // search results or a review session cover the mode's own controls
  const overlay = searching || reviewing || mistakesOpen || dtzOpen;
  const searchCardResults = useMemo(() => searchCards(ALL_CARDS, query), [query]);
  const searchTopicResults = useMemo(() => searchGrammar(GRAMMAR_SEARCH, query, lang), [query, lang]);
  // "… öffnen →" under a found card: select its chapter and show that card,
  // in the chapter's natural order with every filter open
  const openChapterAt = (deck, front) => {
    const view = DECK_VIEWS[deck];
    if (view) setExtraSlice(deck)({ ...initialSlice(view), idx: Math.max(0, view.cards.findIndex((c) => c.front === front)) });
    setTabs([deck]);
    setQuery("");
    setMode(MODE.CARDS);
    setGrammarFocus(null);
    setGrammarFrom(null);
    setShowMistakes(false);
    showContent("tabs");
  };
  const newTopics = newTopicsOf(EXTRA_TOPICS, { seen: seenNew, selected: tabs });

  // 🎯 Heute lernen: the four steps of today's plan
  const today = localDateStr();
  const day = freshDaily(daily, today);
  const [newPerDay, setNewPerDay] = useState(() => {
    const v = readSaved(STORAGE_KEYS.NEW_PER_DAY);
    return NEW_PER_DAY_PRESETS.includes(v) ? v : DEFAULT_NEW_PER_DAY;
  });
  const cycleNewPerDay = () => setNewPerDay((n) => {
    const next = NEW_PER_DAY_PRESETS[(NEW_PER_DAY_PRESETS.indexOf(n) + 1) % NEW_PER_DAY_PRESETS.length];
    try { localStorage.setItem(STORAGE_KEYS.NEW_PER_DAY, JSON.stringify(next)); } catch { /* storage off */ }
    return next;
  });
  const newLeft = Math.max(0, newPerDay - day.newIds.length);
  const newCandidates = useMemo(() => newCardsFor(ALL_CARDS, progress, tabs, idOf, newLeft), [progress, tabs, newLeft]);
  const grammarDueKeys = GRAMMAR_TOPICS.filter((t) => isTopicDue(grammarSchedule[t.key], today)).map((t) => t.key);
  const nextGrammar = nextGrammarTopic(GRAMMAR_TOPICS, GRAMMAR_EXERCISES, grammarSchedule, today);
  const nextGrammarTitle = nextGrammar ? (GRAMMAR_TOPICS.find((t) => t.key === nextGrammar.key).title.de) : "";
  const mistakesOpenToday = [...mistakeEntries.words, ...mistakeEntries.grammar].filter((e) => !e.rightDays.includes(today)).length;
  const planSteps = [
    {
      key: "review", icon: "📅",
      label: dueAll.length ? `${dueAll.length} ${dueAll.length === 1 ? "Karte" : "Karten"} wiederholen` : "Wiederholen",
      detail: dueAll.length ? "Fällig aus allen Kapiteln" : "Nichts mehr fällig",
      done: dueAll.length === 0,
      onStart: dueAll.length ? () => startReview(dueAll.slice(0, REVIEW_SIZE)) : undefined,
    },
    {
      key: "new", icon: "🆕",
      label: `Neue Wörter: ${day.newIds.length} / ${newPerDay}`,
      detail: newLeft === 0 ? "Tagesziel erreicht" : newCandidates.length ? `Als Nächstes aus ${(DECK_META[newCandidates[0].deck] || {}).label || newCandidates[0].deck}` : "Alle Karten schon gelernt",
      extra: (
        <button type="button" onClick={cycleNewPerDay} aria-label={`Tagesziel ändern (jetzt ${newPerDay})`} style={{ marginLeft: 6, padding: 0, background: "none", border: "none", color: "#8fb8d8", fontSize: 11, textDecoration: "underline", cursor: "pointer" }}>Ziel ändern</button>
      ),
      done: newLeft === 0 || newCandidates.length === 0,
      action: "Lernen",
      onStart: newLeft > 0 && newCandidates.length ? () => startReview(newCandidates, { learning: true, title: "🆕 Neue Wörter" }) : undefined,
    },
    {
      key: "mistakes", icon: "📕",
      label: mistakeCount ? `Fehlerheft: ${mistakesOpenToday} offen` : "Fehlerheft",
      detail: mistakeCount ? `${mistakeCount} ${mistakeCount === 1 ? "Eintrag" : "Einträge"} – heute einmal richtig beantworten` : "Keine offenen Fehler",
      done: mistakesOpenToday === 0,
      action: "Öffnen",
      onStart: mistakeCount ? () => { setShowMistakes(true); setTopicsOpen(false); showContent("content"); } : undefined,
    },
    {
      key: "grammar", icon: "✏️",
      label: nextGrammar ? `${nextGrammar.due ? "Wiederholen" : "Neu"}: ${nextGrammarTitle}` : "Grammatik",
      detail: day.grammar ? "Heute schon geübt" : nextGrammar ? "Thema lesen, dann ✏️ Übung am Ende" : "Nichts fällig",
      done: day.grammar || !nextGrammar,
      action: "Öffnen",
      onStart: nextGrammar ? () => openGrammar(nextGrammar.key) : undefined,
    },
  ];

  // Phone back button / back swipe: undo the top-most thing first (a dialog,
  // a picker, the grammar page a card opened, the search, a review), then go
  // to the Karten tab; only from there does back leave the app.
  const backAction =
    showWelcome ? () => { setShowWelcome(false); saveWelcomeSeen(); }
    : showHelp ? () => setShowHelp(false)
    : showBackup ? () => setShowBackup(false)
    : langOpen ? () => setLangOpen(false)
    : mode === MODE.GRAMMAR && grammarFrom ? backFromGrammar
    : query !== "" ? () => setQuery("")
    : review ? () => setReview(null)
    : dtzView && dtzView.kind !== "home" ? () => {
      if (dtzView.kind === "sim" && !dtzView.done && !window.confirm("Simulation abbrechen? Die Antworten gehen verloren.")) return;
      setDtzView({ kind: "home" });
    }
    : dtzView ? () => setDtzView(null)
    : showMistakes ? () => setShowMistakes(false)
    : mode === MODE.READING && readingKey ? () => setReadingKey(null)
    : topicsOpen ? () => setTopicsOpen(false)
    : mode !== MODE.CARDS ? () => { setMode(MODE.CARDS); setGrammarFocus(null); setGrammarFrom(null); }
    : null;
  useBackButton(backAction);

  // keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const dir = e.key === "ArrowRight" ? 1 : -1;
      if (!single) { step(setComboIdx, filteredCombo.length)(dir); return; }
      const view = DECK_VIEWS[onlyTab];
      if (!view) return;
      const total = visibleCards(view, extra[onlyTab], levelFilter, sourceFilter).length;
      if (!total) return;
      setExtra((prev) => ({ ...prev, [onlyTab]: { ...prev[onlyTab], idx: (prev[onlyTab].idx + dir + total) % total } }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [single, onlyTab, filteredCombo.length, extra, levelFilter, sourceFilter]);

  const TABS = [
    ["kleidung", "👕 Kleidung"],
    ["verkehr", "🚦 Straßenverkehr"],
    ["haushalt", "🧹 Haushalt"],
    ["irregular", "🎵 Irregular"],
    ["inseparable", "🔑 Nicht trennbar"],
    ...EXTRA_TOPICS.map((t) => [t.key, `${t.icon} ${t.label}`]),
  ];

  const typeColor = (key) => (key === "n" ? "#4f86c6" : TYPE_META[key].color);

  const typeFilterRow = (cats, allKeys, active, setActive, setIdx) => (
    <CategoryFilter
      cats={cats}
      allKeys={allKeys}
      active={active}
      onChange={setActive}
      setIdx={setIdx}
      colorFor={typeColor}
    />
  );

  return (
    <ProgressCtx.Provider value={{ progress, mark }}>
    <GrammarNavCtx.Provider value={grammarNav}>
    <div style={{ minHeight: "100vh", background: "#0e1419", fontFamily: "system-ui, sans-serif", padding: "28px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ position: "relative", minHeight: 40 }}>
          <h1 style={{ color: "#f2f5f8", fontSize: "clamp(18px, 5.6vw, 22px)", fontWeight: 800, textAlign: "center", margin: "0 0 4px", padding: "0 52px", lineHeight: "40px", whiteSpace: "nowrap", pointerEvents: "none" }}>
            Deutsch Flashcards
          </h1>
          <button
            onClick={() => setShowHelp(true)}
            title="Übersicht"
            style={{
              position: "absolute", top: 0, right: 0, zIndex: 1, width: 40, height: 40, borderRadius: "50%",
              border: "1px solid #2c3a47", background: "#1a232b", color: "#9ab0c2", fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >❓</button>
          {(() => {
            const cur = LANGUAGES.find(([k]) => k === lang);
            return (
              <button
                onClick={() => setLangOpen((o) => !o)}
                aria-expanded={langOpen}
                aria-label="Sprache der Übersetzungen wählen"
                title="Sprache der Übersetzungen"
                style={{
                  position: "absolute", top: 0, left: 0, zIndex: 1, height: 40, minWidth: 40, padding: "0 8px", borderRadius: 20,
                  border: "1px solid #2c3a47", background: langOpen ? "#2c3a47" : "#1a232b", color: "#9ab0c2",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}
              >{cur ? cur[2] : "🌐"}<span aria-hidden="true" style={{ fontSize: 10, marginLeft: 3 }}>▾</span></button>
            );
          })()}
        </div>
        {langOpen && (
        <>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "10px 0", flexWrap: "wrap" }}>
          {LANGUAGES.map(([key, label, flag]) => (
            <button
              key={key}
              onClick={() => { setLang(key); saveLang(key); setLangOpen(false); }}
              title="Sprache der Übersetzungen"
              style={{
                padding: "5px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: lang === key ? "none" : "1px solid #2c3a47",
                background: lang === key ? "#e0833b" : "#1a232b",
                color: lang === key ? "#0e1419" : "#9ab0c2",
              }}
            >{flag} {label}</button>
          ))}
          {customLangs.map((name) => (
            <span key={name} style={{ display: "inline-flex", alignItems: "center", borderRadius: 10, overflow: "hidden", border: lang === name ? "none" : "1px solid #2c3a47" }}>
              <button
                onClick={() => { setLang(name); saveLang(name); setLangOpen(false); }}
                style={{ padding: "5px 10px", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: lang === name ? "#e0833b" : "#1a232b", color: lang === name ? "#0e1419" : "#9ab0c2" }}
              >{name}</button>
              <button
                onClick={() => removeCustomLang(name)}
                title="Entfernen"
                style={{ padding: "5px 8px", border: "none", fontSize: 12, cursor: "pointer", background: lang === name ? "#e0833b" : "#1a232b", color: lang === name ? "#0e1419" : "#7d8d9c" }}
              >×</button>
            </span>
          ))}
          {addingLang ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <input
                autoFocus
                value={newLangText}
                onChange={(e) => setNewLangText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomLang(); } if (e.key === "Escape") { setAddingLang(false); setNewLangText(""); } }}
                placeholder="z. B. Türkisch"
                style={{ width: 100, padding: "5px 8px", borderRadius: 8, border: "1px solid #e0833b", background: "#161d24", color: "#f2f5f8", fontSize: 12, outline: "none" }}
              />
              <button onClick={addCustomLang} style={{ padding: "5px 9px", borderRadius: 8, border: "none", background: "#5fa85f", color: "#0e1419", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓</button>
              <button onClick={() => { setAddingLang(false); setNewLangText(""); }} style={{ padding: "5px 9px", borderRadius: 8, border: "1px solid #2c3a47", background: "transparent", color: "#7d8d9c", fontSize: 12, cursor: "pointer" }}>×</button>
            </span>
          ) : (
            <button
              onClick={() => setAddingLang(true)}
              title="Weitere Sprache hinzufügen"
              style={{ padding: "5px 10px", borderRadius: 10, border: "1px dashed #2c3a47", background: "transparent", color: "#7d8d9c", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >➕</button>
          )}
        </div>
        <p style={{ color: "#5a6b78", fontSize: 11, textAlign: "center", margin: "0 0 4px" }}>
          Übersetzungssprache wählen, oder ➕ für eine eigene Sprache
        </p>
        </>
        )}
        <div style={{ height: 14 }} />

        <StreakBar streak={displayStreak} count={streakData.count} goal={streakData.goal} recordStreak={streakData.recordStreak} onCycleGoal={cycleGoal} />

        {backupDue && !reviewing && (
          <button
            onClick={() => setShowBackup(true)}
            style={{
              display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12,
              padding: "8px 14px", borderRadius: 12, border: "1px dashed #3a5670", background: "transparent",
              color: "#8fb8d8", fontSize: 13, cursor: "pointer", textAlign: "left",
            }}
          >
            <span>💾 {lastBackupAt ? `Seit ${Math.floor((Date.now() - lastBackupAt) / DAY_MS)} Tagen nicht gesichert` : "Fortschritt noch nie gesichert"}</span>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Sichern →</span>
          </button>
        )}

        {/* 🎯 HEUTE LERNEN - due reviews, new words, Fehlerheft, one grammar topic */}
        {!overlay && (
          <DailyPlan steps={planSteps} collapsed={day.collapsed} onToggle={() => updateDaily((d) => ({ ...d, collapsed: !d.collapsed }))} />
        )}

        {/* 🆕 NEW CHAPTER - new chapters aren't ticked automatically */}
        {!overlay && newTopics.slice(0, 2).map((t) => (
          <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 8px 8px 14px", borderRadius: 12, border: "1px solid #5fa85f", background: "rgba(95,168,95,.1)" }}>
            <button
              onClick={() => { markTopicSeen(t.key); openChapterAt(t.key, t.cards[0].front); }}
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "none", border: "none", padding: 0, color: "#f2f5f8", fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" }}
            >
              <span>🆕 Neues Kapitel: {t.icon} {t.label} · {t.cards.length} Karten</span>
              <span style={{ color: "#5fa85f", whiteSpace: "nowrap" }}>Öffnen →</span>
            </button>
            <button onClick={() => markTopicSeen(t.key)} aria-label={`Hinweis ausblenden: ${t.label}`} style={{ flexShrink: 0, padding: "4px 8px", background: "none", border: "none", color: "#7d8d9c", fontSize: 16, cursor: "pointer" }}>✕</button>
          </div>
        ))}

        {/* TABS - multi-select topics, folded into one summary row */}
        {(() => {
          const allOn = TABS.every(([k]) => tabs.includes(k));
          const labelOf = (k) => (TABS.find(([key]) => key === k) || [k, k])[1];
          const summary = allOn ? `Alle · ${TABS.length} Themen`
            : tabs.length === 1 ? labelOf(tabs[0])
            : `${tabs.length} Themen · ${tabs.map((k) => labelOf(k).split(" ")[0]).join(" ")}`;
          return (
            <button
              onClick={() => setTopicsOpen((o) => !o)}
              aria-expanded={topicsOpen}
              style={{
                display: "flex", width: "100%", alignItems: "center", gap: 8, marginBottom: topicsOpen ? 10 : 12,
                padding: "10px 14px", borderRadius: 12, border: "1px solid #2c3a47", background: "#1a232b",
                color: "#f2f5f8", fontSize: 14, cursor: "pointer", textAlign: "left",
              }}
            >
              <span style={{ color: "#7d8d9c", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>📚 Themen</span>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{summary}</span>
              <span aria-hidden="true" style={{ color: "#7d8d9c" }}>{topicsOpen ? "▴" : "▾"}</span>
            </button>
          );
        })()}
        {topicsOpen && (
        <>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10, flexWrap: "wrap" }}>
          {(() => {
            const allOn = TABS.every(([k]) => tabs.includes(k));
            return (
              <button
                onClick={() => { setTabs(allOn ? ["kleidung"] : TABS.map(([k]) => k)); setQuery(""); }}
                style={{
                  padding: "7px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: allOn ? "none" : "1px solid #2c3a47",
                  background: allOn ? "#e0833b" : "#1a232b",
                  color: allOn ? "#0e1419" : "#9ab0c2",
                }}
              >{allOn ? "✓ " : ""}Alle</button>
            );
          })()}
          {TABS.map(([key, lbl]) => {
            const on = tabs.includes(key);
            return (
              <button
                key={key}
                onClick={() => {
                  // toggle, but never allow an empty selection
                  const next = on ? tabs.filter((k) => k !== key) : [...tabs, key];
                  setTabs(next.length ? next : [key]);
                  setQuery("");
                }}
                style={{
                  padding: "7px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: on ? "none" : "1px solid #2c3a47",
                  background: on ? "#e0833b" : "#1a232b",
                  color: on ? "#0e1419" : "#9ab0c2",
                }}
              >{on ? "✓ " : ""}{lbl}</button>
            );
          })}
        </div>

        <button
          onClick={() => { setTopicsOpen(false); showContent("tabs"); }}
          style={{ display: "block", margin: "0 auto 14px", padding: "7px 18px", borderRadius: 10, border: "none", background: "#e0833b", color: "#0e1419", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >✓ Fertig</button>
        </>
        )}

        {/* SEARCH */}
        <div style={{ position: "relative", marginBottom: 18 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#7d8d9c", pointerEvents: "none" }}>🔍</span>
          <input
            type="search"
            aria-label="Suchen in allen Wörtern und der Grammatik"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setGrammarFocus(null); }}
            placeholder="Suchen: Wörter & Grammatik"
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px 36px 10px 36px",
              borderRadius: 12, border: "1px solid #2c3a47", background: "#161d24",
              // 16px: smaller text makes iPhones zoom into the page on focus
              color: "#f2f5f8", fontSize: 16, outline: "none", appearance: "none",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Suche löschen"
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "#7d8d9c", fontSize: 18, cursor: "pointer",
              }}
            >×</button>
          )}
        </div>

        {/* LEVEL / SOURCE FILTERS - crosscutting facets independent of topic.
            Level row is always shown (every card is classified). Source row
            only appears once 2+ distinct chapters exist in the current
            selection - mirrors how the type-filter row already hides itself
            when only one card type is present. Both narrow every mode below,
            not just Cards - see selectionCards, which feeds Quiz/Article/
            Reverse/Cloze/Word Search rounds. */}
        {!overlay && availableLevels.length > 1 && (
          <CategoryFilter
            cats={availableLevels.map((l) => [l, l])}
            allKeys={availableLevels}
            active={levelFilter}
            onChange={setLevelFilter}
            setIdx={resetDeckPositions}
            colorFor={(l) => (l === "A1" ? "#5fa85f" : "#e0833b")}
          />
        )}
        {!overlay && availableSources.length > 1 && (
          <CategoryFilter
            cats={availableSources.map((s) => [s, s.replace(/^Menschen A2 · /, "")])}
            allKeys={availableSources}
            active={sourceFilter}
            onChange={setSourceFilter}
            setIdx={resetDeckPositions}
            colorFor={() => "#4f86c6"}
          />
        )}

        {/* MODE SWITCH + PROGRESS */}
        {/* Ten tabs in two even rows of five, the same on every screen
            (the column is at most 480px, too narrow for ten in a row):
            every button is icon over label, counts are corner badges. */}
        <div ref={tabsRef} style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "10px 5px", marginTop: 8, marginBottom: 14 }}>
          {MODE_TABS({
            article: articleNouns.length, cloze: clozePool.length, wordsearch: wsPool.length,
            forms: formsPools.perfekt.length + formsPools.plural.length, satzbau: satzbauPool.length, reading: readingTexts.length,
          }).map((tab) => {
            const active = mode === tab.mode;
            return (
              <button
                key={tab.mode}
                onClick={() => { setMode(tab.mode); setGrammarFocus(null); setGrammarFrom(null); setQuery(""); setReview(null); setShowMistakes(false); setDtzView(null); showContent("tabs"); }}
                aria-pressed={active}
                aria-label={tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label}
                style={{
                  position: "relative",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                  minHeight: 52, padding: "6px 2px", borderRadius: 12, border: "1px solid #2c3a47",
                  background: active ? "#e0833b" : "#1a232b", color: active ? "#0e1419" : "#9ab0c2",
                  cursor: "pointer",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>{tab.icon}</span>
                <span style={{ fontSize: "clamp(10px, 2.9vw, 12px)", fontWeight: 700, whiteSpace: "nowrap", letterSpacing: -0.2 }}>{tab.label}</span>
                {tab.count !== undefined && (
                  <span aria-hidden="true" style={{
                    position: "absolute", top: -7, right: -3, minWidth: 16, padding: "0 4px", borderRadius: 8,
                    fontSize: 10, fontWeight: 700, lineHeight: "15px", textAlign: "center", border: "1px solid #0e1419",
                    background: active ? "rgba(14,20,25,.22)" : "#2c3a47", color: active ? "#0e1419" : "#cdd8e2",
                  }}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>
        {/* 🎓 DTZ - exam practice, independent of the selected topics */}
        {!overlay && (
          <button
            onClick={() => { setDtzView({ kind: "home" }); setTopicsOpen(false); showContent("content"); }}
            style={{
              display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: -4, marginBottom: 14,
              padding: "10px 14px", borderRadius: 12, border: "1px solid #3a5670", background: "rgba(143,184,216,.08)",
              color: "#f2f5f8", fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left",
            }}
          >
            <span>🎓 DTZ-Prüfungstraining <span style={{ fontSize: 12, fontWeight: 600, color: "#9ab0c2" }}>· Hören & Lesen</span></span>
            <span style={{ color: "#8fb8d8", whiteSpace: "nowrap" }}>Öffnen →</span>
          </button>
        )}
        {!overlay && mode === MODE.CARDS && selectionCards.length > 0 && <ProgressBar known={knownCount} total={selectionCards.length} due={dueCount} />}
        {!overlay && mode === MODE.ARTICLE && !aFinished && (
          <RoundSizeSelector onCycle={cycleArticleSize} label={articleSizeLabel(articleSizePref)} />
        )}
        {!overlay && mode === MODE.REVERSE && !rFinished && (
          <RoundSizeSelector onCycle={cycleReverseSize} label={articleSizeLabel(reverseSizePref)} />
        )}
        {!overlay && mode === MODE.CLOZE && !cFinished && (
          <RoundSizeSelector onCycle={cycleClozeSize} label={articleSizeLabel(clozeSizePref)} />
        )}
        {!overlay && mode === MODE.WORDSEARCH && !wsFinished && (
          <RoundSizeSelector onCycle={cycleWsSize} label={articleSizeLabel(wsSizePref)} />
        )}

        <div ref={contentRef} />
        <ErrorBoundary resetKey={mode} label={mode}>
        {searching ? (
          <SearchResults
            query={query}
            cards={searchCardResults}
            topics={searchTopicResults}
            lang={lang}
            onOpenTopic={openGrammar}
            onOpenChapter={openChapterAt}
          />
        ) : dtzOpen ? (
          <DtzTrainer
            sets={DTZ_SETS}
            view={dtzView}
            setView={(v) => { setDtzView(v); showContent("content"); }}
            results={dtzResults}
            onResult={saveDtzResult}
            onClose={() => setDtzView(null)}
          />
        ) : mistakesOpen ? (
          <MistakeBook
            words={mistakeEntries.words}
            grammar={mistakeEntries.grammar}
            lang={lang}
            onPracticeWords={() => startReview(mistakeEntries.words.map((w) => w.card))}
            onGrammarAnswer={recordMistake}
            onOpenChapter={openChapterAt}
            onClose={() => setShowMistakes(false)}
          />
        ) : reviewing ? (
          <ReviewSession
            key={review.n}
            cards={review.cards}
            lang={lang}
            onGrade={review.learning ? (id, correct) => reviewResult(id, correct, { learning: true }) : reviewResult}
            onExit={() => setReview(null)}
            onRepeat={(missed) => startReview(missed, { learning: review.learning, title: review.title })}
            moreCount={review.learning ? 0 : dueAll.length}
            title={review.title}
            onMore={() => startReview(dueAll.slice(0, REVIEW_SIZE))}
          />
        ) : mode === MODE.ARTICLE ? (
          aFinished ? (
            <ArticleSummary
              score={aScore}
              mistakes={aMistakes}
              onRestart={restartArticle}
              onRetryMistakes={retryArticleMistakes}
            />
          ) : (
            <ArticleTrainer
              nouns={aOrder}
              idx={aIdx}
              choice={aChoice}
              score={aScore}
              onChoose={chooseArticle}
              onNext={nextArticle}
              totalAvailable={articleNouns.length}
              lang={lang}
            />
          )
        ) : mode === MODE.QUIZ ? (
          qFinished ? (
            <QuizSummary
              score={qScore}
              mistakes={qMistakes}
              onRestart={restartQuiz}
              onRetryMistakes={retryMistakes}
            />
          ) : (
            <QuizTrainer
              questions={qOrder}
              idx={qIdx}
              choice={qChoice}
              score={qScore}
              onChoose={chooseQuiz}
              onNext={nextQuiz}
              lang={lang}
            />
          )
        ) : mode === MODE.REVERSE ? (
          rFinished ? (
            <ReverseSummary
              score={rScore}
              mistakes={rMistakes}
              onRestart={restartReverse}
              onRetryMistakes={retryMistakesReverse}
            />
          ) : (
            <ReverseTrainer
              cards={rOrder}
              idx={rIdx}
              input={rInput}
              flipped={rFlipped}
              score={rScore}
              onInput={setRInput}
              onSubmit={submitReverse}
              onNext={nextReverse}
              totalAvailable={reversePool.length}
              lang={lang}
              prompt={reversePrompt}
              onPromptChange={changeReversePrompt}
            />
          )
        ) : mode === MODE.CLOZE ? (
          cFinished ? (
            <ClozeSummary
              score={cScore}
              mistakes={cMistakes}
              onRestart={restartCloze}
              onRetryMistakes={retryMistakesCloze}
            />
          ) : (
            <ClozeTrainer
              cards={cOrder}
              idx={cIdx}
              input={cInput}
              flipped={cFlipped}
              score={cScore}
              onInput={setCInput}
              onSubmit={submitCloze}
              onNext={nextCloze}
              totalAvailable={clozePool.length}
            />
          )
        ) : mode === MODE.WORDSEARCH ? (
          wsRoundData.placements.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "#7d8d9c" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🔤</div>
              <div style={{ fontSize: 15, color: "#cdd8e2", fontWeight: 600 }}>Kein Wortgitter für diese Auswahl</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Nur einzelne Wörter mit Beispielsatz eignen sich für das Wortgitter.</div>
            </div>
          ) : wsFinished ? (
            <WordSearchSummary
              placements={wsRoundData.placements}
              foundWords={wsFound}
              onRestart={restartWs}
            />
          ) : (
            <WordSearchTrainer
              roundData={wsRoundData}
              foundWords={wsFound}
              onFound={foundWordWs}
              hintedWords={wsHinted}
              onHint={hintWordWs}
              onReveal={revealWs}
              revealed={wsRevealed}
              onFinish={finishWs}
            />
          )
        ) : mode === MODE.FORMS ? (
          <>
            <div role="group" aria-label="Formen" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[["perfekt", "Perfekt"], ["plural", "Plural"]].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={formsKind === k}
                  onClick={() => setFormsKind(k)}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    border: formsKind === k ? "none" : "1px solid #2c3a47",
                    background: formsKind === k ? "#4f86c6" : "#1a232b", color: formsKind === k ? "#0e1419" : "#9ab0c2",
                  }}
                >{label} ({formsPools[k].length})</button>
              ))}
            </div>
            <FormsTrainer
              key={`${formsKind}|${formsPools[formsKind].length}|${tabs.join(",")}`}
              kind={formsKind}
              pool={formsPools[formsKind]}
              progress={progress}
              onGrade={reviewResult}
            />
          </>
        ) : mode === MODE.SATZBAU ? (
          <SatzbauTrainer key={`${tabs.join(",")}|${satzbauPool.length}`} pool={satzbauPool} />
        ) : mode === MODE.READING ? (
          <ReadingView
            texts={readingTexts}
            allTexts={READING_TEXTS}
            openKey={readingKey}
            onOpen={(key) => { setReadingKey(key); showContent("content"); }}
            lang={lang}
            scores={readingScores}
            onScore={saveReadingScore}
            onOpenChapter={openChapterAt}
          />
        ) : mode === MODE.GRAMMAR ? (
          <GrammarView
            topics={GRAMMAR_TOPICS}
            words={GRAMMAR_INDEX.wordsByTopic}
            lang={lang}
            focus={grammarFocus}
            onBack={grammarFrom ? backFromGrammar : undefined}
            onOpenChapter={openChapterAt}
            onExerciseAnswer={(key, item, correct) => recordMistake(grammarMistakeId(key, item.q), correct)}
            dueKeys={grammarDueKeys}
            onExerciseDone={finishGrammarRound}
          />
        ) : (
        <>
        {/* ONE DECK - the original five and every chapter (modes/cards) */}
        {single && DECK_VIEWS[onlyTab] && (
          <DeckView
            view={DECK_VIEWS[onlyTab]}
            slice={extra[onlyTab]}
            setSlice={setExtraSlice(onlyTab)}
            lang={lang}
            levelFilter={levelFilter}
            sourceFilter={sourceFilter}
          />
        )}

        {/* COMBINED - two or more topics selected ★ NEW */}
        {!single && (
          <>
            <div style={{ background: "#16202a", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: "#8fb8d8", textAlign: "center" }}>
              🔀 Gemischt - {tabs.map((k) => DECK_META[k].label).join(" · ")} · {comboBase.length} Karten
            </div>
            {comboCats.length > 1 &&
              typeFilterRow(comboCats, comboKeys, comboFilter, setComboFilter, setComboIdx)}
            {comboCard ? (
              <>
                <Swipeable onNext={() => step(setComboIdx, filteredCombo.length)(1)} onPrev={() => step(setComboIdx, filteredCombo.length)(-1)}>
                <FlipCard
                  front={comboCard.front}
                  english={comboCard.english}
                  example={comboCard.example}
                  exampleEn={comboCard.exampleEn}
                  type={comboCard.type}
                  gender={comboCard.gender}
                  deck={comboCard.deck}
                  cardId={idOf(comboCard.deck, comboCard.front)}
                  lang={lang}
                  level={comboCard.level}
                  source={comboCard.source}
                  note={comboCard.note}
                />
                </Swipeable>
                <Controls index={comboIdx % filteredCombo.length} total={filteredCombo.length}
                  onPrev={() => step(setComboIdx, filteredCombo.length)(-1)}
                  onNext={() => step(setComboIdx, filteredCombo.length)(1)}
                  onShuffle={() => {
                    if (comboShuffled) { setComboDeck(comboBase); setComboIdx(0); setComboShuffled(false); }
                    else { setComboDeck(shuffled(comboBase)); setComboFilter(comboKeys); setComboIdx(0); setComboShuffled(true); }
                  }}
                  isShuffled={comboShuffled} />
              </>
            ) : <NoResults />}
          </>
        )}

        </>
        )}
        </ErrorBoundary>

        <div style={{ marginTop: 28, color: "#4a5a68", fontSize: 11, textAlign: "center" }}>
          Tap a card to flip • swipe or ← → for the next card
        </div>
        <button
          onClick={() => setShowBackup(true)}
          style={{ display: "block", margin: "12px auto 0", padding: "8px 14px", borderRadius: 10, border: "1px solid #2c3a47", background: "#1a232b", color: "#9ab0c2", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >💾 Fortschritt sichern & App installieren</button>
        <div style={{ marginTop: 10, fontSize: 11, color: "#5a6b78", textAlign: "center" }}>{buildLabel()}</div>
      </div>
      {showWelcome && (
        <WelcomeModal
          lang={lang}
          onSelectLang={(key) => { setLang(key); saveLang(key); }}
          onClose={() => { setShowWelcome(false); saveWelcomeSeen(); }}
        />
      )}
      {showHelp && <HelpModal lang={lang} onClose={() => setShowHelp(false)} />}
      {showBackup && (
        <BackupModal
          onClose={() => setShowBackup(false)}
          progressCount={progressCount}
          lastBackupAt={lastBackupAt}
          onSaved={setLastBackupAt}
        />
      )}
    </div>
    </GrammarNavCtx.Provider>
    </ProgressCtx.Provider>
  );
}


export default App;
