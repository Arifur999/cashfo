// The Others page's look -- slate + amber. Deliberately neutral (Ramadan
// emerald/gold, Namaz sapphire/silver, Library walnut/copper, Skills
// violet/lime all commit to a domain; Others doesn't have one). Full literal
// Tailwind class strings (Tailwind can't see names built by concatenation).
export const OTHER_CTA =
  "flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-black/25 transition hover:from-amber-300 hover:to-amber-400 disabled:opacity-60";

export const OTHER_CARD = "rounded-2xl border border-slate-900/10 dark:border-amber-300/15 bg-surface shadow-sm shadow-black/5";

// Gradient stops of every progress bar / chart bar.
export const OTHER_BAR = "from-slate-500 to-amber-400";

// Chip colours for the habit grid's Active/Archived filter and status pills.
export const STATUS_CHIP = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  archived: "bg-neutral-500/10 text-neutral-600",
};
