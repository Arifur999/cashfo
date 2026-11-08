import { redirect } from "next/navigation";
import { SkillsDashboardClient } from "@/components/modules/Customer/HabitTracker/Skills/SkillsDashboardClient";
import { SkillsLoadError } from "@/components/modules/Customer/HabitTracker/Skills/SkillsLoadError";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getSkillPractice, getSkillsOverview } from "@/lib/customer/skills";
import { readSkillsPeriod } from "@/lib/customer/skillsBoard";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/habit-tracker/habits/skills/dashboard");

// Skills › Dashboard: this month unless ?period= says another month or a
// year; the practice of the year it falls in, month by month.
export default async function SkillsDashboardPage({ searchParams }: PageProps<"/habit-tracker/habits/skills/dashboard">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const today = getAppToday();
  const period = readSkillsPeriod(sp.period, today);
  const [overview, yearLogs] = await Promise.all([getSkillsOverview(), getSkillPractice(`${period.year}-01-01`, `${period.year}-12-31`)]);
  // Never "no skills yet" when the request merely failed.
  if (!overview || !yearLogs) return <SkillsLoadError />;
  return <SkillsDashboardClient overview={overview} yearLogs={yearLogs} period={period} today={today} />;
}
