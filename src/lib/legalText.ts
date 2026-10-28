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

// What a paragraph says, piece by piece: **bold**, *italic* and
// [words](link), where a link may only be an https or mailto address or a
// page of the site ("/privacy"). Anything else stays as the plain text it
// was typed as; nothing is read as HTML.
export type LegalInline = { kind: "text" | "bold" | "italic"; text: string } | { kind: "link"; text: string; href: string };

const INLINE = /\*\*(.+?)\*\*|\*(?!\s)(.+?)\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const SAFE_HREF = /^(https:\/\/\S+|mailto:\S+|\/(?!\/)\S*)$/;

export function legalInline(text: string): LegalInline[] {
  const pieces: LegalInline[] = [];
  let last = 0;
  const plain = (to: number) => {
    if (to > last) pieces.push({ kind: "text", text: text.slice(last, to) });
  };
  for (const match of text.matchAll(INLINE)) {
    const [whole, bold, italic, label, href] = match;
    const at = match.index ?? 0;
    if (label !== undefined && !SAFE_HREF.test(href)) continue;
    plain(at);
    if (bold !== undefined) pieces.push({ kind: "bold", text: bold });
    else if (italic !== undefined) pieces.push({ kind: "italic", text: italic });
    else pieces.push({ kind: "link", text: label, href });
    last = at + whole.length;
  }
  plain(text.length);
  return pieces;
}

// The editor\x27s Bold, Italic and Link buttons: wrap what is selected (or a
// placeholder word) and say what to select next.
export function wrapSelection(text: string, start: number, end: number, kind: "bold" | "italic" | "link"): { text: string; start: number; end: number } {
  const picked = text.slice(start, end) || (kind === "link" ? "link text" : kind === "bold" ? "bold text" : "italic text");
  const [before, after] = kind === "bold" ? ["**", "**"] : kind === "italic" ? ["*", "*"] : ["[", "](https://)"];
  const next = text.slice(0, start) + before + picked + after + text.slice(end);
  if (kind === "link") {
    // The address is what is left to type.
    const urlStart = start + before.length + picked.length + 2;
    return { text: next, start: urlStart, end: urlStart + "https://".length };
  }
  return { text: next, start: start + before.length, end: start + before.length + picked.length };
}

