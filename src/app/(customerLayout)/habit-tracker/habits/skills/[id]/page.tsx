import { redirect } from "next/navigation";
import { SkillMissing, SkillPageClient } from "@/components/modules/Customer/HabitTracker/Skills/SkillPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getReminders } from "@/lib/customer/reminders";
import { getSkillDetail, getSkillsOverview } from "@/lib/customer/skills";
import { getAppToday } from "@/lib/date";

// The skill's name is not read here: Next runs generateMetadata for every
// <Link> prefetch of the page, so reading the record would cost a call for
// each skill on screen.
export async function generateMetadata({ params }: PageProps<"/habit-tracker/habits/skills/[id]">) {
  const { id } = await params;
  return customerPageMetadata(`/habit-tracker/habits/skills/${id}`);
}

// Skills › a skill: its practice log, roadmap, notes and resources.
// ?tab=roadmap|notes|resources opens that tab.
export default async function SkillPage({ params, searchParams }: PageProps<"/habit-tracker/habits/skills/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [detail, overview, reminders] = await Promise.all([getSkillDetail(id), getSkillsOverview(), getReminders()]);
  if (!detail) return <SkillMissing />;
  return <SkillPageClient key={detail.skill.id} detail={detail} skills={overview?.skills ?? []} today={getAppToday()} reminders={reminders?.reminders ?? null} startTab={typeof sp.tab === "string" ? sp.tab : undefined} />;
}
