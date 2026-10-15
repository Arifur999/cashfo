import { notFound, redirect } from "next/navigation";
import { NamazSheetPageClient } from "@/components/modules/Customer/HabitTracker/Namaz/NamazSheetPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getHabitTracker, getHabitTrackers } from "@/lib/customer/habits";
import { trackerFor } from "@/lib/customer/namazDisplay";

// One month's Namaz sheet, opened from Habits › Namaz.
export default async function NamazSheetPage({ params }: PageProps<"/habit-tracker/habits/namaz/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const [tracker, all] = await Promise.all([getHabitTracker(id), getHabitTrackers("Namaz")]);
  if (!tracker || tracker.category !== "Namaz") notFound();

  const year = tracker.year as number;
  const month = tracker.month as number;
  const previous = month === 1 ? trackerFor(all, year - 1, 12) : trackerFor(all, year, month - 1);
  const next = month === 12 ? trackerFor(all, year + 1, 1) : trackerFor(all, year, month + 1);

  return <NamazSheetPageClient tracker={tracker} previous={previous} next={next} />;
}
