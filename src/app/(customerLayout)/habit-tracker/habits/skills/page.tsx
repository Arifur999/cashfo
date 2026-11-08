import { redirect } from "next/navigation";
import { MySkillsPageClient } from "@/components/modules/Customer/HabitTracker/Skills/MySkillsPageClient";
import { SkillsLoadError } from "@/components/modules/Customer/HabitTracker/Skills/SkillsLoadError";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getReminders } from "@/lib/customer/reminders";
import { getSkillsOverview } from "@/lib/customer/skills";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/habit-tracker/habits/skills");

// Skills › My skills: every skill by category or as a list. ?add=1 opens
// "Add a skill".
export default async function MySkillsPage({ searchParams }: PageProps<"/habit-tracker/habits/skills">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const [overview, reminders] = await Promise.all([getSkillsOverview(), getReminders()]);
  // Never "no skills yet" when the request merely failed.
  if (!overview) return <SkillsLoadError />;
  return <MySkillsPageClient overview={overview} today={getAppToday()} reminders={reminders?.reminders ?? null} openAdd={sp.add === "1"} />;
}
