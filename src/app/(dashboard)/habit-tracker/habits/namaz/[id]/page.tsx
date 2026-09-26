import { notFound, redirect } from "next/navigation";
import { NamazSheetPageClient } from "@/components/habit-tracker/namaz/NamazSheetPageClient";
import { getCurrentUser } from "@/lib/auth";
import { getHabitTracker } from "@/lib/habits";

// One month's Namaz sheet, opened from a card on Habits -> Namaz.
export default async function NamazSheetPage({ params }: PageProps<"/habit-tracker/habits/namaz/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const tracker = await getHabitTracker(id);
  if (!tracker || tracker.category !== "Namaz") notFound();

  return <NamazSheetPageClient tracker={tracker} />;
}
