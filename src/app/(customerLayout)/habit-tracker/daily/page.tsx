import { redirect } from "next/navigation";
import { DailyHabitsPageClient } from "@/components/modules/Customer/HabitTracker/Daily/DailyHabitsPageClient";
import type { DailyHabitsData } from "@/components/modules/Customer/HabitTracker/Daily/dailyTypes";
import { getCurrentUser } from "@/lib/customer/auth";
import { isIsoDay } from "@/lib/customer/dateRangePresets";
import { getHabitMonth, getHabits, getHabitStats, getHabitsToday } from "@/lib/customer/habits";
import { shiftMonth } from "@/lib/customer/groupDisplay";
import { getAppToday } from "@/lib/date";

// Daily habits: the habits planned for a day, ticked off as you go, with
// each one's month on the side. Personal (user-scoped), not a workspace's.
export default async function DailyHabitsPage({ searchParams }: PageProps<"/habit-tracker/daily">) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = getAppToday();
  // A day from the URL, never after today.
  const day = isIsoDay(sp.day) && sp.day <= today ? sp.day : today;
  const month = day.slice(0, 7);

  const [habits, todayRows, stats, thisMonth, lastMonth] = await Promise.all([getHabits(true), getHabitsToday(), getHabitStats(), getHabitMonth(month), getHabitMonth(shiftMonth(month, -1))]);

  const data: DailyHabitsData = { today, day, habits, todayRows, stats, logs: [...lastMonth.logs, ...thisMonth.logs] };
  return <DailyHabitsPageClient data={data} />;
}
