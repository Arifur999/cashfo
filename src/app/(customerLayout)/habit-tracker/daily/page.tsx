import { redirect } from "next/navigation";
import { DailyHabitsPageClient } from "@/components/modules/Customer/HabitTracker/Daily/DailyHabitsPageClient";
import type { DailyHabitsData } from "@/components/modules/Customer/HabitTracker/Daily/dailyTypes";
import { getCurrentUser } from "@/lib/customer/auth";
import { isIsoDay } from "@/lib/customer/dateRangePresets";
import { dailyLogMonths } from "@/lib/customer/habitDisplay";
import { getHabitMonth, getHabits, getHabitStats, getHabitsToday } from "@/lib/customer/habits";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getReminders } from "@/lib/customer/reminders";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/habit-tracker/daily");

const isMonthKey = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

// Daily habits: the habits planned for a day, ticked off as you go, with
// each one's month on the side. ?day= picks the day (never after today) and
// ?month= the month the side panel shows, so leafing through a habit's
// months leaves the day's list where it is. Personal (user-scoped), not a
// workspace's.
export default async function DailyHabitsPage({ searchParams }: PageProps<"/habit-tracker/daily">) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = getAppToday();
  // A day from the URL, never after today.
  const day = isIsoDay(sp.day) && sp.day <= today ? sp.day : today;
  const panelMonth = isMonthKey(sp.month) && sp.month <= today.slice(0, 7) ? sp.month : day.slice(0, 7);
  // The day's week and last 30 days, and the 60 days up to today for the
  // panel's best streak; each month is read once, the panel's only when it
  // is none of these.
  const { dayMonths, bestMonths } = dailyLogMonths(day, today);
  const months = [...new Set([...dayMonths, ...bestMonths, panelMonth])];

  const [habits, todayRows, stats, sheets, reminders] = await Promise.all([getHabits(true), getHabitsToday(), getHabitStats(), Promise.all(months.map((key) => getHabitMonth(key))), getReminders()]);

  const logsOf = new Map(months.map((key, i) => [key, sheets[i].logs]));
  const logsIn = (keys: string[]) => keys.flatMap((key) => logsOf.get(key) ?? []);
  const logs = logsIn(dayMonths);
  const data: DailyHabitsData = { today, day, habits, todayRows, stats, logs, panelMonth, panelLogs: dayMonths.includes(panelMonth) ? logs : logsIn([panelMonth]), bestLogs: logsIn(bestMonths), reminders: reminders?.reminders ?? null };
  return <DailyHabitsPageClient data={data} />;
}
