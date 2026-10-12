import { notFound, redirect } from "next/navigation";
import { OthersSheetPageClient } from "@/components/modules/Customer/HabitTracker/Others/OthersSheetPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getHabitTracker } from "@/lib/customer/habits";

// One challenge's sheet, opened from a card on Habits -> Others.
export default async function OthersSheetPage({ params }: PageProps<"/habit-tracker/habits/others/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const tracker = await getHabitTracker(id);
  if (!tracker || tracker.category !== "Others") notFound();

  return <OthersSheetPageClient tracker={tracker} />;
}
