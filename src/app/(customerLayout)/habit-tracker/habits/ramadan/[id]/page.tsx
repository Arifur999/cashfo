import { notFound, redirect } from "next/navigation";
import { RamadanSheetPageClient } from "@/components/modules/Customer/HabitTracker/Ramadan/RamadanSheetPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getHabitTracker, getHabitTrackers } from "@/lib/customer/habits";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

// The list's name, read from nothing: Next runs generateMetadata for every
// <Link> prefetch of this page, without rendering the page, so reading the
// record here cost API calls for each row on screen.
export async function generateMetadata({ params }: PageProps<"/habit-tracker/habits/ramadan/[id]">) {
  const { id } = await params;
  return customerPageMetadata(`/habit-tracker/habits/ramadan/${id}`);
}

// Ramadan › Dashboard: one Ramadan's sheet.
export default async function RamadanSheetPage({ params }: PageProps<"/habit-tracker/habits/ramadan/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const [tracker, all] = await Promise.all([getHabitTracker(id), getHabitTrackers("Ramadan")]);
  if (!tracker || tracker.category !== "Ramadan") notFound();

  return <RamadanSheetPageClient tracker={tracker} all={all} today={getAppToday()} />;
}
