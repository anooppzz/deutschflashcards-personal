import { useEffect } from "react";
import PropTypes from "prop-types";
import { NAV_HEIGHT } from "./BottomNav";

// ☰ Mehr: a sheet that slides up above the bottom bar with everything that
// isn't one of the four main areas (📰 Lesen, 🎓 DTZ, 💾 backup, 🤖 KI …).
// A tap on the dimmed page, ✕ or the back gesture (App.jsx backAction)
// closes it. footer: the version line.

function MoreSheet({ items, onClose, footer }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 91, background: "rgba(0,0,0,.55)" }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mehr"
        style={{
          position: "fixed", left: 0, right: 0, zIndex: 92,
          bottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
          maxHeight: `calc(100vh - ${NAV_HEIGHT + 40}px)`, overflowY: "auto", overscrollBehavior: "contain",
          background: "#121a21", borderTop: "1px solid #2c3a47", borderRadius: "18px 18px 0 0",
          boxShadow: "0 -10px 30px rgba(0,0,0,.6)", fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 6px 2px 18px" }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: "#7d8d9c" }}>MEHR</span>
            <button type="button" onClick={onClose} aria-label="Schließen" style={{ width: 44, height: 44, background: "none", border: "none", color: "#7d8d9c", fontSize: 22, cursor: "pointer" }}>×</button>
          </div>
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={it.onClick}
              style={{
                display: "flex", width: "100%", alignItems: "center", gap: 14, minHeight: 56, padding: "8px 18px",
                background: "none", border: "none", borderTop: "1px solid #1f2a33", color: "#f2f5f8", cursor: "pointer", textAlign: "left", font: "inherit",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 20, width: 24, textAlign: "center" }}>{it.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{it.label}</span>
                {it.detail && <span style={{ display: "block", fontSize: 12, color: it.accent || "#7d8d9c", marginTop: 1 }}>{it.detail}</span>}
              </span>
              <span aria-hidden="true" style={{ color: "#7d8d9c", fontSize: 18 }}>›</span>
            </button>
          ))}
          {footer && <div style={{ borderTop: "1px solid #1f2a33", padding: "10px 0 4px", fontSize: 11, color: "#5a6b78", textAlign: "center" }}>{footer}</div>}
        </div>
      </div>
    </>
  );
}

MoreSheet.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    detail: PropTypes.string,
    accent: PropTypes.string,
    onClick: PropTypes.func.isRequired,
  })).isRequired,
  onClose: PropTypes.func.isRequired,
  footer: PropTypes.node,
};

export default MoreSheet;
