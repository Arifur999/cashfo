import { notFound, redirect } from "next/navigation";
import { NamazSheetPageClient } from "@/components/modules/Customer/HabitTracker/Namaz/NamazSheetPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getHabitTracker, getHabitTrackers, getQaza } from "@/lib/customer/habits";
import { trackerFor } from "@/lib/customer/namazDisplay";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

// The list's name, read from nothing: Next runs generateMetadata for every
// <Link> prefetch of this page, without rendering the page, so reading the
// record here cost API calls for each row on screen.
export async function generateMetadata({ params }: PageProps<"/habit-tracker/habits/namaz/[id]">) {
  const { id } = await params;
  return customerPageMetadata(`/habit-tracker/habits/namaz/${id}`);
}

// One month's Namaz sheet, opened from Habits › Namaz.
export default async function NamazSheetPage({ params }: PageProps<"/habit-tracker/habits/namaz/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const [tracker, all, qaza] = await Promise.all([getHabitTracker(id), getHabitTrackers("Namaz"), getQaza()]);
  if (!tracker || tracker.category !== "Namaz") notFound();

  const year = tracker.year as number;
  const month = tracker.month as number;
  const previous = month === 1 ? trackerFor(all, year - 1, 12) : trackerFor(all, year, month - 1);
  const months = all.flatMap((each) => (each.year && each.month ? [{ year: each.year, month: each.month, id: each.id }] : []));

  return <NamazSheetPageClient tracker={tracker} previous={previous} months={months} today={getAppToday()} qaza={qaza} />;
}
