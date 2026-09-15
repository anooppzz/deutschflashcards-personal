import { useEffect } from "react";
import PropTypes from "prop-types";

function Modal({ title, onClose, children, primaryLabel, onPrimary }) {
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{ background: "#161d24", border: "1px solid #2c3a47", borderRadius: 18, maxWidth: 440, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,.5)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid #1f2a33" }}>
          <h2 id="modal-title" style={{ margin: 0, fontSize: 16, color: "#f2f5f8" }}>{title}</h2>
          <button onClick={onClose} aria-label="Schließen" style={{ background: "none", border: "none", color: "#7d8d9c", fontSize: 18, cursor: "pointer", padding: 4 }}>×</button>
        </div>
        <div style={{ padding: "16px 18px", overflowY: "auto" }}>{children}</div>
        {primaryLabel && (
          <div style={{ padding: "14px 18px", borderTop: "1px solid #1f2a33" }}>
            <button
              onClick={onPrimary}
              style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: "#e0833b", color: "#0e1419", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >{primaryLabel}</button>
          </div>
        )}
      </div>
    </div>
  );
}

Modal.propTypes = {
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  primaryLabel: PropTypes.string,
  onPrimary: PropTypes.func,
};

export default Modal;
