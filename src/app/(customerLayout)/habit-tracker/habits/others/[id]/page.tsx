import { notFound, redirect } from "next/navigation";
import { ChallengeDetailPageClient } from "@/components/modules/Customer/HabitTracker/Others/ChallengeDetailPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getHabitTracker } from "@/lib/customer/habits";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getReminders } from "@/lib/customer/reminders";
import { getAppToday } from "@/lib/date";

// The list's name, read from nothing: Next runs generateMetadata for every
// <Link> prefetch of this page, without rendering the page, so reading the
// record here cost API calls for each row on screen.
export async function generateMetadata({ params }: PageProps<"/habit-tracker/habits/others/[id]">) {
  const { id } = await params;
  return customerPageMetadata(`/habit-tracker/habits/others/${id}`);
}

// One challenge, opened from Habits › Challenges.
export default async function ChallengePage({ params }: PageProps<"/habit-tracker/habits/others/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const [tracker, reminders] = await Promise.all([getHabitTracker(id), getReminders()]);
  if (!tracker || tracker.category !== "Others") notFound();

  return <ChallengeDetailPageClient tracker={tracker} today={getAppToday()} reminders={reminders?.reminders ?? null} />;
}
