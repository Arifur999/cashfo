// Cover colours a book can have. The keys match the backend's BOOK_COLORS
// (backend/src/books/book-colors.ts) -- keep the two in sync.
export interface BookPalette {
  key: string;
  label: string; // English, passed through t()
  from: string; // gradient start (cover top-left)
  to: string; // gradient end
  ink: string; // title colour on the cover
}

export const BOOK_PALETTE: BookPalette[] = [
  { key: "walnut", label: "Walnut", from: "#7a4b2c", to: "#4a2b18", ink: "#f6e7cf" },
  { key: "oxblood", label: "Oxblood", from: "#8f3535", to: "#561a1f", ink: "#fbe9de" },
  { key: "forest", label: "Forest", from: "#3a6b52", to: "#1f412f", ink: "#e8f1df" },
  { key: "navy", label: "Navy", from: "#2f4f80", to: "#182c4c", ink: "#e6edf8" },
  { key: "mustard", label: "Mustard", from: "#d09a2f", to: "#96651a", ink: "#2c1b06" },
  { key: "teal", label: "Teal", from: "#23808a", to: "#134a52", ink: "#e2f4f3" },
  { key: "plum", label: "Plum", from: "#7b4468", to: "#48233d", ink: "#f6e6f0" },
  { key: "slate", label: "Slate", from: "#4b5563", to: "#272d36", ink: "#eef1f5" },
  { key: "terracotta", label: "Terracotta", from: "#c4633f", to: "#82391f", ink: "#fdeee3" },
  { key: "sage", label: "Sage", from: "#8a9f77", to: "#56694a", ink: "#1f2a17" },
];

export function paletteFor(key: string): BookPalette {
  return BOOK_PALETTE.find((p) => p.key === key) ?? BOOK_PALETTE[0];
}

// A stable colour for a title, so a new book starts out looking like itself
// (not every cover walnut) until the reader picks one.
export function suggestColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return BOOK_PALETTE[hash % BOOK_PALETTE.length].key;
}
