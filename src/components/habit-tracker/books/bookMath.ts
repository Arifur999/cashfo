import type { Book, BookStatus } from "@/lib/api";

export function progressPct(book: Pick<Book, "pagesRead" | "totalPages">): number {
  if (book.totalPages <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((book.pagesRead / book.totalPages) * 100)));
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

export interface LibraryStats {
  finishedThisYear: number;
  pagesRead: number; // across every book, ever
  reading: number;
  wantToRead: number;
}

export function libraryStats(books: Book[], year: number): LibraryStats {
  return {
    finishedThisYear: books.filter((b) => b.status === "FINISHED" && b.finishedYear === year).length,
    pagesRead: books.reduce((sum, b) => sum + b.pagesRead, 0),
    reading: books.filter((b) => b.status === "READING").length,
    wantToRead: books.filter((b) => b.status === "WANT_TO_READ").length,
  };
}
