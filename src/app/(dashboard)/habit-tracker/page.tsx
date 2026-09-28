import { redirect } from "next/navigation";
import { HabitDashboardPageClient } from "@/components/habit-tracker/HabitDashboardPageClient";
import { getCurrentUser } from "@/lib/auth";
import { getBooksOverview } from "@/lib/books";
import { getHabitTrackers } from "@/lib/habits";
import { getSkillsOverview } from "@/lib/skills";
import { getTodoLists } from "@/lib/todos";

// "Habit Tracker" app-mode's landing page, reached via the TopBar's "Switch"
// button. A summary hub across every real feature (Namaz/Ramadan/My Library/
// Skills/Others/To Do List) -- the old generic Habit/HabitLog checklist this
// page used to show has no dedicated surface of its own anymore, same as
// every other area that moved off that model this session.
export default async function HabitTrackerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // One after the other, not Promise.all: the local dev database (`prisma
  // dev`) drops the connection when concurrent requests query it at once.
  const namazTrackers = await getHabitTrackers("Namaz");
  const ramadanTrackers = await getHabitTrackers("Ramadan");
  const booksOverview = await getBooksOverview();
  const skillsOverview = await getSkillsOverview();
  const othersTrackers = await getHabitTrackers("Others");
  const todoLists = await getTodoLists();

  return (
    <HabitDashboardPageClient
      userName={user.name}
      namazTrackers={namazTrackers}
      ramadanTrackers={ramadanTrackers}
      booksOverview={booksOverview}
      skillsOverview={skillsOverview}
      othersTrackers={othersTrackers}
      todoLists={todoLists}
    />
  );
}
