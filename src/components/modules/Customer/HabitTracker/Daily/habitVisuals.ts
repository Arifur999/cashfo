import type { BUDGET_CATEGORY_COLORS, BUDGET_CATEGORY_ICONS } from "@/lib/customer/budgetCategoryVisuals";

// The icons and colours the New habit drawer offers: a dozen that suit a
// habit, from the keys Habit.icon and Habit.color accept.
export type HabitIconKey = (typeof BUDGET_CATEGORY_ICONS)[number];
export type HabitColorKey = (typeof BUDGET_CATEGORY_COLORS)[number];

// In the DailyHabitDrawer board's order: water, walking, exercise, reading,
// writing, sleep, morning, food, health, nature, a goal and quitting
// something. Habits saved with an older pick (a bike, a bed) keep it.
export const HABIT_ICONS: { key: HabitIconKey; label: string }[] = [
  { key: "droplet", label: "Water" },
  { key: "footprints", label: "Walking" },
  { key: "dumbbell", label: "Exercise" },
  { key: "book-open", label: "Reading" },
  { key: "pencil", label: "Writing" },
  { key: "moon", label: "Sleep" },
  { key: "sun", label: "Morning" },
  { key: "apple", label: "Food" },
  { key: "heart", label: "Health" },
  { key: "leaf", label: "Nature" },
  { key: "target", label: "Goal" },
  { key: "ban", label: "Quit something" },
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

// The unit chips live with the maths that words them (habitDisplay.ts).
export { HABIT_UNITS } from "@/lib/customer/habitDisplay";
