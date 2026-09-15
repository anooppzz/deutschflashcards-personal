// Shared style primitives for flip-card style UI. Used by FlipCard,
// ReverseTrainer, and ArticleTrainer to keep the card visual language
// consistent: dark background, colored border, badge in the top-left.
export const faceStyle = (accent) => ({
  position: "absolute",
  inset: 0,
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  borderRadius: 18,
  background: "#161d24",
  border: `2px solid ${accent}`,
  boxShadow: "0 10px 30px rgba(0,0,0,.45)",
});

export const badgeStyle = (accent) => ({
  position: "absolute",
  top: 14,
  left: 14,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: accent,
  border: `1px solid ${accent}`,
  borderRadius: 6,
  padding: "2px 8px",
});

export const iconBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 4,
  lineHeight: 1,
};

export const ctrlBtn = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #2c3a47",
  background: "#1a232b",
  color: "#cdd8e2",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
