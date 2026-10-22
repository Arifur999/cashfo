import { redirect } from "next/navigation";
import { BooksLoadError } from "@/components/modules/Customer/HabitTracker/Books/BooksLoadError";
import { LibraryPageClient } from "@/components/modules/Customer/HabitTracker/Books/LibraryPageClient";
import { SkillsHomePageClient } from "@/components/modules/Customer/HabitTracker/Skills/SkillsHomePageClient";
import { SkillsLoadError } from "@/components/modules/Customer/HabitTracker/Skills/SkillsLoadError";
import { NamazHomePageClient } from "@/components/modules/Customer/HabitTracker/Namaz/NamazHomePageClient";
import { ChallengesHomePageClient } from "@/components/modules/Customer/HabitTracker/Others/ChallengesHomePageClient";
import { RamadanHomePageClient } from "@/components/modules/Customer/HabitTracker/Ramadan/RamadanHomePageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBooksOverview } from "@/lib/customer/books";
import { getHabitTrackers, getQaza } from "@/lib/customer/habits";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getReminders } from "@/lib/customer/reminders";
import { getSkillsOverview } from "@/lib/customer/skills";
import { getAppToday } from "@/lib/date";

// One route, five pages: ?category= says which one the tab names.
export async function generateMetadata({ searchParams }: PageProps<"/habit-tracker/habits">) {
  return customerPageMetadata("/habit-tracker/habits", { query: await searchParams });
}

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
    const [trackers, qaza, reminders] = await Promise.all([getHabitTrackers("Namaz"), getQaza(), getReminders()]);
    return <NamazHomePageClient trackers={trackers} qaza={qaza} today={getAppToday()} reminders={reminders?.reminders ?? null} />;
  }

  if (category === "Ramadan") {
    const [trackers, reminders] = await Promise.all([getHabitTrackers("Ramadan"), getReminders()]);
    return <RamadanHomePageClient trackers={trackers} today={getAppToday()} reminders={reminders?.reminders ?? null} />;
  }

  if (category === "Book") {
    const [overview, reminders] = await Promise.all([getBooksOverview(), getReminders()]);
    // Never render "no books yet" when the request merely failed.
    if (!overview) return <BooksLoadError />;
    return <LibraryPageClient overview={overview} today={getAppToday()} reminders={reminders?.reminders ?? null} />;
  }

  // "Skills" (stored as the habit category "Course").
  if (category === "Course") {
    const [overview, reminders] = await Promise.all([getSkillsOverview(), getReminders()]);
    if (!overview) return <SkillsLoadError />;
    return <SkillsHomePageClient overview={overview} today={getAppToday()} reminders={reminders?.reminders ?? null} />;
  }

  if (category === "Others") {
    const [trackers, reminders] = await Promise.all([getHabitTrackers("Others"), getReminders()]);
    // ?new=1 (Today's "Start a challenge") opens the new-challenge dialog.
    return <ChallengesHomePageClient trackers={trackers} today={getAppToday()} openNew={sp.new === "1"} reminders={reminders?.reminders ?? null} />;
  }

  redirect("/habit-tracker");
}
