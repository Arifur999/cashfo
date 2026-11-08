// The rules behind My Library's v16 pages (the LibraryHome, LibraryBooks and
// LibraryBook boards): shelves, the three kinds of note, a day of reading,
// a price as typed, and highlights inside a note. Pure, so the pages and
// their tests agree.
import { formatDay, toDateInputValue } from "@/lib/date";
import { type FormatLocale, langOf } from "@/lib/i18n/formatPrefs";
import type { Book, BookNote, BookNoteKind, BookShelf, NoteMark, NoteMarkColor, ReadingDayRange } from "./api";
import { latinDigits } from "./habitDisplay";

// My Library's pages.
export const READING_NOW_HREF = "/habit-tracker/habits?category=Book";
export const MY_BOOKS_HREF = "/habit-tracker/habits/library/books";
export const LIBRARY_DASHBOARD_HREF = "/habit-tracker/habits/library";

// The shelves every reader has, "other" last; the names are English keys
// for t(), the colours bookPalette keys (the board's shelf colours).
export const BUILT_IN_SHELVES = [
  { id: "faith", name: "Religion & faith", color: "teal" },
  { id: "self", name: "Self-improvement", color: "walnut" },
  { id: "money", name: "Business & money", color: "forest" },
  { id: "novel", name: "Novels & stories", color: "plum" },
  { id: "essay", name: "Essays", color: "navy" },
  { id: "history", name: "History & science", color: "mustard" },
  { id: "other", name: "Other", color: "slate" },
] as const;

export interface ShelfOption {
  id: string;
  // English for a built-in shelf (shown through t()), the reader's own words otherwise.
  name: string;
  color: string;
  own: boolean;
}

// Every shelf in the board's order: the built-in ones, the reader's own, then Other.
export function shelfList(own: BookShelf[] = []): ShelfOption[] {
  const builtIn = BUILT_IN_SHELVES.map((shelf) => ({ id: shelf.id, name: shelf.name, color: shelf.color, own: false }));
  return [...builtIn.slice(0, -1), ...own.map((shelf) => ({ ...shelf, own: true })), builtIn[builtIn.length - 1]];
}

// The shelf a book stands on; a shelf since removed reads as Other.
export function shelfOf(key: string | undefined, own: BookShelf[] = []): ShelfOption {
  const shelves = shelfList(own);
  return shelves.find((shelf) => shelf.id === (key ?? "other")) ?? shelves[shelves.length - 1];
}

// Why a new shelf's name won't do: empty, or a shelf of that name exists
// already (built-in ones in the reader's language too). null when fine.
export function shelfNameProblem(name: string, own: BookShelf[], builtInNames: string[]): "empty" | "taken" | null {
  const key = name.trim().toLocaleLowerCase();
  if (!key) return "empty";
  const taken = [...own.map((shelf) => shelf.name), ...builtInNames].some((existing) => existing.trim().toLocaleLowerCase() === key);
  return taken ? "taken" : null;
}

// The three kinds of note, with the words the note form shows for each
// (English keys for t()) and their colours.
export interface NoteKindInfo {
  label: string;
  short: string;
  lineLabel: string;
  linePlaceholder: string;
  noteLabel: string;
  notePlaceholder: string;
  tip: string;
  // Tailwind classes: the soft fill, the ink, the border.
  soft: string;
  ink: string;
  border: string;
  fill: string;
}

export const NOTE_KINDS: Record<BookNoteKind, NoteKindInfo> = {
  HIGHLIGHT: {
    label: "Highlight",
    short: "A line you loved",
    lineLabel: "The line you loved",
    linePlaceholder: "Copy the line word for word",
    noteLabel: "Why it stayed with you",
    notePlaceholder: "A few words on why this line matters to you",
    tip: "For lines you would mark with a highlighter pen: beautiful, inspiring or worth quoting.",
    soft: "bg-tint-yellow",
    ink: "text-tint-yellow-ink",
    border: "border-warning-line",
    fill: "bg-tint-yellow-ink",
  },
  UNDERLINE: {
    label: "Underline",
    short: "An important point",
    lineLabel: "The part you marked",
    linePlaceholder: "A fact, rule, step or number from the book",
    noteLabel: "What you learned or will do",
    notePlaceholder: "e.g. From tomorrow I will start with 2 minutes a day",
    tip: "For points you want to remember or use later: facts, steps, definitions.",
    soft: "bg-tint-blue",
    ink: "text-tint-blue-ink",
    border: "border-info-line",
    fill: "bg-tint-blue-ink",
  },
  THOUGHT: {
    label: "My thought",
    short: "In your own words",
    lineLabel: "Line from the book",
    linePlaceholder: "Only if your thought is about a line",
    noteLabel: "Your thought",
    notePlaceholder: "What came to mind on this page: an idea, a question, a memory or a plan",
    tip: "No quote needed. Write your own opinion, question or plan.",
    soft: "bg-tint-violet",
    ink: "text-tint-violet-ink",
    border: "border-tint-violet-ink/25",
    fill: "bg-tint-violet-ink",
  },
};

