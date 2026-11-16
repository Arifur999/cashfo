import { redirect } from "next/navigation";
import { BooksLoadError } from "@/components/modules/Customer/HabitTracker/Books/BooksLoadError";
import { MyBooksPageClient } from "@/components/modules/Customer/HabitTracker/Books/MyBooksPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBooksOverview } from "@/lib/customer/books";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getReminders } from "@/lib/customer/reminders";

export const generateMetadata = () => customerPageMetadata("/habit-tracker/habits/library/books");

// My Library › My books: every book on its shelf. ?add=1 opens "Add a
// book", ?shelf= shows one shelf.
export default async function MyBooksPage({ searchParams }: PageProps<"/habit-tracker/habits/library/books">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const [overview, reminders] = await Promise.all([getBooksOverview(), getReminders()]);
  // Never "no books yet" when the request merely failed.
  if (!overview) return <BooksLoadError />;
  return <MyBooksPageClient overview={overview} reminders={reminders?.reminders ?? null} openAdd={sp.add === "1"} shelf={typeof sp.shelf === "string" ? sp.shelf : undefined} />;
}
