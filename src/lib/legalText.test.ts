import { describe, expect, it } from "vitest";
import { legalBlocks, toggleHeadingLine, legalInline, wrapSelection } from "./legalText";

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

describe("legalInline", () => {
  it("reads bold, italic and safe links, the rest as plain text", () => {
    expect(legalInline("We **never** sell data. Read *this* or [our privacy policy](/privacy), or write to [support](mailto:help@example.com).")).toEqual([
      { kind: "text", text: "We " },
      { kind: "bold", text: "never" },
      { kind: "text", text: " sell data. Read " },
      { kind: "italic", text: "this" },
      { kind: "text", text: " or " },
      { kind: "link", text: "our privacy policy", href: "/privacy" },
      { kind: "text", text: ", or write to " },
      { kind: "link", text: "support", href: "mailto:help@example.com" },
      { kind: "text", text: "." },
    ]);
  });

  it("leaves a link to anywhere unsafe as the text it was typed as", () => {
    expect(legalInline("[click](javascript:alert(1)) and [x](//evil.example)")).toEqual([{ kind: "text", text: "[click](javascript:alert(1)) and [x](//evil.example)" }]);
  });

  it("keeps a lone star or a price as text", () => {
    expect(legalInline("5 * 3 = 15")).toEqual([{ kind: "text", text: "5 * 3 = 15" }]);
  });
});

describe("wrapSelection", () => {
  it("wraps the selection and keeps it selected", () => {
    expect(wrapSelection("We never sell", 3, 8, "bold")).toEqual({ text: "We **never** sell", start: 5, end: 10 });
  });

  it("makes a link and selects the address to type", () => {
    const result = wrapSelection("See the policy", 8, 14, "link");
    expect(result.text).toBe("See the [policy](https://)");
    expect(result.text.slice(result.start, result.end)).toBe("https://");
  });
});

