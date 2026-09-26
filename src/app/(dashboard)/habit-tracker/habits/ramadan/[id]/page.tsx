import { notFound, redirect } from "next/navigation";
import { RamadanSheetPageClient } from "@/components/habit-tracker/ramadan/RamadanSheetPageClient";
import { getCurrentUser } from "@/lib/auth";
import { getHabitTracker } from "@/lib/habits";

// One Ramadan's sheet, opened from a card on Habits -> Ramadan.
export default async function RamadanSheetPage({ params }: PageProps<"/habit-tracker/habits/ramadan/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const tracker = await getHabitTracker(id);
  if (!tracker || tracker.category !== "Ramadan") notFound();

  return <RamadanSheetPageClient tracker={tracker} />;
}