export const NOTE_KIND_ORDER: BookNoteKind[] = ["HIGHLIGHT", "UNDERLINE", "THOUGHT"];

// A note's kind and day, for notes written before they had them.
export const noteKind = (note: Pick<BookNote, "kind">): BookNoteKind => note.kind ?? "THOUGHT";
export const noteDay = (note: Pick<BookNote, "date" | "createdAt">): string => note.date ?? toDateInputValue(note.createdAt);

// What a note's row shows: its words, or the line from the book in quotes.
export const notePreview = (note: Pick<BookNote, "text" | "line">): string => note.text || (note.line ? `“${note.line}”` : "");

export type NoteSort = "page" | "date";

// By page (then day), or newest day first (then the later page).
export function sortNotes<T extends BookNote>(notes: T[], sort: NoteSort): T[] {
  const page = (note: BookNote) => note.page ?? 0;
  return [...notes].sort((a, b) => {
    if (sort === "page") return page(a) - page(b) || noteDay(a).localeCompare(noteDay(b)) || a.createdAt.localeCompare(b.createdAt);
    return noteDay(b).localeCompare(noteDay(a)) || page(b) - page(a) || b.createdAt.localeCompare(a.createdAt);
  });
}

// The note a reading card shows: the latest day's, the later page first.
export const latestNote = (notes: BookNote[]): BookNote | null => sortNotes(notes, "date")[0] ?? null;

export interface NoteStats {
  count: number;
  first: string;
  last: string;
}

export function noteStatsOf(notes: BookNote[]): NoteStats {
  const days = notes.map(noteDay).sort();
  return { count: notes.length, first: days[0] ?? "", last: days[days.length - 1] ?? "" };
}

// What a note needs before it can be saved (the board's rules); null when
// it may be. A thought needs its words; a highlight or an underline the
// line or some words.
export function noteProblem(kind: BookNoteKind, line: string, text: string): "thought" | "lineOrText" | null {
  if (kind === "THOUGHT") return text.trim() ? null : "thought";
  return text.trim() || line.trim() ? null : "lineOrText";
}

// A page number as typed (Bangla digits too): a whole number from 1, or why not.
export function parsePage(raw: string): { page: number } | { problem: "empty" | "whole" } {
  const text = latinDigits(raw).trim();
  if (!text) return { problem: "empty" };
  if (!/^\d{1,5}$/.test(text) || Number(text) < 1) return { problem: "whole" };
  return { page: Number(text) };
}

// The most a price may be (the board's "That price looks too big").
export const MAX_PRICE = 1_000_000;

// A price as typed: "360", "৩৬০", "1,250.50", "৳ 450"; empty is no price.
export function parsePrice(raw: string): { price: number | null } | { problem: "number" | "big" } {
  const text = latinDigits(raw).trim().replace(/[,৳\s]/g, "");
  if (!text) return { price: null };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { problem: "number" };
  const price = Number(text);
  return price > MAX_PRICE ? { problem: "big" } : { price };
}

// --- A day of reading (Reading now's "Log today's reading") ---

export interface ReadingLogPlan {
  // The page the day begins on ("Read before, up to page").
  from: number;
  // The latest day logged is being corrected.
  correcting: boolean;
  // The day's page already logged, to start the field with.
  loggedTo: number | null;
  // The earliest day the date picker offers ("" for any).
  minDay: string;
  // Why that day can't be logged, if it can't.
  dayProblem: { kind: "closed"; after: string } | { kind: "notLatest" } | null;
}

