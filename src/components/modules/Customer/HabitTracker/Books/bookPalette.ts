// Cover colours a book can have. The keys match the backend's BOOK_COLORS
// (backend/src/books/book-colors.ts) -- keep the two in sync.
export interface BookPalette {
  key: string;
  label: string; // English, passed through t()
  from: string; // gradient start (cover top-left)
  to: string; // gradient end
  ink: string; // title colour on the cover
}

// design-v4 draws the covers in deeper, cleaner colours (the LibraryHome
// board: Atomic Habits in #9A3412 with a #7C2D12 spine).
export const BOOK_PALETTE: BookPalette[] = [
  { key: "walnut", label: "Walnut", from: "#9a3412", to: "#7c2d12", ink: "#ffedd5" },
  { key: "oxblood", label: "Oxblood", from: "#b91c1c", to: "#7f1d1d", ink: "#fee2e2" },
  { key: "forest", label: "Forest", from: "#047857", to: "#065f46", ink: "#d1fae5" },
  { key: "navy", label: "Navy", from: "#1e3a8a", to: "#172554", ink: "#dbeafe" },
  { key: "mustard", label: "Mustard", from: "#a16207", to: "#713f12", ink: "#fef9c3" },
  { key: "teal", label: "Teal", from: "#0f766e", to: "#134e4a", ink: "#ccfbf1" },
  { key: "plum", label: "Plum", from: "#6d28d9", to: "#4c1d95", ink: "#ede9fe" },
  { key: "slate", label: "Slate", from: "#334155", to: "#1e293b", ink: "#e2e8f0" },
  { key: "terracotta", label: "Terracotta", from: "#b45309", to: "#78350f", ink: "#fef3c7" },
  { key: "sage", label: "Sage", from: "#4d7c0f", to: "#365314", ink: "#ecfccb" },
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
