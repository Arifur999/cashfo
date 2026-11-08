// Cover colours a book can have. The keys match the backend's BOOK_COLORS
// (backend src/books/book-colors.ts) -- keep the two in sync.
export interface BookPalette {
  key: string;
  label: string; // English, passed through t()
  from: string; // gradient start (cover top-left)
  to: string; // gradient end
  ink: string; // title colour on the cover
}

// The v16 boards draw a cover in one of their colours, darkening to 40% of
// it at the bottom right, with white type (LibraryHome, LibraryBooks).
export const BOOK_PALETTE: BookPalette[] = [
  { key: "walnut", label: "Walnut", from: "#c2410c", to: "#742707", ink: "#ffffff" },
  { key: "oxblood", label: "Oxblood", from: "#be185d", to: "#720e38", ink: "#ffffff" },
  { key: "forest", label: "Forest", from: "#15803d", to: "#0d4d25", ink: "#ffffff" },
  { key: "navy", label: "Navy", from: "#1d4ed8", to: "#112f82", ink: "#ffffff" },
  { key: "mustard", label: "Mustard", from: "#a16207", to: "#613b04", ink: "#ffffff" },
  { key: "teal", label: "Teal", from: "#0f766e", to: "#094742", ink: "#ffffff" },
  { key: "plum", label: "Plum", from: "#7c3aed", to: "#4a238e", ink: "#ffffff" },
  { key: "slate", label: "Slate", from: "#334155", to: "#1f2733", ink: "#ffffff" },
  { key: "terracotta", label: "Terracotta", from: "#b45309", to: "#6c3205", ink: "#ffffff" },
  { key: "sage", label: "Sage", from: "#4d7c0f", to: "#2e4a09", ink: "#ffffff" },
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
