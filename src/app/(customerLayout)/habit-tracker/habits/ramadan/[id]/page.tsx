import { notFound, redirect } from "next/navigation";
import { RamadanSheetPageClient } from "@/components/modules/Customer/HabitTracker/Ramadan/RamadanSheetPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getHabitTracker, getHabitTrackers } from "@/lib/customer/habits";
import { getAppToday } from "@/lib/date";

// One Ramadan's sheet, opened from Habits › Ramadan.
export default async function RamadanSheetPage({ params }: PageProps<"/habit-tracker/habits/ramadan/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const [tracker, all] = await Promise.all([getHabitTracker(id), getHabitTrackers("Ramadan")]);
  if (!tracker || tracker.category !== "Ramadan") notFound();

  return <RamadanSheetPageClient tracker={tracker} all={all} today={getAppToday()} />;
}
