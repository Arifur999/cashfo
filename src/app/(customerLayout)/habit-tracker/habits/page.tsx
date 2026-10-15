import { redirect } from "next/navigation";
import { BooksLoadError } from "@/components/modules/Customer/HabitTracker/Books/BooksLoadError";
import { BooksPageClient } from "@/components/modules/Customer/HabitTracker/Books/BooksPageClient";
import { SkillsLoadError } from "@/components/modules/Customer/HabitTracker/Skills/SkillsLoadError";
import { SkillsPageClient } from "@/components/modules/Customer/HabitTracker/Skills/SkillsPageClient";
import { NamazHomePageClient } from "@/components/modules/Customer/HabitTracker/Namaz/NamazHomePageClient";
import { ChallengesHomePageClient } from "@/components/modules/Customer/HabitTracker/Others/ChallengesHomePageClient";
import { RamadanHomePageClient } from "@/components/modules/Customer/HabitTracker/Ramadan/RamadanHomePageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { dhakaDayNumber, getBooksOverview } from "@/lib/customer/books";
import { getHabitTrackers } from "@/lib/customer/habits";
import { getSkillsOverview } from "@/lib/customer/skills";
import { getAppToday } from "@/lib/date";

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
    return <NamazHomePageClient trackers={trackers} today={getAppToday()} />;
  }

  if (category === "Ramadan") {
    const trackers = await getHabitTrackers("Ramadan");
    return <RamadanHomePageClient trackers={trackers} today={getAppToday()} />;
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
    return <ChallengesHomePageClient trackers={trackers} today={getAppToday()} />;
  }

  redirect("/habit-tracker");
}
