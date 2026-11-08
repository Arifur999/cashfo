import { redirect } from "next/navigation";
import { BookMissing } from "@/components/modules/Customer/HabitTracker/Books/BookMissing";
import { BookPageClient } from "@/components/modules/Customer/HabitTracker/Books/BookPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBookDetail } from "@/lib/customer/books";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getReminders } from "@/lib/customer/reminders";
import { getAppToday } from "@/lib/date";

// The book's name is not read here: Next runs generateMetadata for every
// <Link> prefetch of the page, so reading the record would cost a call for
// each book on screen.
export async function generateMetadata({ params }: PageProps<"/habit-tracker/habits/library/books/[id]">) {
  const { id } = await params;
  return customerPageMetadata(`/habit-tracker/habits/library/books/${id}`);
}

// My Library › a book: its notes and its summary. ?summary=1 opens the
// summary to write it.
export default async function BookPage({ params, searchParams }: PageProps<"/habit-tracker/habits/library/books/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [detail, reminders] = await Promise.all([getBookDetail(id), getReminders()]);
  if (!detail) return <BookMissing />;
  return <BookPageClient key={detail.book.id} detail={detail} today={getAppToday()} reminders={reminders?.reminders ?? null} openSummary={sp.summary === "1"} />;
}
