import type { SkillStatus } from "@/lib/api";

// The Skills page's look -- deep violet with lime. Full literal Tailwind class
// strings (Tailwind can't see names built by concatenation).
export const SKILL_CTA =
  "flex items-center gap-2 rounded-xl bg-gradient-to-b from-lime-300 to-lime-400 px-4 py-2.5 text-sm font-semibold text-violet-950 shadow-md shadow-black/25 transition hover:from-lime-200 hover:to-lime-300 disabled:opacity-60";

export const SKILL_CARD = "rounded-2xl border border-violet-900/10 dark:border-violet-300/15 bg-surface shadow-sm shadow-black/5";

// Gradient stops of the progress bars.
export const SKILL_BAR = "from-violet-500 to-lime-400";

// Buttons.
export const SKILL_OUTLINE_BTN =
  "rounded-lg border border-violet-900/15 dark:border-violet-300/25 px-3 py-1.5 text-xs font-semibold text-violet-800 dark:text-violet-300 transition hover:bg-violet-600/10";
export const SKILL_PRIMARY_BTN = "rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700";
export const SKILL_FINISH_BTN =
  "flex items-center gap-1 rounded-lg border border-lime-600/40 px-3 py-1.5 text-xs font-semibold text-lime-800 dark:text-lime-300 transition hover:bg-lime-500/10";

// The violet of the goal ring.
export const RING_COLOR = "#7c3aed";

// Label (English, passed through t()) and chip colours of each shelf.
export const STATUS_META: Record<SkillStatus, { label: string; chip: string }> = {
  WANT_TO_LEARN: { label: "Want to learn", chip: "bg-neutral-500/10 text-neutral-600" },
  LEARNING: { label: "Learning", chip: "bg-violet-600/10 text-violet-700 dark:text-violet-300" },
  COMPLETED: { label: "Completed", chip: "bg-lime-500/15 text-lime-800 dark:text-lime-300" },
};
