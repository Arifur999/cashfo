import { describe, expect, it } from "vitest";
import { legalBlocks, toggleHeadingLine } from "./legalText";

describe("legalBlocks", () => {
  it("parts paragraphs at blank lines and keeps the line breaks inside one", () => {
    expect(legalBlocks("First line\nsecond line\n\n\nNext paragraph")).toEqual([
      { kind: "paragraph", text: "First line\nsecond line" },
      { kind: "paragraph", text: "Next paragraph" },
    ]);
  });

  it("reads a line starting with ## as a numbered section heading", () => {
    expect(legalBlocks("## 1. Who we are\nWe make Smartly.\n\n## ২. আপনার অ্যাকাউন্ট\nText")).toEqual([
      { kind: "heading", id: "section-1", text: "1. Who we are" },
      { kind: "paragraph", text: "We make Smartly." },
      { kind: "heading", id: "section-2", text: "২. আপনার অ্যাকাউন্ট" },
      { kind: "paragraph", text: "Text" },
    ]);
  });

  it("takes one to three # marks, but not a word that starts with #", () => {
    expect(legalBlocks("# One\n### Three\n#hashtag\n#### Four")).toEqual([
      { kind: "heading", id: "section-1", text: "One" },
      { kind: "heading", id: "section-2", text: "Three" },
      { kind: "paragraph", text: "#hashtag\n#### Four" },
    ]);
  });

  it("handles Windows line breaks and text with no headings", () => {
    expect(legalBlocks("Terms\r\n\r\nPlain text only.\r\n")).toEqual([
      { kind: "paragraph", text: "Terms" },
      { kind: "paragraph", text: "Plain text only." },
    ]);
    expect(legalBlocks("   \n\n")).toEqual([]);
  });
});

describe("toggleHeadingLine", () => {
  it("starts the caret's line with ## and moves the caret along", () => {
    expect(toggleHeadingLine("Intro\nWho we are\nMore", 9)).toEqual({ text: "Intro\n## Who we are\nMore", caret: 12 });
    expect(toggleHeadingLine("", 0)).toEqual({ text: "## ", caret: 3 });
  });

  it("takes ## off a heading line again", () => {
    expect(toggleHeadingLine("Intro\n## Who we are", 12)).toEqual({ text: "Intro\nWho we are", caret: 9 });
    expect(toggleHeadingLine("## Title", 1)).toEqual({ text: "Title", caret: 0 });
  });
});
