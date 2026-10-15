// The sums behind Habits › My library: the shelves, the book on the
// nightstand and how fast it is going, and this year's goal against the
// calendar. Pure, so the page and its tests agree.
import { toDateInputValue } from "@/lib/date";
import type { Book, BookStatus } from "./api";
import { dayOf } from "./habitDisplay";

// The three shelves in the order the page shows them.
export const SHELVES: BookStatus[] = ["READING", "WANT_TO_READ", "FINISHED"];

// English, passed through t().
export const SHELF_LABEL: Record<BookStatus, string> = { READING: "Reading", WANT_TO_READ: "Want to read", FINISHED: "Finished" };

const newestFirst =
  (key: "updatedAt" | "createdAt" | "finishedAt") =>
  (a: Book, b: Book): number =>
    (b[key] ?? "").localeCompare(a[key] ?? "");

// Each shelf with its latest activity first: the book read most recently,
// the one added last, the one finished last.
export function shelves(books: Book[]): Record<BookStatus, Book[]> {
  return {
    READING: books.filter((b) => b.status === "READING").sort(newestFirst("updatedAt")),
    WANT_TO_READ: books.filter((b) => b.status === "WANT_TO_READ").sort(newestFirst("createdAt")),
    FINISHED: books.filter((b) => b.status === "FINISHED").sort(newestFirst("finishedAt")),
  };
}

// The book on the nightstand: the one read most recently.
export const nowReading = (books: Book[]): Book | null => shelves(books).READING[0] ?? null;

export const finishedIn = (books: Book[], year: number): Book[] => books.filter((b) => b.status === "FINISHED" && b.finishedYear === year);

export const pagesLeft = (book: Pick<Book, "pagesRead" | "totalPages">): number => Math.max(0, book.totalPages - book.pagesRead);

export function progressPct(book: Pick<Book, "pagesRead" | "totalPages">): number {
  if (book.totalPages <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((book.pagesRead / book.totalPages) * 100)));
}

// Whole days from a moment (an ISO timestamp) or a day ("YYYY-MM-DD") to
// today on the app's calendar; never negative.
export function daysSince(from: string, today: string): number {
  const fromDay = from.length === 10 ? from : toDateInputValue(from);
  return Math.max(0, Math.round((dayOf(today).getTime() - dayOf(fromDay).getTime()) / 86_400_000));
}

// Pages a day since the book was started, once a full day has passed; null
// before that, when it is too early to say.
export function readingPace(book: Pick<Book, "startedAt" | "pagesRead">, today: string): number | null {
  if (!book.startedAt || book.pagesRead <= 0) return null;
  const days = daysSince(book.startedAt, today);
  return days >= 1 ? Math.max(1, Math.round(book.pagesRead / days)) : null;
}

// Days left at that pace, or null when there is no pace yet.
export function daysToFinish(book: Pick<Book, "startedAt" | "pagesRead" | "totalPages">, today: string): number | null {
  const pace = readingPace(book, today);
  return pace ? Math.ceil(pagesLeft(book) / pace) : null;
}

export interface GoalPace {
  finished: number;
  target: number;
  toGo: number;
  // Books expected by today at an even pace through the year, less the books
  // finished: positive is behind, negative is ahead.
  behind: number;
  // Weeks per remaining book to finish by the end of the year; null once the
  // goal is met or the year is over.
  weeksPerBook: number | null;
}

const daysInYear = (year: number): number => (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365);

export function goalPace(books: Book[], year: number, target: number, today: string): GoalPace {
  const finished = finishedIn(books, year).length;
  const toGo = Math.max(0, target - finished);
  const total = daysInYear(year);
  const dayOfYear = Math.min(total, daysSince(`${year}-01-01`, today) + 1);
  const expected = Math.floor((target * dayOfYear) / total);
  const weeksLeft = (total - dayOfYear) / 7;
  return { finished, target, toGo, behind: expected - finished, weeksPerBook: toGo > 0 && weeksLeft > 0 ? Math.round((weeksLeft / toGo) * 10) / 10 : null };
}

// The optimistic twin of the server's progress rule (BooksService.settle):
// all pages read -> FINISHED, any -> READING, none -> stays where it was (a
// finished book dropped to page 0 is READING). The server's answer replaces
// this as soon as the request comes back.
export function applyProgress(book: Book, pagesRead: number, year: number): Book {
  const pages = Math.min(Math.max(0, Math.round(pagesRead)), book.totalPages);
  let status: BookStatus = book.status;
  if (pages >= book.totalPages) status = "FINISHED";
  else if (pages > 0) status = "READING";
  else if (book.status === "FINISHED") status = "READING";
  return { ...book, pagesRead: pages, status, finishedYear: status === "FINISHED" ? (book.finishedYear ?? year) : null };
}
