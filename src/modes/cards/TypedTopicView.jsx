import { GENDER_COLORS, TYPE_META } from "../../constants";
import { idOf, matches, shuffled, passesGlobalFilters } from "../../engine";
import { FlipCard, Controls, NoResults, CategoryFilter } from "../../components";

// Colors for the type-filter chips within a Lektion topic - not shared
// elsewhere, so it stays local to this file rather than in constants/.
const typeColorOf = (key) => (key === "n" ? "#4f86c6" : TYPE_META[key].color);

/* Generic view for the Lektion topic decks (typed vocabulary) */
function TypedTopicView({ topic, slice, setSlice, query, lang, levelFilter, sourceFilter }) {
  const cards = topic.cards;
  const filtered = slice.order.filter((c) => slice.filter.includes(c.type) && matches(c, query) && passesGlobalFilters(c, levelFilter, sourceFilter));
  const total = filtered.length;
  const card = filtered[slice.idx % (total || 1)];
  return (
    <>
      {topic.note && (
        <div style={{ background: "#16202a", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: "#8fb8d8", textAlign: "center" }}>
          {topic.icon} {topic.note} · {cards.length} Karten
        </div>
      )}
      {topic.cats.length > 1 && (
        <CategoryFilter
          cats={topic.cats}
          allKeys={topic.keys}
          active={slice.filter}
          onChange={(f) => setSlice({ filter: f })}
          setIdx={() => setSlice({ idx: 0 })}
          colorFor={typeColorOf}
        />
      )}
      {card ? (
        <>
          <FlipCard
            front={card.front}
            sub={card.sub}
            back={card.english}
            example={card.example}
            exampleEn={card.exampleEn}
            accent={card.type === "n" ? GENDER_COLORS[card.gender] : TYPE_META[card.type].color}
            badge={`${topic.icon} ${topic.label} · ${card.type === "n" ? `Nomen · ${card.gender}` : TYPE_META[card.type].label}`}
            cardId={idOf(topic.key, card.front)}
            lang={lang}
            level={card.level}
            source={card.source}
          />
          <Controls
            index={slice.idx % total}
            total={total}
            onPrev={() => setSlice({ idx: (slice.idx - 1 + total) % total })}
            onNext={() => setSlice({ idx: (slice.idx + 1) % total })}
            onShuffle={() => setSlice(
              slice.shuffled
                ? { order: cards, idx: 0, shuffled: false }
                : { order: shuffled(cards), filter: topic.keys, idx: 0, shuffled: true }
            )}
            isShuffled={Boolean(slice.shuffled)}
          />
        </>
      ) : <NoResults q={query} />}
    </>
  );
}

export default TypedTopicView;
