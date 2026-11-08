import { redirect } from "next/navigation";
import { BooksLoadError } from "@/components/modules/Customer/HabitTracker/Books/BooksLoadError";
import { LibraryDashboardClient } from "@/components/modules/Customer/HabitTracker/Books/LibraryDashboardClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBookPages, getBooksOverview, getBookYear } from "@/lib/customer/books";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { type Period, periodRange, readPickedPeriod } from "@/lib/customer/period";
import { getReminders } from "@/lib/customer/reminders";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/habit-tracker/habits/library");

// My Library › Dashboard: the period the reader picks (this year unless
// the address says a month, a year or their own days), the year it falls
// in month by month, and every book.
export default async function LibraryDashboardPage({ searchParams }: PageProps<"/habit-tracker/habits/library">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const today = getAppToday();
  const current = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const fallback: Period = { kind: "year", year: current.year };
  const picked = readPickedPeriod(sp, current, fallback);
  const period: Period = picked.kind === "all" ? fallback : picked;
  const range = periodRange(period) as { dateFrom: string; dateTo: string };
  const chartYear = period.kind === "custom" ? Number(period.to.slice(0, 4)) : period.year;
  const [overview, bookYear, pages, reminders] = await Promise.all([getBooksOverview(), getBookYear(chartYear), getBookPages(range.dateFrom, range.dateTo), getReminders()]);
  // Never "no books yet" when the request merely failed.
  if (!overview || !bookYear || !pages) return <BooksLoadError />;
  return <LibraryDashboardClient overview={overview} bookYear={bookYear} pages={pages} period={period} today={today} reminders={reminders?.reminders ?? null} />;
}
