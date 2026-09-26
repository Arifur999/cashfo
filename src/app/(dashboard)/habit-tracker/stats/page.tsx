import { redirect } from "next/navigation";
import { HabitStatsPageClient } from "@/components/habit-tracker/HabitStatsPageClient";
import { getCurrentUser } from "@/lib/auth";
import { getHabitStats } from "@/lib/habits";

export default async function HabitStatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const stats = await getHabitStats();

  return <HabitStatsPageClient stats={stats} />;
}
