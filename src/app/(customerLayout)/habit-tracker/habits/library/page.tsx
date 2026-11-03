import { redirect } from "next/navigation";
import { BooksLoadError } from "@/components/modules/Customer/HabitTracker/Books/BooksLoadError";
import { LibraryDashboardClient } from "@/components/modules/Customer/HabitTracker/Books/LibraryDashboardClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBooksOverview, getBookYear } from "@/lib/customer/books";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getReminders } from "@/lib/customer/reminders";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/habit-tracker/habits/library");

const isYear = (value: unknown): value is string => typeof value === "string" && /^(20\d\d|2100)$/.test(value);

// My Library › Dashboard: one year (this one unless ?year= says) month by
// month, and every book.
export default async function LibraryDashboardPage({ searchParams }: PageProps<"/habit-tracker/habits/library">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const today = getAppToday();
  const year = isYear(sp.year) ? Number(sp.year) : Number(today.slice(0, 4));
  const [overview, bookYear, reminders] = await Promise.all([getBooksOverview(), getBookYear(year), getReminders()]);
  // Never "no books yet" when the request merely failed.
  if (!overview || !bookYear) return <BooksLoadError />;
  return <LibraryDashboardClient overview={overview} bookYear={bookYear} today={today} reminders={reminders?.reminders ?? null} />;
}
