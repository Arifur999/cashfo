import { redirect } from "next/navigation";
import { HabitLoadError } from "@/components/modules/Customer/HabitTracker/Tracker/HabitLoadError";
import { NotesPageClient } from "@/components/modules/Customer/HabitTracker/Writing/NotesPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getNotesOverview } from "@/lib/customer/writing";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/habit-tracker/notes");

// Notes & Journal › Notes: quick notes and ideas. Personal (user-scoped).
// ?new=1 (the dashboard's "Quick note") puts the cursor in the quick box.
export default async function NotesPage({ searchParams }: PageProps<"/habit-tracker/notes">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const overview = await getNotesOverview();
  // Never "no notes yet" when the request merely failed.
  if (!overview) return <HabitLoadError title="Notes" message="We couldn't load your notes just now." />;
  return <NotesPageClient notes={overview.notes} categories={overview.categories} today={getAppToday()} focusNew={sp.new === "1"} />;
}
