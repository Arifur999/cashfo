import { redirect } from "next/navigation";
import { HabitsHomePageClient } from "@/components/modules/Customer/HabitTracker/Home/HabitsHomePageClient";
import type { HabitsHomeData } from "@/components/modules/Customer/HabitTracker/Home/homeTypes";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBooksOverview } from "@/lib/customer/books";
import { shiftMonth } from "@/lib/customer/groupDisplay";
import { getHabitMonth, getHabits, getHabitsToday, getHabitTrackers } from "@/lib/customer/habits";
import { getSkillsOverview } from "@/lib/customer/skills";
import { getAppToday } from "@/lib/date";

// Habits › Today: the day across every habit feature. Personal
// (user-scoped), not a workspace's.
export default async function HabitsTodayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = getAppToday();
  const month = today.slice(0, 7);
  const [namaz, habits, todayRows, thisMonth, lastMonth, books, skills, challenges, ramadan] = await Promise.all([
    getHabitTrackers("Namaz"),
    getHabits(true),
    getHabitsToday(),
    getHabitMonth(month),
    getHabitMonth(shiftMonth(month, -1)),
    getBooksOverview(),
    getSkillsOverview(),
    getHabitTrackers("Others"),
    getHabitTrackers("Ramadan"),
  ]);

  const data: HabitsHomeData = { today, namaz, habits, todayRows, logs: [...lastMonth.logs, ...thisMonth.logs], books, skills, challenges, ramadan };
  return <HabitsHomePageClient data={data} />;
}
