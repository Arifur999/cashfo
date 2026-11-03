// The sums behind Habits › My library: the shelves, the book on the
// nightstand and how fast it is going, and this year's goal against the
// calendar. Pure, so the page and its tests agree.
import { toDateInputValue } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import type { Book, BookStatus, ReadingDay } from "./api";
import { dayOf } from "./habitDisplay";

// The three shelves in the order the page shows them.
export const SHELVES: BookStatus[] = ["READING", "WANT_TO_READ", "FINISHED"];

// English, passed through t().
export const SHELF_LABEL: Record<BookStatus, string> = { READING: "Reading", WANT_TO_READ: "Want to read", FINISHED: "Finished" };

const newestFirst =
  (key: "updatedAt" | "createdAt" | "finishedAt") =>
  (a: Book, b: Book): number =>
    (b[key] ?? "").localeCompare(a[key] ?? "");

// A book being read that was put down for now: its page kept, it waits
// under Up next (the want-to-read shelf) until it is resumed.
export const isPaused = (book: Pick<Book, "status" | "pausedAt">): boolean => book.status === "READING" && !!book.pausedAt;

// Each shelf with its latest activity first: the book read most recently,
// the one added last (after the paused ones, most recently paused first),
// the one finished last.
export function shelves(books: Book[]): Record<BookStatus, Book[]> {
  return {
    READING: books.filter((b) => b.status === "READING" && !isPaused(b)).sort(newestFirst("updatedAt")),
    WANT_TO_READ: [...books.filter(isPaused).sort((a, b) => (b.pausedAt ?? "").localeCompare(a.pausedAt ?? "")), ...books.filter((b) => b.status === "WANT_TO_READ").sort(newestFirst("createdAt"))],
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

// How often a book has to be finished to reach the goal by the year's end,
// in whole weeks (or days, under a week): "About one book every 2 weeks to
// finish by December."
export function paceSentence(weeksPerBook: number, t: Translate = inEnglish, locale: FormatLocale = "en"): string {
  if (weeksPerBook < 1) {
    const days = Math.max(1, Math.round(weeksPerBook * 7));
    return days === 1 ? t("About one book a day to finish by December.") : t("About one book every {count} days to finish by December.", { count: formatCount(days, locale) });
  }
  const weeks = Math.round(weeksPerBook);
  return weeks === 1 ? t("About one book a week to finish by December.") : t("About one book every {count} weeks to finish by December.", { count: formatCount(weeks, locale) });
}

// "Page 120 of 320".
export const pageOfText = (book: Pick<Book, "pagesRead" | "totalPages">, t: Translate = inEnglish, locale: FormatLocale = "en"): string =>
  t("Page {page} of {total}", { page: formatCount(book.pagesRead, locale), total: formatCount(book.totalPages, locale) });

// This week's pages so far, and the average a day over the days that have
// come (today included); days still to come in the week don't count.
export function weekPages(week: ReadingDay[], today: string): { total: number; average: number } {
  const come = week.filter((day) => day.date <= today);
  const total = come.reduce((sum, day) => sum + day.pages, 0);
  return { total, average: come.length ? Math.round(total / come.length) : 0 };
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
  // Reading on to a new page takes a paused book up again.
  const pausedAt = status === "READING" && pages === book.pagesRead ? (book.pausedAt ?? null) : null;
  return { ...book, pagesRead: pages, status, pausedAt, finishedYear: status === "FINISHED" ? (book.finishedYear ?? year) : null };
}

// Library › Dashboard.

// A book's place on the dashboard's list: a paused one stands apart.
export type BookShelf = "reading" | "paused" | "finished" | "want";
export const bookShelf = (book: Pick<Book, "status" | "pausedAt">): BookShelf => (isPaused(book) ? "paused" : book.status === "READING" ? "reading" : book.status === "FINISHED" ? "finished" : "want");

// The app-calendar day ("YYYY-MM-DD") of a moment, and its year and month (1-12).
const dayKey = (iso: string): string => toDateInputValue(iso);
const inMonth = (iso: string | null, year: number, month?: number): boolean => {
  if (!iso) return false;
  const key = dayKey(iso);
  return Number(key.slice(0, 4)) === year && (month === undefined || Number(key.slice(5, 7)) === month);
};

// Days from the day a book was started to the day it was finished (both
// counted), or to today while it is read; null before it is started.
export function daysWithBook(book: Pick<Book, "startedAt" | "finishedAt">, today: string): number | null {
  if (!book.startedAt) return null;
  const end = book.finishedAt ? dayKey(book.finishedAt) : today;
  return daysSince(book.startedAt, end) + 1;
}

export interface MonthBooks {
  finished: Book[];
  started: Book[];
  // Read in that month, with the pages, most first.
  read: { book: Book; pages: number }[];
}

// One month of a year: the books finished, started and read in it.
export function monthBooks(books: Book[], bookMonths: Record<string, number[]>, year: number, month: number): MonthBooks {
  return {
    finished: books.filter((b) => b.status === "FINISHED" && inMonth(b.finishedAt, year, month)),
    started: books.filter((b) => inMonth(b.startedAt, year, month)),
    read: books
      .map((book) => ({ book, pages: bookMonths[book.id]?.[month - 1] ?? 0 }))
      .filter((row) => row.pages > 0)
      .sort((a, b) => b.pages - a.pages),
  };
}

// Books finished in each month of a year, January first.
export const finishedByMonth = (books: Book[], year: number): number[] => Array.from({ length: 12 }, (_, i) => books.filter((b) => b.status === "FINISHED" && inMonth(b.finishedAt, year, i + 1)).length);

export interface YearFigures {
  finished: number;
  pages: number;
  // Pages a day over the days of the year so far (all of it, once over).
  perDay: number;
  started: number;
  // Started that year and paused now.
  paused: number;
  // Average days to finish a book finished that year; null with none.
  daysPerBook: number | null;
}

export function yearFigures(books: Book[], months: number[], year: number, today: string): YearFigures {
  const finished = books.filter((b) => b.status === "FINISHED" && inMonth(b.finishedAt, year));
  const started = books.filter((b) => inMonth(b.startedAt, year));
  const pages = months.reduce((sum, n) => sum + n, 0);
  const thisYear = Number(today.slice(0, 4));
  const days = year === thisYear ? daysSince(`${year}-01-01`, today) + 1 : year < thisYear ? daysInYear(year) : 0;
  const spans = finished.map((b) => daysWithBook(b, today)).filter((n): n is number => n !== null);
  return {
    finished: finished.length,
    pages,
    perDay: days > 0 ? Math.round(pages / days) : 0,
    started: started.length,
    paused: started.filter(isPaused).length,
    daysPerBook: spans.length ? Math.round(spans.reduce((sum, n) => sum + n, 0) / spans.length) : null,
  };
}
