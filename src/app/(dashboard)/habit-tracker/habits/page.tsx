import { redirect } from "next/navigation";
import { HabitsListPageClient } from "@/components/habit-tracker/HabitsListPageClient";
import { getCurrentUser } from "@/lib/auth";
import { getHabits } from "@/lib/habits";

export default async function HabitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const habits = await getHabits(true);

  return <HabitsListPageClient habits={habits} />;
}
