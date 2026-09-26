import { redirect } from "next/navigation";
import { HabitsListPageClient } from "@/components/habit-tracker/HabitsListPageClient";
import { NamazListPageClient } from "@/components/habit-tracker/namaz/NamazListPageClient";
import { RamadanListPageClient } from "@/components/habit-tracker/ramadan/RamadanListPageClient";
import { getCurrentUser } from "@/lib/auth";
import { getHabitTrackers, getHabits } from "@/lib/habits";

export default async function HabitsPage({ searchParams }: PageProps<"/habit-tracker/habits">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : undefined;

  // Namaz and Ramadan have their own themed lists ("Create Month" / "Create
  // Ramadan" + one card each) instead of the generic habits table. Habits
  // filed under them still exist -- they show up on the Dashboard checklist
  // and under "All".
  if (category === "Namaz") {
    const trackers = await getHabitTrackers("Namaz");
    return <NamazListPageClient trackers={trackers} />;
  }

  if (category === "Ramadan") {
    const trackers = await getHabitTrackers("Ramadan");
    return <RamadanListPageClient trackers={trackers} />;
  }

  const habits = await getHabits(true, category);

  return <HabitsListPageClient habits={habits} category={category} />;
}
