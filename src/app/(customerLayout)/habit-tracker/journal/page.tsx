import { redirect } from "next/navigation";
import { HabitLoadError } from "@/components/modules/Customer/HabitTracker/Tracker/HabitLoadError";
import { JournalPageClient } from "@/components/modules/Customer/HabitTracker/Writing/JournalPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { isIsoDay } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getJournalMonth, getNotesOverview } from "@/lib/customer/writing";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/habit-tracker/journal");

const isMonthKey = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

// Notes & Journal › Journal: one entry a day, with the diary PIN in front
// of the private ones. ?date= picks the day (never after today) and
// ?month= the calendar's month, the day's own unless given.
export default async function JournalPage({ searchParams }: PageProps<"/habit-tracker/journal">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const today = getAppToday();
  const date = isIsoDay(sp.date) && sp.date <= today && sp.date >= "2000-01-01" ? sp.date : today;
  const month = isMonthKey(sp.month) && sp.month <= today.slice(0, 7) && sp.month >= "2000-01" ? sp.month : date.slice(0, 7);
  // The day's own month too, when the calendar shows another: its entry
  // must come from somewhere, or the editor would open empty over it.
  const dayMonth = date.slice(0, 7);
  const [data, dayData, overview] = await Promise.all([getJournalMonth(month), month === dayMonth ? null : getJournalMonth(dayMonth), getNotesOverview()]);
  if (!data || (month !== dayMonth && !dayData)) return <HabitLoadError title="Journal" message="We couldn't load your journal just now." />;
  const entry = ((month === dayMonth ? data : dayData)?.entries ?? []).find((row) => row.date === date) ?? null;
  return <JournalPageClient data={data} categories={overview?.categories ?? []} date={date} entry={entry} />;
}
