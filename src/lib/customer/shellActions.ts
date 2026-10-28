"use server";

import { getHabitsToday } from "./habits";
import { doneToday } from "./habitsHome";

// The Habit Tracker menu's "3/5" on Daily habits: today's planned habits
// and how many are done. null when it can't be read: the badge then hides,
// never the page (a maintenance or PIN redirect is the page's to make).
export async function getHabitsTodayCountAction(): Promise<{ done: number; total: number } | null> {
  try {
    const rows = await getHabitsToday();
    return { done: doneToday(rows), total: rows.length };
  } catch {
    return null;
  }
}
