// Every deck the Karten mode can show on its own - the five original decks
// and every textbook chapter - described the same way, so one view
// (DeckView.jsx) shows them all. Per deck: its cards in a common shape,
// what the filter chips filter on (word type, or the vowel group for the
// irregular verbs), the optional banner above the card, and the card's
// colour and badge.
import { genderColor, TYPE_META, GROUP_COLORS } from "../../constants";
import { IRREGULAR_VERBS, INSEPARABLE_VERBS, HAUSHALT, VERKEHR, KLEIDUNG, EXTRA_TOPICS, DECK_META, sourcesOf, alsoCardsOf } from "../../data";
import { passesGlobalFilters } from "../../engine";

const TYPE_CATS = [["n", "Nomen"], ["v", "Verben"], ["adj", "Adjektive"], ["sonst", "Sonstige"]];

// only the word types a deck actually has get a chip
const typeCats = (cards) => {
  const present = new Set(cards.map((c) => c.type));
  return TYPE_CATS.filter(([k]) => present.has(k));
};
const typeAccent = (c) => (c.type === "n" ? genderColor(c.gender) : TYPE_META[c.type].color);
const typeColor = (key) => (key === "n" ? "#4f86c6" : TYPE_META[key].color);
// a card from another chapter (alsoCards) is badged with that chapter only
// (with the word type too it would run into the level tag on a phone)
const typeBadge = (icon, label) => (c) => (c.deck
  ? `🔗 ${DECK_META[c.deck].icon} ${DECK_META[c.deck].label}`
  : `${icon} ${label} · ${c.type === "n" ? `Nomen · ${c.gender}` : TYPE_META[c.type].label}`);

// each card with all its sources (its own + the books of its word lists)
const withSources = (key, cards) => cards.map((c) => ({ ...c, sources: sourcesOf(c.deck || key, c.front, c.source) }));

const typedView = (key, icon, label, rawCards, banner) => {
  const cards = withSources(key, rawCards);
  const cats = typeCats(cards);
  return {
    key, cards, banner, filterField: "type", cats, keys: cats.map(([k]) => k), colorFor: typeColor,
    accentFor: typeAccent, badgeFor: typeBadge(icon, label),
  };
};

const GROUP_KEYS = Object.keys(GROUP_COLORS);

export const buildDeckViews = () => {
  const views = [
    {
      key: "irregular",
      cards: IRREGULAR_VERBS.map((v) => ({
        type: "v", front: v.infinitiv, sub: `${v.präteritum} · ${v.hilfsverb} ${v.partizip}`, english: v.english,
        example: v.example, exampleEn: v.exampleEn, note: v.note, level: v.level, source: v.source, group: v.group,
        sources: sourcesOf("irregular", v.infinitiv, v.source),
      })),
      filterField: "group", cats: GROUP_KEYS.map((g) => [g, g]), keys: GROUP_KEYS,
      colorFor: (g) => GROUP_COLORS[g] || "#4f86c6",
      accentFor: (c) => GROUP_COLORS[c.group] || "#4f86c6",
      badgeFor: (c) => `${DECK_META.irregular.icon} ${DECK_META.irregular.label} · ${c.group}`,
    },
    {
      key: "inseparable",
      cards: INSEPARABLE_VERBS.map((v) => ({
        type: "v", front: v.infinitiv, sub: `hat ${v.partizip}${v.tip ? "  💡" : ""}`, english: v.english,
        example: v.example, exampleEn: v.exampleEn, level: v.level, source: v.source, tip: v.tip,
        sources: sourcesOf("inseparable", v.infinitiv, v.source),
      })),
      banner: { text: "🔑 Inseparable prefixes never add **ge-** in Partizip II", bg: "#1e2a1e", color: "#7ec87e" },
      filterField: "type", cats: [], keys: ["v"], colorFor: typeColor,
      accentFor: () => "#5fa85f",
      badgeFor: () => `${DECK_META.inseparable.icon} ${DECK_META.inseparable.label}`,
    },
    typedView("haushalt", DECK_META.haushalt.icon, DECK_META.haushalt.label, HAUSHALT),
    typedView("verkehr", DECK_META.verkehr.icon, DECK_META.verkehr.label, VERKEHR,
      { text: "🚦 Im Straßenverkehr - CH = Schweiz, A = Österreich", bg: "#1e2630", color: "#7fb0d6" }),
    typedView("kleidung", DECK_META.kleidung.icon, DECK_META.kleidung.label, KLEIDUNG,
      { text: "👕 Kleidung - Komparativ: **schöner als** · Gleichheit: **(genau)so … wie**", bg: "#221c2a", color: "#b89ad6" }),
    ...EXTRA_TOPICS.map((t) => {
      // the chapter's own cards, then the ones it shows from other chapters
      // (they keep their deck, so their id and progress)
      const cards = [...t.cards, ...alsoCardsOf(t.key).map(({ deck, raw }) => ({ ...raw, deck }))];
      return typedView(t.key, t.icon, t.label, cards,
        t.note ? { text: `${t.icon} ${t.note} · ${cards.length} Karten`, bg: "#16202a", color: "#8fb8d8" } : undefined);
    }),
  ];
  return Object.fromEntries(views.map((v) => [v.key, v]));
};

// A deck's place in the Karten mode: card order (shuffled or not), the
// active filter chips and the current card.
export const initialSlice = (view) => ({ idx: 0, filter: view.keys, order: view.cards, shuffled: false });

// the cards shown right now: the chosen filter chips plus the A1/A2 and
// chapter filters
export const visibleCards = (view, slice, levelFilter, sourceFilter) =>
  slice.order.filter((c) => slice.filter.includes(c[view.filterField]) && passesGlobalFilters(c, levelFilter, sourceFilter));
