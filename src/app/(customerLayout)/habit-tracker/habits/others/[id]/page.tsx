import { notFound, redirect } from "next/navigation";
import { ChallengeDetailPageClient } from "@/components/modules/Customer/HabitTracker/Others/ChallengeDetailPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getHabitTracker } from "@/lib/customer/habits";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

// The tab names the challenge, from the read the page makes.
export async function generateMetadata({ params }: PageProps<"/habit-tracker/habits/others/[id]">) {
  const { id } = await params;
  // A failed read is the page's to show (its error screen); the tab keeps
  // the list's name.
  const user = await getCurrentUser().catch(() => null);
  const tracker = user ? await getHabitTracker(id).catch(() => null) : null;
  return customerPageMetadata(`/habit-tracker/habits/others/${id}`, { record: tracker?.category === "Others" ? tracker.name : null });
}

// One challenge, opened from Habits › Challenges.
export default async function ChallengePage({ params }: PageProps<"/habit-tracker/habits/others/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const tracker = await getHabitTracker(id);
  if (!tracker || tracker.category !== "Others") notFound();

  return <ChallengeDetailPageClient tracker={tracker} today={getAppToday()} />;
}
