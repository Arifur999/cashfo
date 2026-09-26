import { redirect } from "next/navigation";
import { HabitMonthTrackersPageClient } from "@/components/habit-tracker/HabitMonthTrackersPageClient";
import { HabitsListPageClient } from "@/components/habit-tracker/HabitsListPageClient";
import { MONTH_TRACKER_CATEGORIES } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getHabitTrackers, getHabits } from "@/lib/habits";

export default async function HabitsPage({ searchParams }: PageProps<"/habit-tracker/habits">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : undefined;

  // A category with a month-sheet tracker (currently Namaz) shows that
  // ("Create Month" + the vertical checkbox sheet) instead of the generic
  // habits table. Habits filed under it still exist -- they show up on the
  // Dashboard checklist and under "All".
  if (category && (MONTH_TRACKER_CATEGORIES as readonly string[]).includes(category)) {
    const trackers = await getHabitTrackers(category);
    return <HabitMonthTrackersPageClient category={category} trackers={trackers} />;
  }

  const habits = await getHabits(true, category);

  return <HabitsListPageClient habits={habits} category={category} />;
}
