import { redirect } from "next/navigation";
import { HabitDashboardPageClient } from "@/components/habit-tracker/HabitDashboardPageClient";
import { getCurrentUser } from "@/lib/auth";
import { getHabitsToday } from "@/lib/habits";

// "Habit Tracker" app-mode's landing page, reached via the TopBar's "Switch"
// button. User-scoped only -- no :businessId/workspace concept at all, see
// lib/api.ts's comment on Habit.
export default async function HabitTrackerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const habitsToday = await getHabitsToday();

  return <HabitDashboardPageClient habitsToday={habitsToday} />;
}
