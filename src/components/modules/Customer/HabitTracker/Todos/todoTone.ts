import type { TodoColor, TodoPriority } from "@/lib/customer/api";

// A list's colour on the board, from the app's tints: its dot, its soft chip
// (a task row's list), and the picked look (a list filtered on, a list
// chosen in the popup). Written out whole so Tailwind sees every class.
export const LIST_TONE: Record<TodoColor, { dot: string; chip: string; on: string; swatch: string }> = {
  blue: { dot: "bg-tint-blue-ink", chip: "bg-tint-blue text-tint-blue-ink", on: "border-tint-blue-ink bg-tint-blue text-tint-blue-ink", swatch: "bg-tint-blue-ink" },
  violet: { dot: "bg-tint-violet-ink", chip: "bg-tint-violet text-tint-violet-ink", on: "border-tint-violet-ink bg-tint-violet text-tint-violet-ink", swatch: "bg-tint-violet-ink" },
  orange: { dot: "bg-tint-orange-ink", chip: "bg-tint-orange text-tint-orange-ink", on: "border-tint-orange-ink bg-tint-orange text-tint-orange-ink", swatch: "bg-tint-orange-ink" },
  green: { dot: "bg-tint-green-ink", chip: "bg-tint-green text-tint-green-ink", on: "border-tint-green-ink bg-tint-green text-tint-green-ink", swatch: "bg-tint-green-ink" },
  pink: { dot: "bg-tint-pink-ink", chip: "bg-tint-pink text-tint-pink-ink", on: "border-tint-pink-ink bg-tint-pink text-tint-pink-ink", swatch: "bg-tint-pink-ink" },
  teal: { dot: "bg-tint-teal-ink", chip: "bg-tint-teal text-tint-teal-ink", on: "border-tint-teal-ink bg-tint-teal text-tint-teal-ink", swatch: "bg-tint-teal-ink" },
  yellow: { dot: "bg-tint-yellow-ink", chip: "bg-tint-yellow text-tint-yellow-ink", on: "border-tint-yellow-ink bg-tint-yellow text-tint-yellow-ink", swatch: "bg-tint-yellow-ink" },
  indigo: { dot: "bg-tint-indigo-ink", chip: "bg-tint-indigo text-tint-indigo-ink", on: "border-tint-indigo-ink bg-tint-indigo text-tint-indigo-ink", swatch: "bg-tint-indigo-ink" },
  emerald: { dot: "bg-tint-emerald-ink", chip: "bg-tint-emerald text-tint-emerald-ink", on: "border-tint-emerald-ink bg-tint-emerald text-tint-emerald-ink", swatch: "bg-tint-emerald-ink" },
  purple: { dot: "bg-tint-purple-ink", chip: "bg-tint-purple text-tint-purple-ink", on: "border-tint-purple-ink bg-tint-purple text-tint-purple-ink", swatch: "bg-tint-purple-ink" },
};

// A priority's soft chip, dot, and its look when picked in the popup.
export const PRIORITY_LOOK: Record<TodoPriority, { chip: string; dot: string; on: string; bar: string }> = {
  HIGH: { chip: "bg-expense-soft text-expense", dot: "bg-expense-fill", on: "border-expense-fill bg-expense-soft text-expense", bar: "border-l-expense-fill" },
  MEDIUM: { chip: "bg-warning-soft text-warning", dot: "bg-warning-fill", on: "border-warning-fill bg-warning-soft text-warning", bar: "border-l-warning-fill" },
  LOW: { chip: "bg-surface-sunken text-ink-soft", dot: "bg-ink-faint", on: "border-ink-faint bg-surface-sunken text-ink-soft", bar: "border-l-ink-faint" },
};
