// The list recipes: one set of classes for every table's column heads, bands,
// dividers, hover and footer, so the customer lists (smartly/list) and the
// admin DataTable draw them alike. Plain strings, so they merge through cn()
// and a caller can still override one part ("px-5" on the admin footer).

// How far a row's content sits from the card's edge: 16px on phones, 24px
// from md up, as the list boards draw it. The heads, bands and footer use the
// same inset, so a footer's summary lines up with the rows above it.
export const LIST_INSET = "px-4 md:px-6";

// Column heads: the table-head band, 12px, no capitals.
export const LIST_HEAD = "bg-table-head px-4 text-caption font-medium text-ink-muted md:px-6";

// A group band (a day, a month, an account type).
export const LIST_GROUP = "bg-table-head px-4 text-caption font-semibold text-ink-2 md:px-6";

// The totals row at the foot of a table.
export const LIST_TOTAL = "bg-table-head px-4 text-body font-semibold text-ink md:px-6";

// The line between two rows; the card's edges and the head keep border-line.
export const LIST_DIVIDER = "border-divider";

// A row that goes somewhere.
export const LIST_HOVER = "hover:bg-hover";

// The strip under a list that holds Pagination, LoadMore or a note.
export const LIST_FOOTER = "border-t border-line px-4 py-3 text-small text-ink-muted md:px-6";

// The density scale: 44 / 56 / 64 / 72px rows.
export const ROW_HEIGHT = {
  dense: "min-h-11",
  regular: "min-h-14",
  relaxed: "min-h-16",
  spacious: "min-h-18",
} as const;

export type RowDensity = keyof typeof ROW_HEIGHT;

export type CellAlign = "start" | "end" | "center";

export const CELL_ALIGN: Record<CellAlign, string> = {
  start: "text-left",
  end: "text-right",
  center: "text-center",
};
