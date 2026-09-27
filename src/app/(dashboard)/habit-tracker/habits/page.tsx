import { redirect } from "next/navigation";
import { BooksLoadError } from "@/components/habit-tracker/books/BooksLoadError";
import { BooksPageClient } from "@/components/habit-tracker/books/BooksPageClient";
import { HabitsListPageClient } from "@/components/habit-tracker/HabitsListPageClient";
import { SkillsLoadError } from "@/components/habit-tracker/skills/SkillsLoadError";
import { SkillsPageClient } from "@/components/habit-tracker/skills/SkillsPageClient";
import { NamazListPageClient } from "@/components/habit-tracker/namaz/NamazListPageClient";
import { OthersPageClient } from "@/components/habit-tracker/others/OthersPageClient";
import { RamadanListPageClient } from "@/components/habit-tracker/ramadan/RamadanListPageClient";
import { getCurrentUser } from "@/lib/auth";
import { dhakaDayNumber, getBooksOverview } from "@/lib/books";
import { getHabitMonthLogs, getHabits, getHabitsToday, getHabitStats, getHabitTrackers } from "@/lib/habits";
import { buildOtherWeek, monthKeys } from "@/lib/otherWeek";
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

  if (category === "Others") {
    const now = new Date();
    const { current, needsPrevious, previous } = monthKeys(now);
    // One after the other, not Promise.all: the local dev database (`prisma
    // dev`) drops the connection when concurrent requests query it at once.
    const habits = await getHabits(true, "Others");
    const habitsToday = await getHabitsToday("Others");
    const stats = await getHabitStats("Others");
    const currentMonth = await getHabitMonthLogs(current, "Others");
    const previousMonth = needsPrevious ? await getHabitMonthLogs(previous, "Others") : null;
    const activeHabits = habits.filter((h) => !h.isArchived);
    const week = buildOtherWeek(activeHabits, currentMonth, previousMonth);
    return <OthersPageClient habits={habits} habitsToday={habitsToday} stats={stats} week={week} quoteDay={dhakaDayNumber()} />;
  }

  const habits = await getHabits(true, category);

  return <HabitsListPageClient habits={habits} category={category} />;
}
