import { redirect } from "next/navigation";
import { HabitsListPageClient } from "@/components/habit-tracker/HabitsListPageClient";
import { getCurrentUser } from "@/lib/auth";
import { getHabits } from "@/lib/habits";

export default async function HabitsPage({ searchParams }: PageProps<"/habit-tracker/habits">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : undefined;

  const habits = await getHabits(true, category);

  return <HabitsListPageClient habits={habits} category={category} />;
}
