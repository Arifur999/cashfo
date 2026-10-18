// A legal page's text as the admin typed it, in blocks: a line that starts
// with "## " (or "# ", "### ") is a section heading, which gets an anchor and
// a place in the page's "On this page" list; blank lines part the
// paragraphs, which keep their own line breaks. Nothing is read as HTML.
export type LegalBlock = { kind: "heading"; id: string; text: string } | { kind: "paragraph"; text: string };

const HEADING = /^#{1,3}\s+(\S.*)$/;

export function legalBlocks(text: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let lines: string[] = [];
  let headings = 0;
  const endParagraph = () => {
    const paragraph = lines.join("\n").trim();
    if (paragraph) blocks.push({ kind: "paragraph", text: paragraph });
    lines = [];
  };

  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = HEADING.exec(line.trim());
    if (heading) {
      endParagraph();
      headings += 1;
      // Numbered, not named after the words, so a Bangla heading gets an
      // anchor too.
      blocks.push({ kind: "heading", id: `section-${headings}`, text: heading[1].trim() });
    } else if (line.trim() === "") {
      endParagraph();
    } else {
      lines.push(line);
    }
  }
  endParagraph();
  return blocks;
}

// The editor's Heading button: puts "## " at the start of the line the caret
// is on, or takes it off again, and says where the caret lands.
export function toggleHeadingLine(text: string, caret: number): { text: string; caret: number } {
  const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
  if (text.startsWith("## ", lineStart)) {
    return { text: text.slice(0, lineStart) + text.slice(lineStart + 3), caret: Math.max(lineStart, caret - 3) };
  }
  return { text: `${text.slice(0, lineStart)}## ${text.slice(lineStart)}`, caret: caret + 3 };
}
