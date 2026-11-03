import { redirect } from "next/navigation";
import { NamazDashboardClient } from "@/components/modules/Customer/HabitTracker/Namaz/NamazDashboardClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getHabitTrackers } from "@/lib/customer/habits";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/habit-tracker/habits/namaz");

const isMonthKey = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

// Worship › Namaz › Dashboard: one month (this one unless ?month= says)
// with its figures, sheet, weeks and what stands out. Personal.
export default async function NamazDashboardPage({ searchParams }: PageProps<"/habit-tracker/habits/namaz">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const today = getAppToday();
  const month = isMonthKey(sp.month) && sp.month <= today.slice(0, 7) ? sp.month : today.slice(0, 7);
  const trackers = await getHabitTrackers("Namaz");
  return <NamazDashboardClient trackers={trackers} month={month} today={today} />;
}
