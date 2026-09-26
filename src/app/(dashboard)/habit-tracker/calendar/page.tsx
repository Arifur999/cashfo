import { redirect } from "next/navigation";
import { HabitCalendarPageClient } from "@/components/habit-tracker/HabitCalendarPageClient";
import { getCurrentUser } from "@/lib/auth";
import { getHabitMonthLogs } from "@/lib/habits";

export default async function HabitCalendarPage({ searchParams }: PageProps<"/habit-tracker/calendar">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const month = typeof sp.month === "string" ? sp.month : new Date().toISOString().slice(0, 7);

  const data = await getHabitMonthLogs(month);

  return <HabitCalendarPageClient month={month} data={data} />;
}
