import { notFound, redirect } from "next/navigation";
import { NamazSheetPageClient } from "@/components/modules/Customer/HabitTracker/Namaz/NamazSheetPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getHabitTracker, getHabitTrackers } from "@/lib/customer/habits";
import { monthName } from "@/lib/customer/insights";
import { trackerFor } from "@/lib/customer/namazDisplay";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getLocale } from "@/lib/i18n/locale";

// The tab names the month as the sheet does ("October 2026"), from the read
// the page makes.
export async function generateMetadata({ params }: PageProps<"/habit-tracker/habits/namaz/[id]">) {
  const { id } = await params;
  // A failed read is the page's to show (its error screen); the tab keeps
  // the list's name.
  const user = await getCurrentUser().catch(() => null);
  const tracker = user ? await getHabitTracker(id).catch(() => null) : null;
  const record = tracker?.category === "Namaz" && tracker.year && tracker.month ? monthName(`${tracker.year}-${String(tracker.month).padStart(2, "0")}`, await getLocale(), "long", true) : null;
  return customerPageMetadata(`/habit-tracker/habits/namaz/${id}`, { record });
}

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
