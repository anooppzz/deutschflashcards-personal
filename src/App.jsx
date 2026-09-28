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
  GENDER_COLORS, TYPE_META, GROUP_COLORS,
  ROUND_SIZE, ARTICLE_SIZE_PRESETS, GOAL_PRESETS,
  LANGUAGES, HELP_FLAGS,
  MODE, MODE_TABS,
} from "./constants";
import {
  IRREGULAR_VERBS, INSEPARABLE_VERBS, HAUSHALT, VERKEHR, KLEIDUNG,
  EXTRA_TOPICS, DECK_META, GRAMMAR_TOPICS,
  DECK_SOURCE, EXTRA_KEYS, EXTRA_BY_KEY,
} from "./data";
import {
  storage,
  idOf, saveProgress,
  initFsrsCard, reviewFsrsCard, knownFsrsCard, reviewNowFsrsCard,
  isKnownStability, statusOfFsrs, dueLabel, migrateBoxEntry,
  localDateStr, addDaysStr, saveStreak, effectiveStreakDisplay,
  weightedSample, shuffled, matches,
  validateGermanWord,
  distinctLevels, distinctSources, passesGlobalFilters,
} from "./engine";
import {
  FlipCard, Controls, NoResults, CategoryFilter,
  StreakBar, ProgressBar, Modal, RoundSizeSelector, ErrorBoundary,
  badgeStyle, ctrlBtn,
} from "./components";
import { ProgressCtx } from "./context/ProgressCtx";
import { GrammarNavCtx } from "./context/GrammarNavCtx";
import {
  TypedTopicView,
  ArticleTrainer, ArticleSummary,
  buildArticleRoundStratified, saveArticleSizePref, resolveArticleRoundSize, articleSizeLabel,
  QuizTrainer, QuizSummary, buildQuiz,
  ReverseTrainer, ReverseSummary,
  ClozeTrainer, ClozeSummary, buildClozePool, buildClozeRound, saveClozeSizePref, resolveClozeRoundSize, isClozeCorrect,
  WordSearchTrainer, WordSearchSummary, buildWordSearchPool, buildWordSearchRound, resolveWordSearchSize,
  GrammarView,
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
const HAUS_CATS = [["n", "Nomen"], ["v", "Verben"], ["adj", "Adjektive"]];
const FULL_CATS = [["n", "Nomen"], ["v", "Verben"], ["adj", "Adjektive"], ["sonst", "Sonstige"]];
const HAUS_KEYS = HAUS_CATS.map(([k]) => k);
const FULL_KEYS = FULL_CATS.map(([k]) => k);
const GROUP_KEYS = Object.keys(GROUP_COLORS);

// deck registry for the multi-topic (combined) mode - see data/index.js

// precompute filter categories per topic + register in the global maps
EXTRA_TOPICS.forEach((t) => {
  const present = new Set(t.cards.map((c) => c.type));
  t.cats = FULL_CATS.filter(([k]) => present.has(k));
  t.keys = t.cats.map(([k]) => k);
  DECK_META[t.key] = { label: t.label, icon: t.icon };
  DECK_SOURCE[t.key] = t.cards;
});

// Unified card normalization (schema v1)
// Converts all deck shapes (irregular, inseparable, typed, extra topics) into one consistent output.
// Design goal: every learning mode reads the same fields, same optional-field structure.
// No display logic (accent/badge) is computed here — components handle that.
function normalizeCard(deckKey, c) {
  // irregular verbs: { group, infinitiv, präteritum, partizip, english, example }
  if (deckKey === "irregular") {
    const normalizedIrregular = {
      deck: deckKey,
      type: "v",
      front: c.infinitiv,
      english: c.english,
      example: c.example,
      conjugation: {
        präteritum: c.präteritum,
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

/* matches() now lives in engine/search.js */

/* ============================================================
   COMPONENTS
   ============================================================ */


/* ---- Multilingual support - V1 client-side translation engine.
   Two layers, tried in order, with the same translate-once-cache-forever
   philosophy as before (now backed by localStorage instead of an API):

   1. Chrome's built-in on-device Translator API - instant, zero download,
      because the model is already resident in the browser. Desktop Chrome
      only (confirmed: it does not work on mobile at all), so this is a
      bonus fast-path, never the foundation.
   2. A small (~30–45MB int8-quantized) per-language ONNX translation
      model, run via Transformers.js + WebAssembly. Works on any modern
      browser including mobile. Downloads once on first use of that
      language, then the browser caches the model file itself - every
      use after that, on any page reload, is instant and fully offline.

   REVISED: the WASM/native-Translator approach above was tried and dropped
   after real testing - three rounds of debugging (a sandbox-specific
   DataCloneError, then a model/runtime quantization incompatibility) never
   produced a single confirmed working translation, and it couldn't help
   custom/arbitrary languages anyway (no pre-built model exists for a name
   someone just typed in). MyMemory's free API, by contrast, worked cleanly
   on the first real test across all 4 curated languages. New approach,
   in priority order:
     1. A manual correction (see "✗ falsch?" in FlipCard/ArticleTrainer) -
        always wins, since a person said so directly.
     2. A small, hand-reviewed static table (real content work, not a live
        guess) - covers the words seeded so far.
     3. A hard-to-translate guard - slash-separated dual meanings and short
        idioms/function words are where MyMemory's real test results
        actually broke (e.g. "than" → a whole unrelated sentence in Hindi).
        Skip live translation for these rather than risk a confident wrong
        answer; show English instead.
     4. MyMemory's free API - works for both curated and custom languages,
        same mechanism, no key required. ---- */
const saveLang = (v) => { try { storage.set(STORAGE_KEYS.LANG, JSON.stringify(v)); } catch (e) {} };
const saveCustomLangs = (arr) => { try { storage.set(STORAGE_KEYS.CUSTOM_LANGS, JSON.stringify(arr)); } catch (e) {} };
const saveWelcomeSeen = () => { try { storage.set(STORAGE_KEYS.WELCOME_SEEN, "1"); } catch (e) {} };


/* ---- Onboarding text, translated. English is the canonical source (same
   convention as the vocabulary table), hand-translated into the curated
   languages. A custom/arbitrary typed language has no entry here - falls
   back to English rather than guessing, same principle as the hard-word
   guard in the vocabulary translation engine. As with the vocabulary table,
   Albanian is the one most worth a native speaker's spot-check. ---- */
const HELP_I18N = {
  "welcome.title": { en: "Welcome! 👋", de: "Willkommen! 👋", sq: "Mirë se vini! 👋", ar: "أهلاً بك! 👋", uk: "Ласкаво просимо! 👋", hi: "स्वागत है! 👋" },
  "welcome.pickLanguage": { en: "Choose your language:", de: "Wähle deine Sprache:", sq: "Zgjidh gjuhën tënde:", ar: "اختر لغتك:", uk: "Оберіть свою мову:", hi: "अपनी भाषा चुनें:" },
  "welcome.intro": { en: "Pick a few topics above, then start learning - in three modes:", de: "Wähle oben ein paar Themen, dann lerne los - in drei Modi:", sq: "Zgjidh disa tema sipër, pastaj fillo të mësosh - në tre mënyra:", ar: "اختر بعض المواضيع أعلاه، ثم ابدأ التعلم - بثلاث طرق:", uk: "Оберіть кілька тем вище, потім починайте навчання - у трьох режимах:", hi: "ऊपर कुछ विषय चुनें, फिर सीखना शुरू करें - तीन तरीकों से:" },
  "welcome.modeCards": { en: "Cards - flip through words and meanings", de: "Karten - Wörter und Bedeutungen durchblättern", sq: "Kartat - kalo nëpër fjalë dhe kuptime", ar: "البطاقات - تصفح الكلمات والمعاني", uk: "Картки - перегортайте слова та значення", hi: "कार्ड्स - शब्दों और अर्थों को पलटें" },
  "welcome.modeArticle": { en: "Article - practice der/die/das", de: "Artikel - der/die/das üben", sq: "Artikulli - praktiko der/die/das", ar: "أداة التعريف - تدرّب على der/die/das", uk: "Артикль - тренуйте der/die/das", hi: "आर्टिकल - der/die/das का अभ्यास करें" },
  "welcome.modeQuiz": { en: "Quiz - test meanings with multiple choice", de: "Quiz - Bedeutungen per Mehrfachauswahl testen", sq: "Kuizi - testo kuptimet me zgjedhje të shumëfishta", ar: "الاختبار - اختبر المعاني بأسئلة متعددة الخيارات", uk: "Квіз - перевіряйте значення через вибір варіантів", hi: "क्विज़ - बहुविकल्पीय प्रश्नों से अर्थ जाँचें" },
  "welcome.translations": { en: "Translations are available in Albanian, Arabic, Ukrainian, Hindi - or add your own language.", de: "Übersetzungen gibt es auf Albanisch, Arabisch, Ukrainisch, Hindi - oder füge deine eigene Sprache hinzu.", sq: "Përkthimet janë të disponueshme në shqip, arabisht, ukrainisht, hindisht - ose shto gjuhën tënde.", ar: "تتوفر الترجمات بالألبانية والعربية والأوكرانية والهندية - أو أضف لغتك الخاصة.", uk: "Переклади доступні албанською, арабською, українською, гінді - або додайте свою мову.", hi: "अनुवाद अल्बानियाई, अरबी, यूक्रेनी, हिंदी में उपलब्ध हैं - या अपनी भाषा जोड़ें।" },
  "welcome.footer": { en: "Your progress saves automatically. Tap ❓ anytime for a full overview.", de: "Dein Fortschritt wird automatisch gespeichert. Tippe jederzeit auf ❓ für eine vollständige Übersicht.", sq: "Përparimi yt ruhet automatikisht. Trokit ❓ në çdo kohë për një përmbledhje të plotë.", ar: "يُحفظ تقدمك تلقائيًا. اضغط على ❓ في أي وقت للحصول على نظرة عامة كاملة.", uk: "Ваш прогрес зберігається автоматично. Натисніть ❓ будь-коли для повного огляду.", hi: "आपकी प्रगति अपने आप सेव होती है। पूरी जानकारी के लिए कभी भी ❓ दबाएँ।" },
  "welcome.button": { en: "Let's go", de: "Los geht's", sq: "Le të fillojmë", ar: "هيا بنا", uk: "Розпочнімо", hi: "चलिए शुरू करें" },

  "help.title": { en: "Overview ❓", de: "Übersicht ❓", sq: "Përmbledhje ❓", ar: "نظرة عامة ❓", uk: "Огляд ❓", hi: "जानकारी ❓" },
  "help.section.start": { en: "Getting Started", de: "Erste Schritte", sq: "Si të fillosh", ar: "البدء", uk: "Початок роботи", hi: "शुरुआत कैसे करें" },
  "help.section.studying": { en: "While Studying", de: "Beim Lernen", sq: "Gjatë mësimit", ar: "أثناء الدراسة", uk: "Під час навчання", hi: "पढ़ाई के दौरान" },
  "help.section.article": { en: "Article Mode", de: "Artikel-Modus", sq: "Mënyra Artikull", ar: "وضع أداة التعريف", uk: "Режим артикля", hi: "आर्टिकल मोड" },
  "help.section.afterRound": { en: "After a Round", de: "Nach einer Runde", sq: "Pas një raundi", ar: "بعد انتهاء الجولة", uk: "Після раунду", hi: "राउंड के बाद" },
  "help.section.progress": { en: "Progress & Motivation", de: "Fortschritt & Motivation", sq: "Përparimi & Motivimi", ar: "التقدم والتحفيز", uk: "Прогрес і мотивація", hi: "प्रगति और प्रेरणा" },
  "help.section.newFeatures": { en: "More Ways to Study", de: "Weitere Lernwege", sq: "Mënyra të tjera për të mësuar", ar: "طرق أخرى للدراسة", uk: "Інші способи навчання", hi: "सीखने के और तरीके" },

  "help.tabs.label": { en: "Topic tabs", de: "Themen-Tabs", sq: "Skedat e temave", ar: "علامات تبويب المواضيع", uk: "Вкладки тем", hi: "टॉपिक टैब्स" },
  "help.tabs.desc": { en: "Select one or more topics at once. \"All\" selects every topic.", de: "Ein oder mehrere Themen gleichzeitig auswählen. \"Alle\" wählt jedes Thema.", sq: "Zgjidh një ose disa tema njëkohësisht. \"Të gjitha\" zgjedh çdo temë.", ar: "اختر موضوعًا واحدًا أو أكثر في الوقت نفسه. \"الكل\" يختار جميع المواضيع.", uk: "Оберіть одну або кілька тем одночасно. \"Усі\" обирає кожну тему.", hi: "एक या एक से अधिक विषय एक साथ चुनें। \"सभी\" हर विषय को चुनता है।" },
  "help.search.label": { en: "Search", de: "Suche", sq: "Kërko", ar: "البحث", uk: "Пошук", hi: "खोजें" },
  "help.search.desc": { en: "Filters within whichever topics are currently selected, in German or English.", de: "Filtert innerhalb der gerade gewählten Themen, auf Deutsch oder Englisch.", sq: "Filtron brenda temave aktualisht të zgjedhura, në gjermanisht ose anglisht.", ar: "يُصفّي ضمن المواضيع المختارة حاليًا، بالألمانية أو الإنجليزية.", uk: "Фільтрує в межах обраних тем, німецькою або англійською.", hi: "वर्तमान में चुने गए विषयों के भीतर खोजता है, जर्मन या अंग्रेज़ी में।" },
  "help.modes.label": { en: "Cards · Article · Quiz", de: "Karten · Artikel · Quiz", sq: "Kartat · Artikulli · Kuizi", ar: "البطاقات · أداة التعريف · الاختبار", uk: "Картки · Артикль · Квіз", hi: "कार्ड्स · आर्टिकल · क्विज़" },
  "help.modes.desc": { en: "Three study modes: flip through cards, practice der/die/das, or test meanings with multiple choice.", de: "Drei Lernmodi: durchblättern, der/die/das üben, oder Bedeutungen per Mehrfachauswahl testen.", sq: "Tre mënyra mësimi: kalo nëpër karta, praktiko der/die/das, ose testo kuptimet me zgjedhje të shumëfishta.", ar: "ثلاث طرق للدراسة: تصفح البطاقات، تدرّب على der/die/das، أو اختبر المعاني بأسئلة متعددة الخيارات.", uk: "Три режими навчання: перегортайте картки, тренуйте der/die/das, або перевіряйте значення через вибір варіантів.", hi: "तीन अध्ययन तरीके: कार्ड्स पलटें, der/die/das का अभ्यास करें, या बहुविकल्पीय प्रश्नों से अर्थ जाँचें।" },
  "help.language.label": { en: "Language", de: "Sprache", sq: "Gjuha", ar: "اللغة", uk: "Мова", hi: "भाषा" },
  "help.language.desc": { en: "Translations in SQ/AR/UK/HI - or add your own language with ➕.", de: "Übersetzungen in SQ/AR/UK/HI - oder über ➕ eine eigene Sprache hinzufügen.", sq: "Përkthime në SQ/AR/UK/HI - ose shto gjuhën tënde me ➕.", ar: "ترجمات بـ SQ/AR/UK/HI - أو أضف لغتك الخاصة عبر ➕.", uk: "Переклади SQ/AR/UK/HI - або додайте свою мову через ➕.", hi: "SQ/AR/UK/HI में अनुवाद - या ➕ से अपनी भाषा जोड़ें।" },
  "help.badge.label": { en: "Topic badge", de: "Themen-Tag", sq: "Etiketa e temës", ar: "شارة الموضوع", uk: "Значок теми", hi: "टॉपिक बैज" },
  "help.badge.desc": { en: "Shows which topic a word came from on every card - useful once several topics are mixed together.", de: "Zeigt auf jeder Karte, aus welchem Thema ein Wort stammt - hilfreich, wenn mehrere Themen gemischt sind.", sq: "Tregon nga cila temë vjen një fjalë në çdo kartë - e dobishme kur disa tema janë përzier së bashku.", ar: "يُظهر من أي موضوع جاءت الكلمة في كل بطاقة - مفيد عند خلط عدة مواضيع معًا.", uk: "Показує, з якої теми походить слово на кожній картці - корисно, коли кілька тем змішані разом.", hi: "हर कार्ड पर दिखाता है कि शब्द किस विषय से है - कई विषय मिलाने पर उपयोगी।" },
  "help.filter.label": { en: "Category filter", de: "Kategorie-Filter", sq: "Filtri i kategorisë", ar: "فلتر الفئة", uk: "Фільтр категорії", hi: "श्रेणी फ़िल्टर" },
  "help.filter.desc": { en: "Show only nouns, verbs, adjectives, or other words.", de: "Nur Nomen, Verben, Adjektive oder Sonstige anzeigen.", sq: "Trego vetëm emra, folje, mbiemra, ose fjalë të tjera.", ar: "عرض الأسماء أو الأفعال أو الصفات أو الكلمات الأخرى فقط.", uk: "Показувати лише іменники, дієслова, прикметники або інші слова.", hi: "केवल संज्ञा, क्रिया, विशेषण, या अन्य शब्द दिखाएँ।" },
  "help.known.label": { en: "✓ Known / ↻ Review", de: "✓ Gekonnt / ↻ Üben", sq: "✓ E ditur / ↻ Përsërit", ar: "✓ معروف / ↻ مراجعة", uk: "✓ Знаю / ↻ Повторити", hi: "✓ जानता हूँ / ↻ दोहराएँ" },
  "help.known.desc": { en: "Mark a card as known or needing review yourself.", de: "Eine Karte selbst als gekonnt oder zu übend markieren.", sq: "Shëno një kartë si të ditur ose që ka nevojë për përsëritje.", ar: "ضع علامة على البطاقة كمعروفة أو بحاجة إلى مراجعة بنفسك.", uk: "Позначте картку як вивчену або таку, що потребує повторення.", hi: "किसी कार्ड को स्वयं जाना हुआ या दोहराने योग्य चिह्नित करें।" },
  "help.wrong.label": { en: "✗ wrong?", de: "✗ falsch?", sq: "✗ gabim?", ar: "✗ خطأ؟", uk: "✗ помилка?", hi: "✗ गलत?" },
  "help.wrong.desc": { en: "Permanently correct a translation if it's wrong.", de: "Eine Übersetzung dauerhaft korrigieren, wenn sie nicht stimmt.", sq: "Korrigjo përgjithmonë një përkthim nëse është gabim.", ar: "تصحيح الترجمة بشكل دائم إذا كانت خاطئة.", uk: "Назавжди виправте переклад, якщо він неправильний.", hi: "गलत अनुवाद को हमेशा के लिए सही करें।" },
  "help.shuffle.label": { en: "⤮ Shuffle", de: "⤮ Shuffle", sq: "⤮ Përziej", ar: "⤮ خلط", uk: "⤮ Перемішати", hi: "⤮ शफ़ल" },
  "help.shuffle.desc": { en: "Tap once to shuffle the order; tap again to restore the original order.", de: "Einmal tippen mischt die Reihenfolge; nochmal tippen stellt die ursprüngliche Reihenfolge wieder her.", sq: "Trokit një herë për të përzier rendin; trokit përsëri për të rikthyer rendin origjinal.", ar: "اضغط مرة لخلط الترتيب؛ اضغط مرة أخرى لاستعادة الترتيب الأصلي.", uk: "Натисніть раз, щоб перемішати порядок; натисніть ще раз, щоб відновити початковий порядок.", hi: "क्रम बदलने के लिए एक बार दबाएँ; मूल क्रम वापस लाने के लिए फिर से दबाएँ।" },
  "help.roundSize.label": { en: "🔢 Round size", de: "🔢 Rundengröße", sq: "🔢 Madhësia e raundit", ar: "🔢 حجم الجولة", uk: "🔢 Розмір раунду", hi: "🔢 राउंड का आकार" },
  "help.roundSize.desc": { en: "Tap to choose how many nouns are practiced per round.", de: "Antippen, um zu wählen, wie viele Nomen pro Runde geübt werden.", sq: "Trokit për të zgjedhur sa emra praktikohen për raund.", ar: "اضغط لاختيار عدد الأسماء التي تُمارَس في كل جولة.", uk: "Натисніть, щоб обрати, скільки іменників практикується за раунд.", hi: "हर राउंड में कितने संज्ञा शब्दों का अभ्यास हो, यह चुनने के लिए दबाएँ।" },
  "help.peek.label": { en: "👁 Show meaning", de: "👁 Bedeutung zeigen", sq: "👁 Shfaq kuptimin", ar: "👁 إظهار المعنى", uk: "👁 Показати значення", hi: "👁 अर्थ दिखाएँ" },
  "help.peek.desc": { en: "Peek at the meaning before answering.", de: "Vor der Antwort einen Blick auf die Bedeutung werfen.", sq: "Shiko shpejt kuptimin para se të përgjigjesh.", ar: "ألقِ نظرة على المعنى قبل الإجابة.", uk: "Погляньте на значення перед відповіддю.", hi: "जवाब देने से पहले अर्थ झलक लें।" },
  "help.summary.label": { en: "Round summary", de: "Zusammenfassung", sq: "Përmbledhja e raundit", ar: "ملخص الجولة", uk: "Підсумок раунду", hi: "राउंड का सारांश" },
  "help.summary.desc": { en: "Retry just your mistakes, or start a completely new round.", de: "Nur die eigenen Fehler nochmal üben, oder eine komplett neue Runde starten.", sq: "Përsërit vetëm gabimet e tua, ose fillo një raund krejt të ri.", ar: "أعد محاولة أخطائك فقط، أو ابدأ جولة جديدة تمامًا.", uk: "Повторіть лише свої помилки або почніть зовсім новий раунд.", hi: "सिर्फ़ अपनी गलतियाँ फिर से करें, या बिल्कुल नया राउंड शुरू करें।" },
  "help.streak.label": { en: "🔥 Streak", de: "🔥 Streak", sq: "🔥 Vazhdimësia", ar: "🔥 سلسلة الأيام", uk: "🔥 Серія днів", hi: "🔥 स्ट्रीक" },
  "help.streak.desc": { en: "Counts days you reached your daily goal. Tap the goal to change it.", de: "Zählt Tage, an denen das Tagesziel erreicht wurde. Ziel antippen, um es zu ändern.", sq: "Numëron ditët kur ke arritur qëllimin tënd ditor. Trokit mbi qëllimin për ta ndryshuar.", ar: "يحسب الأيام التي حققت فيها هدفك اليومي. اضغط على الهدف لتغييره.", uk: "Рахує дні, коли ви досягли денної мети. Натисніть на мету, щоб змінити її.", hi: "उन दिनों को गिनता है जब आपने अपना दैनिक लक्ष्य पूरा किया। लक्ष्य बदलने के लिए उस पर दबाएँ।" },
  "help.progressBar.label": { en: "Progress bar · \"due\"", de: "Fortschrittsbalken · \"fällig\"", sq: "Shiriti i përparimit · \"për t'u përsëritur\"", ar: "شريط التقدم · \"مستحق\"", uk: "Смуга прогресу · \"на сьогодні\"", hi: "प्रगति पट्टी · \"फ़ैलिग\"" },
  "help.progressBar.desc": { en: "Cards come back automatically when it's time to review them (spaced repetition) - \"due\" shows how many are ready right now.", de: "Karten kommen automatisch zurück, wenn es Zeit zum Wiederholen ist (Spaced Repetition) - \"fällig\" zeigt, wie viele gerade dran sind.", sq: "Kartat kthehen automatikisht kur është koha t'i përsërisësh (përsëritje e shpërndarë) - \"për t'u përsëritur\" tregon sa janë gati tani.", ar: "تعود البطاقات تلقائيًا عندما يحين وقت مراجعتها (التكرار المتباعد) - \"مستحق\" يُظهر عدد البطاقات الجاهزة الآن.", uk: "Картки повертаються автоматично, коли настає час їх повторити (інтервальне повторення) - \"на сьогодні\" показує, скільки готові зараз.", hi: "जब दोहराने का समय आता है तो कार्ड अपने आप वापस आ जाते हैं (स्पेस्ड रिपिटिशन) - \"फ़ैलिग\" दिखाता है कि अभी कितने तैयार हैं।" },

  "help.levelFilter.label": { en: "A1 / A2 filter", de: "A1-/A2-Filter", sq: "Filtri A1/A2", ar: "فلتر A1/A2", uk: "Фільтр A1/A2", hi: "A1/A2 फ़िल्टर" },
  "help.levelFilter.desc": { en: "Show only A1 or only A2 words within whatever topics are selected.", de: "Nur A1- oder nur A2-Wörter innerhalb der gewählten Themen anzeigen.", sq: "Trego vetëm fjalë A1 ose vetëm A2 brenda temave të zgjedhura.", ar: "إظهار كلمات A1 فقط أو A2 فقط ضمن المواضيع المختارة.", uk: "Показувати лише слова A1 або лише A2 в межах обраних тем.", hi: "चुने गए विषयों में केवल A1 या केवल A2 शब्द दिखाएँ।" },
  "help.sourceFilter.label": { en: "Chapter filter", de: "Kapitel-Filter", sq: "Filtri i kapitullit", ar: "فلتر الفصل", uk: "Фільтр розділу", hi: "अध्याय फ़िल्टर" },
  "help.sourceFilter.desc": { en: "Appears once a topic contains words from more than one textbook chapter - narrow down to exactly the chapter you want to revise.", de: "Erscheint, sobald ein Thema Wörter aus mehr als einem Lehrbuch-Kapitel enthält - so kannst du genau das Kapitel wiederholen, das du brauchst.", sq: "Shfaqet kur një temë përmban fjalë nga më shumë se një kapitull i librit - kufizohu saktësisht te kapitulli që dëshiron të përsërisësh.", ar: "يظهر عندما يحتوي الموضوع على كلمات من أكثر من فصل واحد في الكتاب - حدد بالضبط الفصل الذي تريد مراجعته.", uk: "З'являється, коли тема містить слова з кількох розділів підручника - звузьте до потрібного розділу для повторення.", hi: "जब किसी विषय में एक से अधिक अध्याय के शब्द हों तो यह दिखता है - ठीक उसी अध्याय तक सीमित करें जिसे आप दोहराना चाहते हैं।" },
  "help.grammar.label": { en: "📖 Grammar tab", de: "📖 Grammatik-Tab", sq: "📖 Skeda e gramatikës", ar: "📖 علامة تبويب القواعد", uk: "📖 Вкладка граматики", hi: "📖 व्याकरण टैब" },
  "help.grammar.desc": { en: "A browsable reference of grammar topics (articles, verb tenses, word order...) with examples - independent of which vocabulary topic is selected.", de: "Eine durchsuchbare Übersicht von Grammatikthemen (Artikel, Zeitformen, Wortstellung ...) mit Beispielen - unabhängig davon, welches Vokabelthema gewählt ist.", sq: "Një referencë e shfletueshme e temave gramatikore (artikuj, kohët e foljeve, renditja e fjalëve ...) me shembuj - e pavarur nga tema e fjalorit të zgjedhur.", ar: "مرجع قابل للتصفح لمواضيع القواعد (أدوات التعريف، أزمنة الأفعال، ترتيب الكلمات ...) مع أمثلة - بغض النظر عن موضوع المفردات المختار.", uk: "Огляд граматичних тем (артиклі, часи дієслів, порядок слів...) із прикладами - незалежно від обраної теми словника.", hi: "व्याकरण विषयों (आर्टिकल, क्रिया काल, शब्द क्रम...) का उदाहरणों सहित संदर्भ - चुने गए शब्दावली विषय से स्वतंत्र।" },
  "help.cloze.label": { en: "✏️ Cloze mode", de: "✏️ Lücken-Modus", sq: "✏️ Mënyra e vendeve bosh", ar: "✏️ وضع ملء الفراغات", uk: "✏️ Режим прогалин", hi: "✏️ रिक्त स्थान मोड" },
  "help.cloze.desc": { en: "The word you're learning is blanked out of its own example sentence - type the missing word. Only cards with a confidently-matched blank appear, so the count in the tab may be smaller than the full topic.", de: "Das Wort, das du lernst, wird aus seinem eigenen Beispielsatz entfernt - schreibe das fehlende Wort. Nur Karten mit einer sicher erkannten Lücke erscheinen, daher kann die Zahl im Tab kleiner sein als das ganze Thema.", sq: "Fjala që po mëson hiqet nga fjalia e saj shembull - shkruaj fjalën që mungon. Shfaqen vetëm kartat me një vend bosh të identifikuar me siguri, prandaj numri në skedë mund të jetë më i vogël se e gjithë tema.", ar: "تُحذف الكلمة التي تتعلمها من جملتها المثالية الخاصة - اكتب الكلمة الناقصة. تظهر فقط البطاقات التي تم فيها تحديد الفراغ بثقة، لذا قد يكون العدد في علامة التبويب أصغر من الموضوع الكامل.", uk: "Слово, яке ви вивчаєте, прибирається з його власного речення-прикладу - введіть пропущене слово. З'являються лише картки з упевнено визначеною прогалиною, тому число у вкладці може бути меншим за всю тему.", hi: "जो शब्द आप सीख रहे हैं उसे उसके अपने उदाहरण वाक्य से हटा दिया जाता है - लापता शब्द टाइप करें। केवल भरोसेमंद रिक्त स्थान वाले कार्ड ही दिखते हैं, इसलिए टैब की संख्या पूरे विषय से कम हो सकती है।" },
  "help.interval.label": { en: "🧠 Interval", de: "🧠 Intervall", sq: "🧠 Intervali", ar: "🧠 الفاصل الزمني", uk: "🧠 Інтервал", hi: "🧠 अंतराल" },
  "help.interval.desc": { en: "Shows how many days until this specific card is due again. It adapts to each card individually - two cards reviewed the same number of times can have very different intervals depending on how easy each one has been for you.", de: "Zeigt, in wie vielen Tagen diese Karte wieder fällig ist. Das passt sich für jede Karte einzeln an - zwei Karten mit gleich vielen Wiederholungen können sehr unterschiedliche Intervalle haben, je nachdem, wie leicht sie dir jeweils gefallen sind.", sq: "Tregon në sa ditë kjo kartë specifike do të jetë përsëri për t'u përsëritur. Përshtatet individualisht për çdo kartë - dy karta të përsëritura po aq herë mund të kenë intervale shumë të ndryshme, varësisht sa e lehtë ka qenë secila për ty.", ar: "يُظهر عدد الأيام حتى تصبح هذه البطاقة مستحقة مرة أخرى. يتكيف مع كل بطاقة على حدة - يمكن لبطاقتين تمت مراجعتهما نفس عدد المرات أن يكون لهما فاصل زمني مختلف جدًا حسب مدى سهولة كل منهما بالنسبة لك.", uk: "Показує, через скільки днів ця картка знову стане актуальною. Адаптується індивідуально для кожної картки - дві картки з однаковою кількістю повторень можуть мати дуже різні інтервали залежно від того, наскільки легкою була кожна з них для вас.", hi: "दिखाता है कि यह विशेष कार्ड कितने दिनों में फिर से देय होगा। यह हर कार्ड के लिए अलग-अलग अनुकूलित होता है - समान बार दोहराए गए दो कार्ड्स का अंतराल बहुत अलग हो सकता है, यह इस पर निर्भर करता है कि आपके लिए हर एक कितना आसान रहा है।" },
  "help.wordsearch.label": { en: "🔤 Word search", de: "🔤 Wortgitter", sq: "🔤 Fjalëkryqi i gërmave", ar: "🔤 لغز البحث عن الكلمات", uk: "🔤 Пошук слів", hi: "🔤 वर्ड सर्च" },
  "help.wordsearch.desc": { en: "The word list shows English first - try to recall the German spelling yourself, or tap a word to reveal it if you're unsure. Then drag across the grid to find it: straight lines only, forward directions (→ ↓ ↘ ↙). Not scored and doesn't affect your review progress - it's just for spelling practice and pattern recognition. Meaning and example sentences show up once you finish.", de: "Die Wortliste zeigt zuerst Englisch - versuche, die deutsche Schreibweise selbst zu erinnern, oder tippe auf ein Wort, um es anzuzeigen, wenn du dir unsicher bist. Ziehe dann über das Gitter, um es zu finden: nur gerade Linien, in Vorwärtsrichtungen (→ ↓ ↘ ↙). Wird nicht bewertet und beeinflusst nicht deinen Lernfortschritt - es dient nur der Rechtschreibübung und Mustererkennung. Bedeutung und Beispielsätze erscheinen, sobald du fertig bist.", sq: "Lista e fjalëve tregon fillimisht anglisht - përpiqu të kujtosh vetë drejtshkrimin gjerman, ose trokit mbi një fjalë për ta zbuluar nëse nuk je i sigurt. Pastaj tërhiq nëpër rrjetë për ta gjetur: vetëm linja të drejta, në drejtime përpara (→ ↓ ↘ ↙). Nuk vlerësohet dhe nuk ndikon te përparimi yt i përsëritjes - shërben vetëm për ushtrim drejtshkrimi dhe njohje modelesh. Kuptimi dhe fjalitë shembull shfaqen sapo të mbarosh.", ar: "تعرض قائمة الكلمات الإنجليزية أولاً - حاول تذكر التهجئة الألمانية بنفسك، أو اضغط على كلمة لإظهارها إذا لم تكن متأكدًا. ثم اسحب عبر الشبكة للعثور عليها: خطوط مستقيمة فقط، باتجاهات أمامية (→ ↓ ↘ ↙). لا يُحتسب ولا يؤثر على تقدمك في المراجعة - إنه فقط لتدريب التهجئة والتعرف على الأنماط. يظهر المعنى وجمل الأمثلة بمجرد الانتهاء.", uk: "Список слів спочатку показує англійську - спробуйте самі згадати німецьке написання, або натисніть на слово, щоб побачити його, якщо не впевнені. Потім проведіть по сітці, щоб знайти його: лише прямі лінії, у напрямках вперед (→ ↓ ↘ ↙). Не оцінюється і не впливає на ваш прогрес повторення - це лише для практики правопису та розпізнавання образів. Значення та приклади речень з'являються після завершення.", hi: "शब्द सूची पहले अंग्रेज़ी दिखाती है - जर्मन स्पेलिंग खुद याद करने की कोशिश करें, या अनिश्चित होने पर उसे देखने के लिए किसी शब्द पर टैप करें। फिर उसे खोजने के लिए ग्रिड पर खींचें: केवल सीधी रेखाएँ, आगे की दिशाओं में (→ ↓ ↘ ↙)। इसका स्कोर नहीं होता और यह आपकी समीक्षा प्रगति को प्रभावित नहीं करता - यह केवल स्पेलिंग अभ्यास और पैटर्न पहचान के लिए है। समाप्त होने पर अर्थ और उदाहरण वाक्य दिखाई देते हैं।" },
};
const t = (key, lang) => (HELP_I18N[key] && HELP_I18N[key][lang]) || (HELP_I18N[key] && HELP_I18N[key].en) || key;

/* ---- Onboarding: a shared modal shell, used by both the first-visit
   welcome screen and the always-available "?" help reference. Neither
   touches any other part of the layout - both only appear when explicitly
   triggered (first visit, or a tap on "?"), never sitting on screen
   uninvited. ---- */
function WelcomeModal({ onClose, lang, onSelectLang }) {
  const rtl = lang === "ar";
  return (
    <Modal title={t("welcome.title", lang)} onClose={onClose} primaryLabel={t("welcome.button", lang)} onPrimary={onClose}>
      <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #1f2a33" }}>
        <div style={{ fontSize: 11, color: "#7d8d9c", marginBottom: 8 }}>{t("welcome.pickLanguage", lang)}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LANGUAGES.map(([key, label, flag]) => (
            <button
              key={key}
              onClick={() => onSelectLang(key)}
              style={{
                padding: "5px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: lang === key ? "none" : "1px solid #2c3a47",
                background: lang === key ? "#e0833b" : "#1a232b",
                color: lang === key ? "#0e1419" : "#9ab0c2",
              }}
            >{flag} {label}</button>
          ))}
        </div>
      </div>
      <p dir={rtl ? "rtl" : "auto"} style={{ margin: "0 0 12px", fontSize: 13, color: "#cdd8e2", lineHeight: 1.6 }}>
        {t("welcome.intro", lang)}
      </p>
      <ul dir={rtl ? "rtl" : "auto"} style={{ margin: "0 0 14px", paddingLeft: rtl ? 0 : 18, paddingRight: rtl ? 18 : 0, fontSize: 13, color: "#cdd8e2", lineHeight: 1.7 }}>
        <li>{t("welcome.modeCards", lang)}</li>
        <li>{t("welcome.modeArticle", lang)}</li>
        <li>{t("welcome.modeQuiz", lang)}</li>
      </ul>
      <p dir={rtl ? "rtl" : "auto"} style={{ margin: "0 0 6px", fontSize: 13, color: "#cdd8e2", lineHeight: 1.6 }}>
        {t("welcome.translations", lang)}
      </p>
      <p dir={rtl ? "rtl" : "auto"} style={{ margin: 0, fontSize: 12, color: "#7d8d9c", lineHeight: 1.6 }}>
        {t("welcome.footer", lang)}
      </p>
    </Modal>
  );
}

/* ---- Small, non-interactive previews built from the app's own real style
   values (ctrlBtn, badgeStyle, GENDER_COLORS, exact button colors copied
   from each real component) - not illustrations or screenshots, so they
   can never visually drift from what the actual UI looks like. ---- */
function HelpVisual({ kind }) {
  const wrap = { marginTop: 6, marginBottom: 2 };
  const pill = (label, active, color) => (
    <span style={{
      display: "inline-block", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
      border: active ? "none" : "1px solid #2c3a47",
      background: active ? color : "#1a232b",
      color: active ? "#fff" : "#9ab0c2",
      marginRight: 5,
    }}>{label}</span>
  );
  switch (kind) {
    case "help.tabs":
      return <div style={wrap}>{pill("👕 Kleidung", true, "#e0833b")}{pill("🌦️ Wetter", false)}</div>;
    case "help.search":
      return (
        <div style={{ ...wrap, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 10, border: "1px solid #2c3a47", background: "#161d24", fontSize: 11 }}>
          <span style={{ color: "#7d8d9c" }}>🔍</span><span style={{ color: "#5a6b78" }}>Suchen …</span>
        </div>
      );
    case "help.modes":
      return <div style={wrap}>{pill("🃏 Karten", true, "#e0833b")}{pill("🎯 Artikel", false)}{pill("📝 Quiz", false)}</div>;
    case "help.language":
      return <div style={wrap}>{pill("🇬🇧 EN", false)}{pill("🇦🇱 SQ", true, "#e0833b")}{pill("🇸🇦 AR", false)}</div>;
    case "help.badge":
      return <div style={wrap}><span style={badgeStyle(GENDER_COLORS.die)}>👕 Kleidung · Nomen · die</span></div>;
    case "help.filter":
      return <div style={wrap}>{pill("✓ Alle", true, "#e0833b")}{pill("Nomen", true, "#4f86c6")}{pill("Verben", false)}</div>;
    case "help.known":
      return (
        <div style={wrap}>
          <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "1px solid #5fa85f", color: "#5fa85f", marginRight: 6 }}>✓ Gekonnt</span>
          <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "1px solid #e0833b", color: "#e0833b" }}>↻ Üben</span>
        </div>
      );
    case "help.wrong":
      return <div style={wrap}><span style={{ fontSize: 11, color: "#5a6b78", textDecoration: "underline" }}>✗ falsch?</span></div>;
    case "help.shuffle":
      return <div style={wrap}><span style={{ ...ctrlBtn, display: "inline-block", borderColor: "#e0833b", color: "#e0833b", background: "transparent" }}>⤮ Shuffle</span></div>;
    case "help.roundSize":
      return <div style={wrap}><span style={{ background: "none", border: "1px solid #2c3a47", borderRadius: 8, padding: "4px 10px", color: "#9ab0c2", fontSize: 11, fontWeight: 600 }}>🔢 Runde: 10</span></div>;
    case "help.peek":
      return <div style={wrap}><span style={{ fontSize: 11, fontWeight: 600, color: "#7fb0d6", textDecoration: "underline" }}>👁 Bedeutung zeigen</span></div>;
    case "help.summary":
      return (
        <div style={wrap}>
          <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "1px solid #e0833b", color: "#e0833b", marginRight: 6 }}>↻ Fehler wiederholen</span>
          <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "#e0833b", color: "#0e1419" }}>🔁 Neue Runde</span>
        </div>
      );
    case "help.streak":
      return (
        <div style={{ ...wrap, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ width: 70, height: 5, borderRadius: 3, background: "#1e2630", overflow: "hidden" }}>
            <span style={{ display: "block", width: "70%", height: "100%", background: "#5fa85f" }} />
          </span>
          <span style={{ fontSize: 10, color: "#7d8d9c" }}>14/20</span>
        </div>
      );
    case "help.progressBar":
      return (
        <div style={{ ...wrap, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 70, height: 5, borderRadius: 3, background: "#1e2630", overflow: "hidden" }}>
            <span style={{ display: "block", width: "55%", height: "100%", background: "#5fa85f" }} />
          </span>
          <span style={{ fontSize: 10, color: "#7d8d9c" }}>📅 12 fällig</span>
        </div>
      );
    case "help.levelFilter":
      return <div style={wrap}>{pill("A1", true, "#5fa85f")}{pill("A2", true, "#e0833b")}</div>;
    case "help.sourceFilter":
      return <div style={wrap}>{pill("Alle", true, "#4f86c6")}{pill("Einheit 3", false)}{pill("Einheit 4", false)}</div>;
    case "help.grammar":
      return <div style={wrap}><span style={{ fontSize: 11, color: "#8fb8d8" }}>📖 Artikel im Nominativ ▾</span></div>;
    case "help.cloze":
      return (
        <div style={wrap}>
          <span style={{ fontSize: 12, color: "#cdd8e2" }}>Die Katze schläft </span>
          <span style={{ display: "inline-block", minWidth: 40, borderBottom: "2px solid #e0833b" }}>&nbsp;</span>
          <span style={{ fontSize: 12, color: "#cdd8e2" }}> dem Tisch.</span>
        </div>
      );
    case "help.interval":
      return <div style={wrap}><span style={{ fontSize: 11, fontWeight: 700, color: "#7fb0d6" }}>🧠 Intervall: 7 Tg.</span></div>;
    case "help.wordsearch":
      return (
        <div style={{ ...wrap, display: "flex", gap: 2 }}>
          {["B", "A", "N", "K"].map((l, i) => (
            <span key={i} style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "#e0833b", color: "#0e1419" }}>{l}</span>
          ))}
        </div>
      );
    default:
      return null;
  }
}

