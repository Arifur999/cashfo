import type { BUDGET_CATEGORY_COLORS, BUDGET_CATEGORY_ICONS } from "@/lib/customer/budgetCategoryVisuals";

// The icons and colours the New habit drawer offers: a dozen that suit a
// habit, from the keys Habit.icon and Habit.color accept.
export type HabitIconKey = (typeof BUDGET_CATEGORY_ICONS)[number];
export type HabitColorKey = (typeof BUDGET_CATEGORY_COLORS)[number];

export const HABIT_ICONS: { key: HabitIconKey; label: string }[] = [
  { key: "droplet", label: "Water" },
  { key: "health", label: "Health" },
  { key: "education", label: "Study" },
  { key: "flame", label: "Energy" },
  { key: "bike", label: "Cycling" },
  { key: "bed", label: "Sleep" },
  { key: "sparkles", label: "Mindfulness" },
  { key: "lightbulb", label: "Idea" },
  { key: "watch", label: "Time" },
  { key: "food", label: "Food" },
  { key: "entertainment", label: "Fun" },
  { key: "travel", label: "Outdoors" },
];

export const HABIT_COLORS: { key: HabitColorKey; label: string }[] = [
  { key: "blue", label: "Blue" },
  { key: "cyan", label: "Sky" },
  { key: "teal", label: "Teal" },
  { key: "green", label: "Green" },
  { key: "yellow", label: "Amber" },
  { key: "orange", label: "Orange" },
  { key: "pink", label: "Rose" },
  { key: "violet", label: "Violet" },
];

export const HABIT_UNITS = ["minutes", "glasses", "pages", "steps", "times"];
