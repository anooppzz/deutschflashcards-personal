import PropTypes from "prop-types";
import { parseAiText, parseInline } from "../engine/aiText";

// An AI answer (engine/aiText.js) as React elements - text only, never HTML.

const Inline = ({ text }) => parseInline(text).map((p, i) => {
  if (p.kind === "b") return <strong key={i} style={{ color: "#f2f5f8" }}>{p.text}</strong>;
  if (p.kind === "i") return <em key={i}>{p.text}</em>;
  if (p.kind === "code") return <code key={i} style={{ background: "#0e1419", borderRadius: 4, padding: "0 4px", fontSize: "0.95em" }}>{p.text}</code>;
  return <span key={i}>{p.text}</span>;
});

const cell = { padding: "4px 8px", borderBottom: "1px solid #2c3a47", textAlign: "left", verticalAlign: "top" };

function AiText({ text }) {
  return parseAiText(text).map((b, i) => {
    if (b.type === "h") return <div key={i} style={{ margin: "12px 0 4px", fontWeight: 800, color: "#f2f5f8" }}><Inline text={b.text} /></div>;
    if (b.type === "ul" || b.type === "ol") {
      const List = b.type;
      return (
        <List key={i} style={{ margin: "6px 0", paddingLeft: 22 }}>
          {b.items.map((it, j) => <li key={j} style={{ margin: "3px 0" }}><Inline text={it} /></li>)}
        </List>
      );
    }
    if (b.type === "table") {
      return (
        <div key={i} style={{ overflowX: "auto", margin: "8px 0" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {b.rows.map((r, j) => (
                <tr key={j}>{r.map((c, k) => (j === 0
                  ? <th key={k} style={{ ...cell, color: "#f2f5f8" }}><Inline text={c} /></th>
                  : <td key={k} style={cell}><Inline text={c} /></td>))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (b.type === "code") return <pre key={i} style={{ margin: "8px 0", padding: 8, borderRadius: 8, background: "#0e1419", whiteSpace: "pre-wrap", fontSize: 13 }}>{b.text}</pre>;
    return <p key={i} style={{ margin: "6px 0" }}><Inline text={b.text} /></p>;
  });
}

Inline.propTypes = { text: PropTypes.string.isRequired };
AiText.propTypes = { text: PropTypes.string.isRequired };

export default AiText;