function HelpSection({ titleKey, items, lang }) {
  const rtl = lang === "ar";
  return (
    <div style={{ marginBottom: 18 }} dir={rtl ? "rtl" : "auto"}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#e0833b", textTransform: "uppercase", marginBottom: 8 }}>{t(titleKey, lang)}</div>
      {items.map((key) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "#f2f5f8", fontWeight: 600 }}>{t(key + ".label", lang)}</div>
          <div style={{ fontSize: 12, color: "#9ab0c2", lineHeight: 1.5 }}>{t(key + ".desc", lang)}</div>
          <HelpVisual kind={key} />
        </div>
      ))}
    </div>
  );
}

function HelpModal({ onClose, lang }) {
  const [deOverride, setDeOverride] = useState(false);
  const effectiveLang = deOverride ? "de" : lang;
  return (
    <Modal
      title={`${HELP_FLAGS[effectiveLang] || ""} ${t("help.title", effectiveLang)}`.trim()}
      onClose={onClose}
    >
      {lang !== "de" && (
        <button
          onClick={() => setDeOverride((v) => !v)}
          title="Anleitung auf Deutsch anzeigen"
          style={{
            display: "block", marginLeft: "auto", marginBottom: 14, padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
            border: deOverride ? "none" : "1px solid #2c3a47",
            background: deOverride ? "#e0833b" : "#1a232b",
            color: deOverride ? "#0e1419" : "#9ab0c2",
          }}
        >🇩🇪 DE</button>
      )}
      <HelpSection lang={effectiveLang} titleKey="help.section.start" items={["help.tabs", "help.search", "help.modes", "help.language"]} />
      <HelpSection lang={effectiveLang} titleKey="help.section.studying" items={["help.badge", "help.filter", "help.known", "help.wrong", "help.shuffle", "help.interval"]} />
      <HelpSection lang={effectiveLang} titleKey="help.section.article" items={["help.roundSize", "help.peek"]} />
      <HelpSection lang={effectiveLang} titleKey="help.section.afterRound" items={["help.summary"]} />
      <HelpSection lang={effectiveLang} titleKey="help.section.progress" items={["help.streak", "help.progressBar"]} />
      <HelpSection lang={effectiveLang} titleKey="help.section.newFeatures" items={["help.levelFilter", "help.sourceFilter", "help.grammar", "help.cloze", "help.wordsearch"]} />
    </Modal>
  );
}

