"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Book, BookStatus } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { BookCover } from "./BookCover";
import { progressPct } from "./bookMath";
import { BOOK_BAR, BOOK_CARD, STATUS_META } from "./bookTheme";
import { SERIF_STACK } from "./fonts";
import { SectionTitle } from "./SectionTitle";

type Tab = "ALL" | BookStatus;

const SHELF_ORDER: Record<BookStatus, number> = { READING: 0, WANT_TO_READ: 1, FINISHED: 2 };

const TABS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "READING", label: "Reading" },
  { key: "WANT_TO_READ", label: "Want to read" },
  { key: "FINISHED", label: "Finished" },
];

interface BookLibraryProps {
  books: Book[];
  onStart: (book: Book) => void;
  onUpdate: (book: Book) => void;
  onReadAgain: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
}

function BookCard({ book, onStart, onUpdate, onReadAgain, onEdit, onDelete }: { book: Book } & Omit<BookLibraryProps, "books">) {
  const { t } = useLocale();
  const meta = STATUS_META[book.status];
  const pct = progressPct(book);

  const primary =
    book.status === "WANT_TO_READ"
      ? { label: "Start reading", run: () => onStart(book) }
      : book.status === "READING"
        ? { label: "Update", run: () => onUpdate(book) }
        : { label: "Read again", run: () => onReadAgain(book) };

  return (
    <article className={`${BOOK_CARD} group flex flex-col p-3 transition hover:-translate-y-0.5 hover:shadow-md`}>
      <BookCover title={book.title} author={book.author} color={book.color} className="mx-auto w-full max-w-[9.5rem]" />
      <h3 className="mt-3 line-clamp-2 break-words text-sm font-semibold leading-snug text-neutral-900" style={{ fontFamily: SERIF_STACK }} title={book.title}>
        {book.title}
      </h3>
      <p className="mt-0.5 h-4 truncate text-xs text-neutral-500">{book.author}</p>

      <div className="mt-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}>{t(meta.label)}</span>
          <span className="text-[11px] tabular-nums text-neutral-400">
            {book.status === "WANT_TO_READ" ? `${book.totalPages} ${t("pages")}` : `${book.pagesRead}/${book.totalPages}`}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div className={`h-full rounded-full bg-gradient-to-r ${BOOK_BAR} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-auto flex items-center gap-1.5 pt-3">
        <button
          type="button"
          onClick={primary.run}
          aria-label={`${t(primary.label)}: ${book.title}`}
          className="min-w-0 flex-1 truncate rounded-lg border border-amber-900/15 dark:border-amber-300/25 px-2 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 transition hover:bg-amber-600/10"
        >
          {t(primary.label)}
        </button>
        <button
          type="button"
          onClick={() => onEdit(book)}
          aria-label={`${t("Edit book")}: ${book.title}`}
          title={t("Edit book")}
          className="shrink-0 rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(book)}
          aria-label={`${t("Remove book")}: ${book.title}`}
          title={t("Remove book")}
          className="shrink-0 rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-brand-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

// Every book as a card, filterable by shelf.
export function BookLibrary({ books, onStart, onUpdate, onReadAgain, onEdit, onDelete }: BookLibraryProps) {
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("ALL");
  // "All" lists what is being read first, then the wish list, then the finished
  // ones (each group keeps the server's most-recently-updated-first order).
  const shown = tab === "ALL" ? [...books].sort((a, b) => SHELF_ORDER[a.status] - SHELF_ORDER[b.status]) : books.filter((b) => b.status === tab);
  const countOf = (key: Tab) => (key === "ALL" ? books.length : books.filter((b) => b.status === key).length);

  return (
    <section>
      <SectionTitle title={t("My books")} />
      {/* Toggle buttons (aria-pressed), not role=tab: a real tablist needs roving
          focus and arrow keys, and this is just a filter over one list. */}
      <div role="group" aria-label={t("My books")} className="mb-5 flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                active ? "border-amber-600 bg-amber-600 text-white" : "border-amber-900/15 dark:border-amber-300/25 text-amber-800 dark:text-amber-300 hover:bg-amber-600/10"
              }`}
            >
              {t(label)}
              <span className={`rounded-full px-1.5 tabular-nums ${active ? "bg-white/25 text-white" : "bg-amber-600/10 text-amber-700 dark:text-amber-300"}`}>{countOf(key)}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className={`${BOOK_CARD} px-6 py-10 text-center text-sm text-neutral-400`}>{t("No books here yet.")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {shown.map((book) => (
            <BookCard key={book.id} book={book} onStart={onStart} onUpdate={onUpdate} onReadAgain={onReadAgain} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}
