import { redirect } from "next/navigation";
import { DailyHabitsReportClient } from "@/components/modules/Customer/HabitTracker/Report/DailyHabitsReportClient";
import { HabitLoadError } from "@/components/modules/Customer/HabitTracker/Tracker/HabitLoadError";
import { getCurrentUser } from "@/lib/customer/auth";
import { shiftMonth } from "@/lib/customer/groupDisplay";
import { habitStart } from "@/lib/customer/habitDisplay";
import { getHabitMonths } from "@/lib/customer/habits";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/habit-tracker/daily/report");

const isMonthKey = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

// The most months back the report reads (backend MAX_LOG_MONTHS).
const MONTHS_BACK = 23;

// Daily habits › Monthly report: ?month= picks the month, this one unless
// given, within the last two years. Personal (user-scoped).
export default async function DailyHabitsReportPage({ searchParams }: PageProps<"/habit-tracker/daily/report">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const today = getAppToday();
  const thisMonth = today.slice(0, 7);
  const oldest = shiftMonth(thisMonth, -MONTHS_BACK);
  const data = await getHabitMonths(oldest, thisMonth);
  if (!data) return <HabitLoadError title="Monthly report" message="We couldn't load your habits just now." />;
  // The list starts at the month the first habit did (this one with none),
  // never before the oldest read.
  const first = data.habits.map((habit) => habitStart(habit, data.logs).slice(0, 7)).sort()[0] ?? thisMonth;
  const firstMonth = first < oldest ? oldest : first > thisMonth ? thisMonth : first;
  const month = isMonthKey(sp.month) && sp.month <= thisMonth && sp.month >= firstMonth ? sp.month : thisMonth;
  return <DailyHabitsReportClient habits={data.habits} logs={data.logs} month={month} today={today} firstMonth={firstMonth} />;
}
