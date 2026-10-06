import { describe, it, expect } from "vitest";
import { parseAiText, parseInline } from "./aiText";

describe("parseAiText", () => {
  it("reads headings, paragraphs, lists, tables and code", () => {
    const blocks = parseAiText([
      "## Bedeutung",
      "Das Wort heißt",
      "*house*.",
      "",
      "- das Haus",
      "  (neuter)",
      "- die Häuser",
      "1. Erstens",
      "2) Zweitens",
      "| Kasus | Artikel |",
      "|---|:---:|",
      "| Nom. | das |",
      "---",
      "```",
      "a  b",
      "```",
    ].join("\n"));
    expect(blocks).toEqual([
      { type: "h", text: "Bedeutung" },
      { type: "p", text: "Das Wort heißt *house*." },
      { type: "ul", items: ["das Haus (neuter)", "die Häuser"] },
      { type: "ol", items: ["Erstens", "Zweitens"] },
      { type: "table", rows: [["Kasus", "Artikel"], ["Nom.", "das"]] },
      { type: "code", text: "a  b" },
    ]);
  });

  it("copes with an empty or half-streamed answer", () => {
    expect(parseAiText("")).toEqual([]);
    expect(parseAiText("**hal")).toEqual([{ type: "p", text: "**hal" }]);
  });
});

describe("parseInline", () => {
  it("finds bold, italic and code", () => {
    expect(parseInline("Der **Akkusativ** nach *für* und `durch`.")).toEqual([
      { kind: "text", text: "Der " },
      { kind: "b", text: "Akkusativ" },
      { kind: "text", text: " nach " },
      { kind: "i", text: "für" },
      { kind: "text", text: " und " },
      { kind: "code", text: "durch" },
      { kind: "text", text: "." },
    ]);
  });
  it("leaves underscores inside words alone", () => {
    expect(parseInline("snake_case_name")).toEqual([{ kind: "text", text: "snake_case_name" }]);
    expect(parseInline("ein _Beispiel_")).toEqual([{ kind: "text", text: "ein " }, { kind: "i", text: "Beispiel" }]);
  });
});
