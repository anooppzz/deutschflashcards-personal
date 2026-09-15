import PropTypes from "prop-types";

function NoResults({ q }) {
  return (
    <div role="status" style={{ textAlign: "center", padding: "60px 20px", color: "#7d8d9c" }}>
      <div aria-hidden="true" style={{ fontSize: 40, marginBottom: 10 }}>{q ? "🔍" : "🗂️"}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#cdd8e2" }}>
        {q ? "Keine Treffer" : "Keine Kategorie ausgewählt"}
      </div>
      <div style={{ fontSize: 13, marginTop: 6 }}>
        {q ? `Nichts für „${q}" gefunden.` : "Wähle oben mindestens eine Kategorie."}
      </div>
    </div>
  );
}

NoResults.propTypes = {
  q: PropTypes.string,
};

export default NoResults;
