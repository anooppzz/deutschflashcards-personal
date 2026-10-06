// The small part of Markdown the AI answers use (engine/ai.js asks for it),
// turned into plain blocks the chat renders as React elements - no HTML
// from the answer is ever put into the page.
// blocks: { type: "h" | "p", text } · { type: "ul" | "ol", items } ·
// { type: "table", rows: [[cell]] } · { type: "code", text }

const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
const isTableRule = (l) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && l.includes("-");
const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export const parseAiText = (text) => {
  const lines = (text || "").split(/\r?\n/);
  const blocks = [];
  let para = [];
  const flush = () => { if (para.length) blocks.push({ type: "p", text: para.join(" ") }); para = []; };
  const last = () => blocks[blocks.length - 1];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (t.startsWith("```")) {
      flush();
      const code = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith("```"); i++) code.push(lines[i]);
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    if (!t) { flush(); continue; }
    const h = t.match(/^#{1,6}\s+(.*)$/);
    if (h) { flush(); blocks.push({ type: "h", text: h[1] }); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flush(); continue; }
    if (isTableRow(t)) {
      flush();
      if (isTableRule(t)) continue;
      if (last()?.type === "table") last().rows.push(cells(t));
      else blocks.push({ type: "table", rows: [cells(t)] });
      continue;
    }
    const ul = t.match(/^[-*•]\s+(.*)$/);
    const ol = t.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flush();
      const type = ul ? "ul" : "ol";
      const item = (ul || ol)[1];
      if (last()?.type === type) last().items.push(item);
      else blocks.push({ type, items: [item] });
      continue;
    }
    // an indented line right after a list item continues that item
    if (/^\s+/.test(line) && !para.length && (last()?.type === "ul" || last()?.type === "ol")) {
      const items = last().items;
      items[items.length - 1] += ` ${t}`;
      continue;
    }
    para.push(t);
  }
  flush();
  return blocks;
};

// **bold**, *italic* / _italic_ and `code` inside a line:
// [{ kind: "text" | "b" | "i" | "code", text }]
export const parseInline = (text) => {
  const out = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|\*([^*\s][^*]*)\*|(?<![\p{L}\d])_([^_]+)_(?![\p{L}\d])/gu;
  let at = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > at) out.push({ kind: "text", text: text.slice(at, m.index) });
    if (m[1] !== undefined) out.push({ kind: "b", text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: "code", text: m[2] });
    else out.push({ kind: "i", text: m[3] ?? m[4] });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ kind: "text", text: text.slice(at) });
  return out;
};
