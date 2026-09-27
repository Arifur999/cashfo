import { redirect } from "next/navigation";
import { BooksLoadError } from "@/components/habit-tracker/books/BooksLoadError";
import { BooksPageClient } from "@/components/habit-tracker/books/BooksPageClient";
import { SkillsLoadError } from "@/components/habit-tracker/skills/SkillsLoadError";
import { SkillsPageClient } from "@/components/habit-tracker/skills/SkillsPageClient";
import { NamazListPageClient } from "@/components/habit-tracker/namaz/NamazListPageClient";
import { OthersListPageClient } from "@/components/habit-tracker/others/OthersListPageClient";
import { RamadanListPageClient } from "@/components/habit-tracker/ramadan/RamadanListPageClient";
import { getCurrentUser } from "@/lib/auth";
import { dhakaDayNumber, getBooksOverview } from "@/lib/books";
import { getHabitTrackers } from "@/lib/habits";
import { getSkillsOverview } from "@/lib/skills";

export default async function HabitsPage({ searchParams }: PageProps<"/habit-tracker/habits">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : undefined;

  // Namaz, Ramadan, Book, Course (Skills) and Others all have their own themed
  // pages -- there is no more generic "All habits" table, so any other/missing
  // category (a stale bookmark, or the bare route) goes back to the
  // whole-account dashboard instead of rendering an orphaned page.
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
    const trackers = await getHabitTrackers("Others");
    return <OthersListPageClient trackers={trackers} />;
  }

  redirect("/habit-tracker");
}
