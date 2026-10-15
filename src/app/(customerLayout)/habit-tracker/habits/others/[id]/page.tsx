import { notFound, redirect } from "next/navigation";
import { ChallengeDetailPageClient } from "@/components/modules/Customer/HabitTracker/Others/ChallengeDetailPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getHabitTracker } from "@/lib/customer/habits";
import { getAppToday } from "@/lib/date";

// One challenge, opened from Habits › Challenges.
export default async function ChallengePage({ params }: PageProps<"/habit-tracker/habits/others/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const tracker = await getHabitTracker(id);
  if (!tracker || tracker.category !== "Others") notFound();

  return <ChallengeDetailPageClient tracker={tracker} today={getAppToday()} />;
}
