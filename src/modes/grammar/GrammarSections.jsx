import PropTypes from "prop-types";
import { localize, parseHighlights } from "./richText";

// Renders a grammar topic's body so it can be scanned rather than read:
// a one-line summary, then sections - tables for forms that change by
// person/gender/degree, short bullet points, and a warning box for
// exceptions. All text is data (topics.json), per-language like the rest of
// the grammar content; table cells can also be plain strings, since German
// forms are the same in every language.
//
// Inline markup: **x** highlights x (see richText.js) - used for endings and
// changed letters (wohn**st**, gr**ö**ß**er**) so the part that changes stands out.

const ACCENT = "#e0833b";

function Rich({ text }) {
  return parseHighlights(text).map((p, i) =>
    // a short highlight (an ending like -keit) never breaks across lines
    p.hl ? <strong key={i} style={{ color: ACCENT, fontWeight: 700, whiteSpace: p.text.length <= 16 ? "nowrap" : undefined }}>{p.text}</strong> : <span key={i}>{p.text}</span>
  );
}

const sectionTitleStyle = {
  margin: "14px 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
  color: "#7d8d9c", textTransform: "uppercase",
};

// Short cells (forms, pronouns) stay on one line so columns line up; long
// ones (explanations, sentences) wrap instead of making the table wider
// than a phone screen.
const wrapStyle = (text) => (text.replace(/\*\*/g, "").length <= 12 ? { whiteSpace: "nowrap" } : null);
// Tables with 5+ columns (e.g. modal verb conjugation) get slightly
// smaller text and padding so they still fit a 360px phone screen.
function TableSection({ section, lang }) {
  const wide = section.head.length >= 5;
  const cellPad = wide ? "6px 5px" : "6px 7px";
  return (
    <>
      {section.title && <div style={sectionTitleStyle}>{localize(section.title, lang)}</div>}
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #2c3a47", marginTop: section.title ? 0 : 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: wide ? 12 : 13 }}>
          <thead>
            <tr>
              {section.head.map((h, i) => (
                <th key={i} scope="col" style={{ padding: cellPad, textAlign: "left", fontSize: 11, fontWeight: 700, color: "#7d8d9c", background: "#0e1419", ...wrapStyle(localize(h, lang)) }}>
                  <Rich text={localize(h, lang)} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, r) => (
              <tr key={r} style={{ borderTop: "1px solid #22303c" }}>
                {row.map((cell, c) => (c === 0 ? (
                  <th key={c} scope="row" style={{ padding: cellPad, textAlign: "left", fontWeight: 600, color: "#f2f5f8", ...wrapStyle(localize(cell, lang)) }}>
                    <Rich text={localize(cell, lang)} />
                  </th>
                ) : (
                  <td key={c} style={{ padding: cellPad, color: "#cdd8e2", ...wrapStyle(localize(cell, lang)) }}>
                    <Rich text={localize(cell, lang)} />
                  </td>
                )))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PointsSection({ section, lang }) {
  return (
    <>
      {section.title && <div style={sectionTitleStyle}>{localize(section.title, lang)}</div>}
      <ul style={{ margin: section.title ? 0 : "12px 0 0", paddingLeft: 18, color: "#cdd8e2", fontSize: 13, lineHeight: 1.5 }}>
        {section.items.map((item, i) => (
          <li key={i} style={{ marginBottom: 6 }}><Rich text={localize(item, lang)} /></li>
        ))}
      </ul>
    </>
  );
}

function WarningSection({ section, lang }) {
  return (
    <div style={{ marginTop: 12, display: "flex", gap: 8, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(224,131,59,.35)", background: "rgba(224,131,59,.08)", fontSize: 13, lineHeight: 1.5, color: "#cdd8e2" }}>
      <span aria-hidden="true">⚠️</span>
      <span><Rich text={localize(section.text, lang)} /></span>
    </div>
  );
}

const SECTIONS = { table: TableSection, points: PointsSection, warning: WarningSection };

function TopicBody({ topic, lang }) {
  // older/free-text topics without structure still render as a paragraph
  if (!topic.summary && !topic.sections) {
    return topic.explanation ? (
      <p style={{ margin: 0, fontSize: 13, color: "#cdd8e2", lineHeight: 1.6 }}>{localize(topic.explanation, lang)}</p>
    ) : null;
  }
  return (
    <>
      {topic.summary && (
        <div style={{ padding: "10px 12px", borderRadius: 8, borderLeft: `3px solid ${ACCENT}`, background: "#1e2a36", fontSize: 14, fontWeight: 600, color: "#f2f5f8", lineHeight: 1.5 }}>
          <Rich text={localize(topic.summary, lang)} />
        </div>
      )}
      {(topic.sections || []).map((section, i) => {
        const Section = SECTIONS[section.type];
        return Section ? <Section key={i} section={section} lang={lang} /> : null;
      })}
    </>
  );
}

const textShape = PropTypes.oneOfType([PropTypes.string, PropTypes.objectOf(PropTypes.string)]);

const sectionShape = PropTypes.shape({
  type: PropTypes.oneOf(["table", "points", "warning"]).isRequired,
  title: textShape,
  head: PropTypes.arrayOf(textShape),
  rows: PropTypes.arrayOf(PropTypes.arrayOf(textShape)),
  items: PropTypes.arrayOf(textShape),
  text: textShape,
});

TopicBody.propTypes = {
  topic: PropTypes.shape({
    summary: textShape,
    sections: PropTypes.arrayOf(sectionShape),
    explanation: textShape,
  }).isRequired,
  lang: PropTypes.string,
};
TableSection.propTypes = { section: sectionShape.isRequired, lang: PropTypes.string };
PointsSection.propTypes = { section: sectionShape.isRequired, lang: PropTypes.string };
WarningSection.propTypes = { section: sectionShape.isRequired, lang: PropTypes.string };
Rich.propTypes = { text: PropTypes.string.isRequired };

export default TopicBody;
