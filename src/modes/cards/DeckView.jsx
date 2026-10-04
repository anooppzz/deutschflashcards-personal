import PropTypes from "prop-types";
import { idOf, shuffled } from "../../engine";
import { FlipCard, Controls, NoResults, CategoryFilter, Swipeable } from "../../components";
import { visibleCards } from "./deckViews";

// One deck in Karten mode - any deck: the original five and every
// chapter (see deckViews.js for what differs between them).

// "**x**" in a banner → bold x
const Bold = ({ text }) => text.split("**").map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));

function DeckView({ view, slice, setSlice, lang, levelFilter, sourceFilter }) {
  const cards = visibleCards(view, slice, levelFilter, sourceFilter);
  const total = cards.length;
  const card = cards[slice.idx % (total || 1)];
  const next = () => setSlice({ idx: (slice.idx + 1) % total });
  const prev = () => setSlice({ idx: (slice.idx - 1 + total) % total });
  return (
    <>
      {view.banner && (
        <div style={{ background: view.banner.bg, borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: view.banner.color, textAlign: "center" }}>
          <Bold text={view.banner.text} />
        </div>
      )}
      {view.cats.length > 1 && (
        <CategoryFilter
          cats={view.cats}
          allKeys={view.keys}
          active={slice.filter}
          onChange={(f) => setSlice({ filter: f })}
          setIdx={() => setSlice({ idx: 0 })}
          colorFor={view.colorFor}
        />
      )}
      {card ? (
        <>
          <Swipeable onNext={next} onPrev={prev}>
          <FlipCard
            front={card.front}
            sub={card.sub}
            back={card.english}
            example={card.example}
            exampleEn={card.exampleEn}
            accent={view.accentFor(card)}
            badge={view.badgeFor(card)}
            cardId={idOf(view.key, card.front)}
            lang={lang}
            level={card.level}
            source={card.source}
            note={card.note}
          />
          </Swipeable>
          {card.tip && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#9ab0c2", textAlign: "center", lineHeight: 1.5 }}>
              💡 {card.tip}
            </div>
          )}
          <Controls
            index={slice.idx % total}
            total={total}
            onPrev={prev}
            onNext={next}
            onShuffle={() => setSlice(
              slice.shuffled
                ? { order: view.cards, idx: 0, shuffled: false }
                : { order: shuffled(view.cards), filter: view.keys, idx: 0, shuffled: true }
            )}
            isShuffled={Boolean(slice.shuffled)}
          />
        </>
      ) : <NoResults />}
    </>
  );
}

Bold.propTypes = { text: PropTypes.string.isRequired };

DeckView.propTypes = {
  view: PropTypes.shape({
    key: PropTypes.string.isRequired,
    cards: PropTypes.array.isRequired,
    filterField: PropTypes.string.isRequired,
    cats: PropTypes.array.isRequired,
    keys: PropTypes.array.isRequired,
    banner: PropTypes.shape({ text: PropTypes.string, bg: PropTypes.string, color: PropTypes.string }),
    colorFor: PropTypes.func.isRequired,
    accentFor: PropTypes.func.isRequired,
    badgeFor: PropTypes.func.isRequired,
  }).isRequired,
  slice: PropTypes.shape({ idx: PropTypes.number, filter: PropTypes.array, order: PropTypes.array, shuffled: PropTypes.bool }).isRequired,
  setSlice: PropTypes.func.isRequired,
  lang: PropTypes.string,
  levelFilter: PropTypes.array,
  sourceFilter: PropTypes.array,
};

export default DeckView;