// Where a day of reading on `day` begins, as the server will settle it: a
// new day from the book's page, the latest day logged from where it began;
// days before the latest one are closed.
export function readingLogPlan(book: Pick<Book, "pagesRead">, last: { latest: ReadingDayRange; before: string | null } | undefined, day: string, loggedDays: string[] = []): ReadingLogPlan {
  const latest = last?.latest ?? null;
  const minDay = latest ? latest.date : "";
  if (latest && day === latest.date) return { from: latest.from, correcting: true, loggedTo: latest.to, minDay: last?.before ?? "", dayProblem: null };
  if (latest && day < latest.date) {
    return { from: book.pagesRead, correcting: false, loggedTo: null, minDay, dayProblem: loggedDays.includes(day) ? { kind: "notLatest" } : { kind: "closed", after: latest.date } };
  }
  return { from: book.pagesRead, correcting: false, loggedTo: null, minDay, dayProblem: null };
}

// The page typed in the log as a number, or why it won't do.
export function readingToProblem(raw: string, from: number, total: number): { to: number } | { problem: "empty" | "whole" | "notAfter" | "overTotal" } {
  const text = latinDigits(raw).trim();
  if (!text) return { problem: "empty" };
  if (!/^\d+$/.test(text)) return { problem: "whole" };
  const to = Number(text);
  if (to <= from) return { problem: "notAfter" };
  if (to > total) return { problem: "overTotal" };
  return { to };
}

// The quick adds that still fit in the book.
export const quickAdds = (from: number, total: number): number[] => [5, 10, 20, 30].filter((step) => from + step <= total);

// --- Days as the boards write them ---

// "24 October 2026", in the reader's language and digits.
export const longDay = (day: string, locale: FormatLocale): string => (day ? formatDay(day, "d MMMM yyyy", locale) : "–");

const EN_INITIALS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const BN_INITIALS = ["র", "সো", "ম", "বু", "বৃ", "শু", "শ"];

// A weekday's two letters under a day's box (the board's "Mo", "সো").
export const dayInitial = (day: string, locale: FormatLocale): string => (langOf(locale) === "bn" ? BN_INITIALS : EN_INITIALS)[new Date(`${day}T00:00:00.000Z`).getUTCDay()];

// --- The last seven days on a reading card ---

const shiftDay = (day: string, by: number): string => new Date(Date.parse(`${day}T00:00:00.000Z`) + by * 86_400_000).toISOString().slice(0, 10);

// The seven days ending today, oldest first.
export const lastSevenDays = (today: string): string[] => Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));

// The pages read in a book on each of those days.
export function bookWeek(bookId: string, today: string, lastWeek: { bookId: string; date: string; pages: number }[] = []): { date: string; pages: number }[] {
  return lastSevenDays(today).map((date) => ({ date, pages: lastWeek.filter((row) => row.bookId === bookId && row.date === date).reduce((sum, row) => sum + row.pages, 0) }));
}

// --- Highlights inside a note ---

export const MARK_COLORS: NoteMarkColor[] = ["yellow", "green", "pink"];

export interface MarkSegment {
  text: string;
  // The highlight it is ([s, e) in the text), or null for plain text.
  mark: { s: number; e: number } | null;
  color: NoteMarkColor | null;
}

// The note's text cut into plain and highlighted runs, in order.
export function markSegments(text: string, marks: NoteMark[] = []): MarkSegment[] {
  const sorted = [...marks].filter((mark) => mark.s < mark.e && mark.e <= text.length).sort((a, b) => a.s - b.s);
  const segments: MarkSegment[] = [];
  let at = 0;
  for (const mark of sorted) {
    if (mark.s < at) continue;
    if (mark.s > at) segments.push({ text: text.slice(at, mark.s), mark: null, color: null });
    segments.push({ text: text.slice(mark.s, mark.e), mark: { s: mark.s, e: mark.e }, color: mark.c });
    at = mark.e;
  }
  if (at < text.length || segments.length === 0) segments.push({ text: text.slice(at), mark: null, color: null });
  return segments;
}

// Paint [a, b) in a colour: the highlights it touches give way to it.
export function addMark(marks: NoteMark[], a: number, b: number, color: NoteMarkColor, length: number): NoteMark[] {
  const s = Math.max(0, Math.min(a, b));
  const e = Math.min(length, Math.max(a, b));
  if (e <= s) return marks;
  return [...marks.filter((mark) => mark.e <= s || mark.s >= e), { s, e, c: color }].sort((x, y) => x.s - y.s);
}

// Take one highlight off.
export const removeMark = (marks: NoteMark[], target: { s: number; e: number }): NoteMark[] => marks.filter((mark) => mark.s !== target.s || mark.e !== target.e);

// The text size the note reader shows, as a percent of its 18px default.
export const READER_SIZES = { min: 14, max: 30, base: 18, fit: 21, step: 2 } as const;
