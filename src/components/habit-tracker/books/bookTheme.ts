import type { BookStatus } from "@/lib/api";

// The Book page's "warm library" look -- walnut, cream, copper. Full literal
// Tailwind class strings (Tailwind can't see names built by concatenation).
export const BOOK_CTA =
  "flex items-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-black/25 transition hover:from-orange-300 hover:to-orange-500 disabled:opacity-60";

export const BOOK_CARD = "rounded-2xl border border-amber-900/10 bg-surface shadow-sm shadow-black/5";

// Gradient stops of every progress bar.
export const BOOK_BAR = "from-amber-500 to-orange-600";

// Copper, for the goal ring.
export const COPPER = "#c2703d";

// Label (English, passed through t()) and chip colours of each shelf.
export const STATUS_META: Record<BookStatus, { label: string; chip: string }> = {
  WANT_TO_READ: { label: "Want to read", chip: "bg-neutral-500/10 text-neutral-600" },
  READING: { label: "Reading", chip: "bg-amber-600/10 text-amber-700 dark:text-amber-300" },
  FINISHED: { label: "Finished", chip: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-300" },
};
