# Deutsch Flashcards

A German A1/A2 vocabulary trainer that runs entirely in the browser. No account, no
backend — progress is stored in `localStorage`, and the production build is a single
self-contained HTML file that also works straight from `file://`.

## Study modes

| Mode | What it drills |
| --- | --- |
| Cards | Classic flip cards with spaced repetition (FSRS) |
| Quiz | Multiple choice, German → translation |
| Reverse | Multiple choice, translation → German |
| Article | `der` / `die` / `das` practice |
| Cloze | Fill the gap in an example sentence |
| Word search | Find the vocabulary in a letter grid |
| Grammar | Reference topics and tables |

Translations are available in English, Albanian, Arabic, Ukrainian and Hindi.

## Getting started

```bash
npm install
npm run dev
```

The dev server prints a local URL — open it in a browser.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Build the app to `dist/index.html` (one self-contained file) |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Vitest suite |
| `npm run lint` | Run Oxlint |

## Project layout

```
src/
  App.jsx          top-level app shell, routing between modes and global state
  main.jsx         React entry point
  index.css        global styles
  components/      shared UI (FlipCard, Modal, ProgressBar, filters, …)
  constants/       colors, languages, mode definitions, storage keys
  context/         React context for progress state
  data/
    decks/         vocabulary decks as JSON, listed in _deck-manifest.json
    grammar/       grammar reference topics
    translations/  static translation table
  engine/          scheduling and logic: FSRS, sampling, search, streaks,
                   filters, speech synthesis, storage, translation chain
  modes/           one folder per study mode (cards, quiz, reverse, article,
                   cloze, wordsearch, grammar)
```

Tests live next to the code they cover (`*.test.js`) and focus on the engine and the
round builders.

## Adding vocabulary

Decks are plain JSON under `src/data/decks/`. To add one, create the JSON file and
register it in `src/data/decks/_deck-manifest.json`.

A card can carry an optional `note`, a one-line tip shown on the back of the card
(e.g. `"note": "von zeichnen (to draw)"`).

## Grammar links

Grammar topics live in `src/data/grammar/topics.json`. Cards are linked to topics in
two ways, and a linked card shows a 📖 chip that opens its topic. Each topic in turn
lists the words it covers under "Deine Wörter".

**Rules.** A topic's `match` is one rule or a list of rules (any may match). A rule
can check `type`, `gender`, `decks`, `endings` (the word ends in one of them) and
`subPattern` (a regex tested against the card's sub line). For example:

- `{ "type": "n", "gender": "die", "endings": ["ung", …] }` links feminine nouns ending
  in -ung. A card is only linked when its own gender agrees with the rule, so words
  like *der Sprung* never get a contradicting tip.
- `{ "type": "v", "subPattern": "(^|[·,] )(hat|ist) \\S" }` links verbs whose sub line
  shows a Perfekt form, like `hat reserviert`.

A topic's optional `hint` is shown in the Artikel trainer after a wrong answer.

**Tags.** Anything a rule can't express is tagged by hand on the card:
`"grammar": ["modalverben"]`. A test checks that every tag names an existing topic.

## Deployment

`npm run build` inlines all JS and CSS into `dist/index.html` via
[`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile),
so the result can be hosted anywhere static — or just opened as a local file.

The workflow in `.github/workflows/build.yml` runs the tests and builds that file on
every push to `main`. The built `index.html` is attached to each run as the
`deutschflashcards-html` artifact: open the run under the Actions tab and download it
from the Artifacts section at the bottom.
