import PropTypes from "prop-types";

// The bar fixed at the bottom of the screen: 🏠 Heute · 🃏 Lernen ·
// 📖 Grammatik · 📕 Fehlerheft · ☰ Mehr (App.jsx NAV_ITEMS / goSection).
// Always in reach of the thumb; the page keeps room for it (App.jsx
// NAV_SPACE). Tapping the active item again scrolls back to the top.
// Search (z 100), dialogs and the KI chat sit above it; the ☰ Mehr sheet
// (MoreSheet.jsx) opens right above it.

export const NAV_HEIGHT = 62;

function BottomNav({ items, active, onSelect }) {
  return (
    <nav
      aria-label="Bereiche"
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 90,
        background: "#121a21", borderTop: "1px solid #2c3a47",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", height: NAV_HEIGHT }}>
        {items.map((it) => {
          const on = active === it.key;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onSelect(it.key)}
              aria-current={on ? "page" : undefined}
              aria-label={it.badge ? `${it.label} (${it.badge})` : it.label}
              style={{
                flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                background: "none", border: "none", cursor: "pointer", padding: "6px 0",
                color: on ? "#e0833b" : "#7d8d9c", fontSize: 11, fontWeight: 700,
              }}
            >
              <span aria-hidden="true" style={{ position: "relative", fontSize: 21, lineHeight: 1, filter: on ? "none" : "grayscale(.5)", opacity: on ? 1 : 0.85 }}>
                {it.icon}
                {it.badge > 0 && (
                  <span style={{
                    position: "absolute", top: -6, right: -12, minWidth: 16, padding: "0 4px", borderRadius: 8,
                    fontSize: 10, fontWeight: 800, lineHeight: "16px", textAlign: "center",
                    background: "#e0833b", color: "#0e1419", border: "1px solid #121a21",
                  }}>{it.badge}</span>
                )}
              </span>
              <span style={{ whiteSpace: "nowrap" }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

BottomNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    badge: PropTypes.number,
  })).isRequired,
  active: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

export default BottomNav;