/* ============================================================
   APP
   ============================================================ */

function App() {
  const [tabs, setTabs] = useState(["kleidung"]); // multi-select topics
  const [query, setQuery] = useState("");

  // decks
  const [irrDeck, setIrrDeck] = useState(IRREGULAR_VERBS);
  const [irrShuffled, setIrrShuffled] = useState(false);
  const [insepDeck, setInsepDeck] = useState(INSEPARABLE_VERBS);
  const [insepShuffled, setInsepShuffled] = useState(false);
  const [hausDeck, setHausDeck] = useState(HAUSHALT);
  const [hausShuffled, setHausShuffled] = useState(false);
  const [verkDeck, setVerkDeck] = useState(VERKEHR);
  const [verkShuffled, setVerkShuffled] = useState(false);
  const [kleidDeck, setKleidDeck] = useState(KLEIDUNG);
  const [kleidShuffled, setKleidShuffled] = useState(false);

  // indices
  const [irrIdx, setIrrIdx] = useState(0);
  const [insepIdx, setInsepIdx] = useState(0);
  const [hausIdx, setHausIdx] = useState(0);
  const [verkIdx, setVerkIdx] = useState(0);
  const [kleidIdx, setKleidIdx] = useState(0);

  // sub-filters (multi-select arrays of active category keys)
  const [irrFilter, setIrrFilter] = useState(GROUP_KEYS);
  const [hausFilter, setHausFilter] = useState(HAUS_KEYS);
  const [verkFilter, setVerkFilter] = useState(FULL_KEYS);
  const [kleidFilter, setKleidFilter] = useState(FULL_KEYS);

  // combined (multi-topic) mode state
  const [comboFilter, setComboFilter] = useState(FULL_KEYS);
  const [comboIdx, setComboIdx] = useState(0);
  const [comboDeck, setComboDeck] = useState(KLEIDUNG.map((c) => normalizeCard("kleidung", c)));
  const [comboShuffled, setComboShuffled] = useState(false);

  // state for the Lektion topic decks: { [key]: { idx, filter, order } }
  const [extra, setExtra] = useState(() =>
    Object.fromEntries(EXTRA_TOPICS.map((t) => [t.key, { idx: 0, filter: t.keys, order: t.cards, shuffled: false }]))
  );
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
        setProgress(migrated);
        if (anyMigrated) saveProgress(migrated);
      } catch (e) {}
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
      } catch (e) {}
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

  // manual override from the flashcard's ✓ Gekonnt / ↻ Üben buttons
  const mark = useCallback((id, status) => {
    if (!id) return;
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
  }, [bumpStreak]);

  // graded result from Quiz/Article/Reverse/Cloze: runs the adaptive
  // difficulty/stability model (see engine/fsrs.js) instead of a fixed
  // Leitner box step.
  const reviewResult = useCallback((id, correct) => {
    if (!id) return;
    setProgress((prev) => {
      const next = { ...prev };
      next[id] = reviewFsrsCard(prev[id], correct);
      saveProgress(next);
      return next;
    });
    bumpStreak();
  }, [bumpStreak]);

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
  const articleNouns = useMemo(
    () => selectionCards.filter((c) => c.type === "n" && c.gender),
    [selectionCards]
  );

  // ---- study mode: cards | article | quiz ----
  const [mode, setMode] = useState(MODE.CARDS);
  // grammar links: a card's 📖 chip opens the Grammatik tab on that topic,
  // remembering which mode it came from so "← Zurück" can return there.
  const [grammarFocus, setGrammarFocus] = useState(null);
  const [grammarFrom, setGrammarFrom] = useState(null);
  const openGrammar = useCallback((key) => {
    setGrammarFrom(mode === MODE.GRAMMAR ? null : mode);
    setGrammarFocus({ key, n: Date.now() });
    setMode(MODE.GRAMMAR);
  }, [mode]);
  const grammarNav = useMemo(() => ({ openGrammar }), [openGrammar]);
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
  };
  // #2: language toggle - EN/RU/AR, personal + persisted
  const [lang, setLang] = useState("en");
  const [customLangs, setCustomLangs] = useState([]);
  const [addingLang, setAddingLang] = useState(false);
  const [newLangText, setNewLangText] = useState("");
  // onboarding: welcome modal (first visit only) + always-available help panel
  const [showWelcome, setShowWelcome] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(STORAGE_KEYS.LANG);
        if (r && r.value) setLang(JSON.parse(r.value));
        const rc = await storage.get(STORAGE_KEYS.CUSTOM_LANGS);
        if (rc && rc.value) setCustomLangs(JSON.parse(rc.value));
        const rw = await storage.get(STORAGE_KEYS.WELCOME_SEEN);
        if (!rw || !rw.value) setShowWelcome(true);
      } catch (e) {}
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
  const WS_SIZE_PRESETS = [5, 8, 10];
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
      const n = resolveArticleRoundSize(reverseSizePref, selectionCards.length);
      const pool = weightedSample(selectionCards, Math.min(n, selectionCards.length), progress || {});
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
  }, [mode, tabs, articleSizePref, reverseSizePref, clozeSizePref, wsSizePref, articleNouns, selectionCards, clozePool, wsPool]); // eslint-disable-line
  const chooseArticle = (g) => {
    if (aChoice || !aOrder.length) return;
    const card = aOrder[aIdx % aOrder.length];
    const correct = card.gender === g;
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
    const correct = validateGermanWord(rInput, card.front);
    setRFlipped(true);
    setRScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
    if (!correct) setRMistakes((m) => [...m, { ...card, userInput: rInput }]);
    reviewResult(idOf(card.deck, card.front), correct);
  };
  const nextReverse = () => {
    if (rIdx >= rOrder.length - 1) { setRInput(""); setRFlipped(false); setRFinished(true); return; }
    setRInput("");
    setRFlipped(false);
    setRIdx((i) => i + 1);
  };
  const restartReverse = () => {
    const pool = weightedSample(selectionCards, Math.min(ROUND_SIZE, selectionCards.length), progress || {});
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
  const filteredIrr = useMemo(
    () => irrDeck.filter((v) => irrFilter.includes(v.group) && matches(v, query) && passesGlobalFilters(v, levelFilter, sourceFilter)),
    [irrDeck, irrFilter, query, levelFilter, sourceFilter]
  );
  const filteredInsep = useMemo(() => insepDeck.filter((v) => matches(v, query) && passesGlobalFilters(v, levelFilter, sourceFilter)), [insepDeck, query, levelFilter, sourceFilter]);
  const filteredHaus = useMemo(
    () => hausDeck.filter((w) => hausFilter.includes(w.type) && matches(w, query) && passesGlobalFilters(w, levelFilter, sourceFilter)),
    [hausDeck, hausFilter, query, levelFilter, sourceFilter]
  );
  const filteredVerk = useMemo(
    () => verkDeck.filter((w) => verkFilter.includes(w.type) && matches(w, query) && passesGlobalFilters(w, levelFilter, sourceFilter)),
    [verkDeck, verkFilter, query, levelFilter, sourceFilter]
  );
  const filteredKleid = useMemo(
    () => kleidDeck.filter((w) => kleidFilter.includes(w.type) && matches(w, query) && passesGlobalFilters(w, levelFilter, sourceFilter)),
    [kleidDeck, kleidFilter, query, levelFilter, sourceFilter]
  );

  const irrVerb = filteredIrr[irrIdx % (filteredIrr.length || 1)];
  const insepVerb = filteredInsep[insepIdx % (filteredInsep.length || 1)];
  const hausWord = filteredHaus[hausIdx % (filteredHaus.length || 1)];
  const verkWord = filteredVerk[verkIdx % (filteredVerk.length || 1)];
  const kleidWord = filteredKleid[kleidIdx % (filteredKleid.length || 1)];

  // combined (multi-topic) filtered deck
  const filteredCombo = useMemo(
    () => comboDeck.filter((c) => comboFilter.includes(c.type) && matches(c, query) && passesGlobalFilters(c, levelFilter, sourceFilter)),
    [comboDeck, comboFilter, query, levelFilter, sourceFilter]
  );
  const comboCard = filteredCombo[comboIdx % (filteredCombo.length || 1)];

  // keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const dir = e.key === "ArrowRight" ? 1 : -1;
      if (!single) { step(setComboIdx, filteredCombo.length)(dir); return; }
      if (onlyTab === "irregular") step(setIrrIdx, filteredIrr.length)(dir);
      else if (onlyTab === "inseparable") step(setInsepIdx, filteredInsep.length)(dir);
      else if (onlyTab === "haushalt") step(setHausIdx, filteredHaus.length)(dir);
      else if (onlyTab === "verkehr") step(setVerkIdx, filteredVerk.length)(dir);
      else if (onlyTab === "kleidung") step(setKleidIdx, filteredKleid.length)(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [single, onlyTab, filteredCombo.length, filteredIrr.length, filteredInsep.length, filteredHaus.length, filteredVerk.length, filteredKleid.length]);

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
          <h1 style={{ color: "#f2f5f8", fontSize: 22, fontWeight: 800, textAlign: "center", margin: "0 0 4px", pointerEvents: "none" }}>
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
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {LANGUAGES.map(([key, label, flag]) => (
            <button
              key={key}
              onClick={() => { setLang(key); saveLang(key); }}
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
                onClick={() => { setLang(name); saveLang(name); }}
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
        <p style={{ color: "#5a6b78", fontSize: 12, textAlign: "center", margin: "0 0 16px" }}>
          A1 / A2 · tap to flip, ← → to navigate
        </p>

        <StreakBar streak={displayStreak} count={streakData.count} goal={streakData.goal} recordStreak={streakData.recordStreak} onCycleGoal={cycleGoal} />

        {/* TABS - multi-select topics */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
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

        {/* SEARCH */}
        <div style={{ position: "relative", marginBottom: 18 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#7d8d9c", pointerEvents: "none" }}>🔍</span>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIrrIdx(0); setInsepIdx(0); setHausIdx(0); setVerkIdx(0); setKleidIdx(0); setComboIdx(0); }}
            placeholder="Suchen … (deutsch oder englisch)"
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px 36px 10px 36px",
              borderRadius: 12, border: "1px solid #2c3a47", background: "#161d24",
              color: "#f2f5f8", fontSize: 14, outline: "none",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
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
        {availableLevels.length > 1 && (
          <CategoryFilter
            cats={availableLevels.map((l) => [l, l])}
            allKeys={availableLevels}
            active={levelFilter}
            onChange={setLevelFilter}
            setIdx={() => { setIrrIdx(0); setInsepIdx(0); setHausIdx(0); setVerkIdx(0); setKleidIdx(0); setComboIdx(0); }}
            colorFor={(l) => (l === "A1" ? "#5fa85f" : "#e0833b")}
          />
        )}
        {availableSources.length > 1 && (
          <CategoryFilter
            cats={availableSources.map((s) => [s, s.replace(/^Menschen A2 · /, "")])}
            allKeys={availableSources}
            active={sourceFilter}
            onChange={setSourceFilter}
            setIdx={() => { setIrrIdx(0); setInsepIdx(0); setHausIdx(0); setVerkIdx(0); setKleidIdx(0); setComboIdx(0); }}
            colorFor={() => "#4f86c6"}
          />
        )}

        {/* MODE SWITCH + PROGRESS */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {MODE_TABS(articleNouns.length, clozePool.length, wsPool.length).map(([m, lbl]) => (
            <button
              key={m}
              onClick={() => { setMode(m); setGrammarFocus(null); setGrammarFrom(null); }}
              style={{ flex: 1, padding: "9px 0", borderRadius: 12, border: "1px solid #2c3a47", background: mode === m ? "#e0833b" : "#1a232b", color: mode === m ? "#0e1419" : "#9ab0c2", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >{lbl}</button>
          ))}
        </div>
        {mode === MODE.CARDS && selectionCards.length > 0 && <ProgressBar known={knownCount} total={selectionCards.length} due={dueCount} />}
        {mode === MODE.ARTICLE && !aFinished && (
          <RoundSizeSelector onCycle={cycleArticleSize} label={articleSizeLabel(articleSizePref)} />
        )}
        {mode === MODE.REVERSE && !rFinished && (
          <RoundSizeSelector onCycle={cycleReverseSize} label={articleSizeLabel(reverseSizePref)} />
        )}
        {mode === MODE.CLOZE && !cFinished && (
          <RoundSizeSelector onCycle={cycleClozeSize} label={articleSizeLabel(clozeSizePref)} />
        )}
        {mode === MODE.WORDSEARCH && !wsFinished && (
          <RoundSizeSelector onCycle={cycleWsSize} label={articleSizeLabel(wsSizePref)} />
        )}

        <ErrorBoundary resetKey={mode} label={mode}>
        {mode === MODE.ARTICLE ? (
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
              totalAvailable={selectionCards.length}
              lang={lang}
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
        ) : mode === MODE.GRAMMAR ? (
          <GrammarView
            topics={GRAMMAR_TOPICS}
            lang={lang}
            focus={grammarFocus}
            onBack={grammarFrom ? backFromGrammar : undefined}
          />
        ) : (
        <>
        {single && onlyTab === "irregular" && (
          <>
            <CategoryFilter
              cats={GROUP_KEYS.map((g) => [g, g])}
              allKeys={GROUP_KEYS}
              active={irrFilter}
              onChange={setIrrFilter}
              setIdx={setIrrIdx}
              colorFor={(g) => GROUP_COLORS[g] || "#4f86c6"}
            />
            {irrVerb ? (
              <>
                <FlipCard
                  front={irrVerb.infinitiv}
                  sub={`${irrVerb.präteritum} · ${irrVerb.partizip}`}
                  back={irrVerb.english}
                  example={irrVerb.example}
                  accent={GROUP_COLORS[irrVerb.group] || "#4f86c6"}
                  badge={`${DECK_META.irregular.icon} ${DECK_META.irregular.label} · ${irrVerb.group}`}
                  cardId={idOf("irregular", irrVerb.infinitiv)}
                  lang={lang}
                  level={irrVerb.level}
                  source={irrVerb.source}
                />
                <Controls index={irrIdx % filteredIrr.length} total={filteredIrr.length}
                  onPrev={() => step(setIrrIdx, filteredIrr.length)(-1)}
                  onNext={() => step(setIrrIdx, filteredIrr.length)(1)}
                  onShuffle={() => {
                    if (irrShuffled) { setIrrDeck(IRREGULAR_VERBS); setIrrIdx(0); setIrrShuffled(false); }
                    else { setIrrDeck(shuffled(IRREGULAR_VERBS)); setIrrFilter(GROUP_KEYS); setIrrIdx(0); setIrrShuffled(true); }
                  }}
                  isShuffled={irrShuffled} />
              </>
            ) : <NoResults q={query} />}
          </>
        )}

        {/* INSEPARABLE */}
        {single && onlyTab === "inseparable" && (
          <>
            <div style={{ background: "#1e2a1e", borderRadius: 12, padding: "10px 16px", marginBottom: 18, fontSize: 12, color: "#7ec87e", textAlign: "center" }}>
              🔑 Inseparable prefixes never add <strong>ge-</strong> in Partizip II
            </div>
            {insepVerb ? (
              <>
                <FlipCard
                  front={insepVerb.infinitiv}
                  sub={`hat ${insepVerb.partizip}${insepVerb.tip ? "  💡" : ""}`}
                  back={insepVerb.english}
                  example={insepVerb.example}
                  exampleEn={insepVerb.exampleEn}
                  accent="#5fa85f"
                  badge={`${DECK_META.inseparable.icon} ${DECK_META.inseparable.label}`}
                  cardId={idOf("inseparable", insepVerb.infinitiv)}
                  lang={lang}
                  level={insepVerb.level}
                  source={insepVerb.source}
                />
                {insepVerb.tip && (
                  <div style={{ marginTop: 12, fontSize: 12, color: "#9ab0c2", textAlign: "center", lineHeight: 1.5 }}>
                    💡 {insepVerb.tip}
                  </div>
                )}
                <Controls index={insepIdx % filteredInsep.length} total={filteredInsep.length}
                  onPrev={() => step(setInsepIdx, filteredInsep.length)(-1)}
                  onNext={() => step(setInsepIdx, filteredInsep.length)(1)}
                  onShuffle={() => {
                    if (insepShuffled) { setInsepDeck(INSEPARABLE_VERBS); setInsepIdx(0); setInsepShuffled(false); }
                    else { setInsepDeck(shuffled(INSEPARABLE_VERBS)); setInsepIdx(0); setInsepShuffled(true); }
                  }}
                  isShuffled={insepShuffled} />
              </>
            ) : <NoResults q={query} />}
          </>
        )}

        {/* HAUSHALT */}
        {single && onlyTab === "haushalt" && (
          <>
            {typeFilterRow(HAUS_CATS, HAUS_KEYS, hausFilter, setHausFilter, setHausIdx)}
            {hausWord ? (
              <>
                <FlipCard
                  front={hausWord.front}
                  sub={hausWord.sub}
                  back={hausWord.english}
                  example={hausWord.example}
                  exampleEn={hausWord.exampleEn}
                  accent={hausWord.type === "n" ? GENDER_COLORS[hausWord.gender] : TYPE_META[hausWord.type].color}
                  badge={`${DECK_META.haushalt.icon} ${DECK_META.haushalt.label} · ${hausWord.type === "n" ? `Nomen · ${hausWord.gender}` : TYPE_META[hausWord.type].label}`}
                  cardId={idOf("haushalt", hausWord.front)}
                  lang={lang}
                  level={hausWord.level}
                  source={hausWord.source}
                  type={hausWord.type}
                  gender={hausWord.gender}
                  note={hausWord.note}
                />
                <Controls index={hausIdx % filteredHaus.length} total={filteredHaus.length}
                  onPrev={() => step(setHausIdx, filteredHaus.length)(-1)}
                  onNext={() => step(setHausIdx, filteredHaus.length)(1)}
                  onShuffle={() => {
                    if (hausShuffled) { setHausDeck(HAUSHALT); setHausIdx(0); setHausShuffled(false); }
                    else { setHausDeck(shuffled(HAUSHALT)); setHausFilter(HAUS_KEYS); setHausIdx(0); setHausShuffled(true); }
                  }}
                  isShuffled={hausShuffled} />
              </>
            ) : <NoResults q={query} />}
          </>
        )}

        {/* STRASSENVERKEHR ★ NEW */}
        {single && onlyTab === "verkehr" && (
          <>
            <div style={{ background: "#1e2630", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: "#7fb0d6", textAlign: "center" }}>
              🚦 Im Straßenverkehr - CH = Schweiz, A = Österreich
            </div>
            {typeFilterRow(FULL_CATS, FULL_KEYS, verkFilter, setVerkFilter, setVerkIdx)}
            {verkWord ? (
              <>
                <FlipCard
                  front={verkWord.front}
                  sub={verkWord.sub}
                  back={verkWord.english}
                  example={verkWord.example}
                  exampleEn={verkWord.exampleEn}
                  accent={verkWord.type === "n" ? GENDER_COLORS[verkWord.gender] : TYPE_META[verkWord.type].color}
                  badge={`${DECK_META.verkehr.icon} ${DECK_META.verkehr.label} · ${verkWord.type === "n" ? `Nomen · ${verkWord.gender}` : TYPE_META[verkWord.type].label}`}
                  cardId={idOf("verkehr", verkWord.front)}
                  lang={lang}
                  level={verkWord.level}
                  source={verkWord.source}
                  type={verkWord.type}
                  gender={verkWord.gender}
                  note={verkWord.note}
                />
                <Controls index={verkIdx % filteredVerk.length} total={filteredVerk.length}
                  onPrev={() => step(setVerkIdx, filteredVerk.length)(-1)}
                  onNext={() => step(setVerkIdx, filteredVerk.length)(1)}
                  onShuffle={() => {
                    if (verkShuffled) { setVerkDeck(VERKEHR); setVerkIdx(0); setVerkShuffled(false); }
                    else { setVerkDeck(shuffled(VERKEHR)); setVerkFilter(FULL_KEYS); setVerkIdx(0); setVerkShuffled(true); }
                  }}
                  isShuffled={verkShuffled} />
              </>
            ) : <NoResults q={query} />}
          </>
        )}

        {/* KLEIDUNG ★ NEW */}
        {single && onlyTab === "kleidung" && (
          <>
            <div style={{ background: "#221c2a", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: "#b89ad6", textAlign: "center" }}>
              👕 Kleidung - Komparativ: <strong>schöner als</strong> · Gleichheit: <strong>(genau)so … wie</strong>
            </div>
            {typeFilterRow(FULL_CATS, FULL_KEYS, kleidFilter, setKleidFilter, setKleidIdx)}
            {kleidWord ? (
              <>
                <FlipCard
                  front={kleidWord.front}
                  sub={kleidWord.sub}
                  back={kleidWord.english}
                  example={kleidWord.example}
                  exampleEn={kleidWord.exampleEn}
                  accent={kleidWord.type === "n" ? GENDER_COLORS[kleidWord.gender] : TYPE_META[kleidWord.type].color}
                  badge={`${DECK_META.kleidung.icon} ${DECK_META.kleidung.label} · ${kleidWord.type === "n" ? `Nomen · ${kleidWord.gender}` : TYPE_META[kleidWord.type].label}`}
                  cardId={idOf("kleidung", kleidWord.front)}
                  lang={lang}
                  level={kleidWord.level}
                  source={kleidWord.source}
                  type={kleidWord.type}
                  gender={kleidWord.gender}
                  note={kleidWord.note}
                />
                <Controls index={kleidIdx % filteredKleid.length} total={filteredKleid.length}
                  onPrev={() => step(setKleidIdx, filteredKleid.length)(-1)}
                  onNext={() => step(setKleidIdx, filteredKleid.length)(1)}
                  onShuffle={() => {
                    if (kleidShuffled) { setKleidDeck(KLEIDUNG); setKleidIdx(0); setKleidShuffled(false); }
                    else { setKleidDeck(shuffled(KLEIDUNG)); setKleidFilter(FULL_KEYS); setKleidIdx(0); setKleidShuffled(true); }
                  }}
                  isShuffled={kleidShuffled} />
              </>
            ) : <NoResults q={query} />}
          </>
        )}

        {/* LEKTION TOPICS (typed vocabulary) ★ NEW */}
        {single && EXTRA_KEYS.includes(onlyTab) && (
          <TypedTopicView
            topic={EXTRA_BY_KEY[onlyTab]}
            slice={extra[onlyTab]}
            setSlice={setExtraSlice(onlyTab)}
            query={query}
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
                <Controls index={comboIdx % filteredCombo.length} total={filteredCombo.length}
                  onPrev={() => step(setComboIdx, filteredCombo.length)(-1)}
                  onNext={() => step(setComboIdx, filteredCombo.length)(1)}
                  onShuffle={() => {
                    if (comboShuffled) { setComboDeck(comboBase); setComboIdx(0); setComboShuffled(false); }
                    else { setComboDeck(shuffled(comboBase)); setComboFilter(comboKeys); setComboIdx(0); setComboShuffled(true); }
                  }}
                  isShuffled={comboShuffled} />
              </>
            ) : <NoResults q={query} />}
          </>
        )}

        </>
        )}
        </ErrorBoundary>

        <div style={{ marginTop: 28, color: "#4a5a68", fontSize: 11, textAlign: "center" }}>
          Tap a card to flip • ← → arrow keys to navigate
        </div>
      </div>
      {showWelcome && (
        <WelcomeModal
          lang={lang}
          onSelectLang={(key) => { setLang(key); saveLang(key); }}
          onClose={() => { setShowWelcome(false); saveWelcomeSeen(); }}
        />
      )}
      {showHelp && <HelpModal lang={lang} onClose={() => setShowHelp(false)} />}
    </div>
    </GrammarNavCtx.Provider>
    </ProgressCtx.Provider>
  );
}


export default App;
