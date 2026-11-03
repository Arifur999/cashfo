import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/customer/auth";
import { getHabitTrackers } from "@/lib/customer/habits";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { dashboardSheet } from "@/lib/customer/ramadanDisplay";
import { getAppToday } from "@/lib/date";

// Named for the moment the redirect is on its way.
export const generateMetadata = () => customerPageMetadata("/habit-tracker/habits/ramadan");

// Worship › Ramadan › Dashboard: the sheet of the Ramadan going on, else the
// last one over, else the soonest one set up. With none yet, Ramadan ›
// Today, where one is set up.
export default async function RamadanDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sheet = dashboardSheet(await getHabitTrackers("Ramadan"), getAppToday());
  redirect(sheet ? `/habit-tracker/habits/ramadan/${sheet.id}` : "/habit-tracker/habits?category=Ramadan");
}
