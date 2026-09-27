import { redirect } from "next/navigation";
import { BooksLoadError } from "@/components/habit-tracker/books/BooksLoadError";
import { BooksPageClient } from "@/components/habit-tracker/books/BooksPageClient";
import { HabitsListPageClient } from "@/components/habit-tracker/HabitsListPageClient";
import { SkillsLoadError } from "@/components/habit-tracker/skills/SkillsLoadError";
import { SkillsPageClient } from "@/components/habit-tracker/skills/SkillsPageClient";
import { NamazListPageClient } from "@/components/habit-tracker/namaz/NamazListPageClient";
import { RamadanListPageClient } from "@/components/habit-tracker/ramadan/RamadanListPageClient";
import { getCurrentUser } from "@/lib/auth";
import { dhakaDayNumber, getBooksOverview } from "@/lib/books";
import { getHabitTrackers, getHabits } from "@/lib/habits";
import { getSkillsOverview } from "@/lib/skills";

export default async function HabitsPage({ searchParams }: PageProps<"/habit-tracker/habits">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : undefined;

  // Namaz, Ramadan, Book and Course (Skills) have their own themed pages instead of the generic
  // habits table. Habits filed under them still exist -- they show up on the
  // Dashboard checklist and under "All".
  if (category === "Namaz") {
    const trackers = await getHabitTrackers("Namaz");
    return <NamazListPageClient trackers={trackers} />;
  }

  if (category === "Ramadan") {
    const trackers = await getHabitTrackers("Ramadan");
    return <RamadanListPageClient trackers={trackers} />;
  }

  if (category === "Book") {
    const overview = await getBooksOverview();
    // Never render "no books yet" when the request merely failed.
    if (!overview) return <BooksLoadError />;
    return <BooksPageClient overview={overview} quoteDay={dhakaDayNumber()} />;
  }

  // "Skills" (stored as the habit category "Course").
  if (category === "Course") {
    const overview = await getSkillsOverview();
    if (!overview) return <SkillsLoadError />;
    return <SkillsPageClient overview={overview} quoteDay={dhakaDayNumber()} />;
  }

  const habits = await getHabits(true, category);

  return <HabitsListPageClient habits={habits} category={category} />;
}
