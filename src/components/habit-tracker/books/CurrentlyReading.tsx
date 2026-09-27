"use client";

import { BookMarked, Check, Pencil, Plus, Trash2 } from "lucide-react";
import type { Book } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { BookCover } from "./BookCover";
import { progressPct } from "./bookMath";
import { BOOK_BAR, BOOK_CARD, BOOK_CTA } from "./bookTheme";
import { SERIF_STACK } from "./fonts";
import { SectionTitle } from "./SectionTitle";

interface CurrentlyReadingProps {
  reading: Book[];
  wantToRead: Book[]; // offered as "Start" chips when nothing is being read
  onQuickAdd: (book: Book, delta: number) => void;
  onUpdate: (book: Book) => void;
  onFinish: (book: Book) => void;
  onStart: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
  onAdd: () => void;
}

const QUICK_PAGES = [10, 25];

function ReadingCard({ book, onQuickAdd, onUpdate, onFinish, onEdit, onDelete }: { book: Book } & Pick<CurrentlyReadingProps, "onQuickAdd" | "onUpdate" | "onFinish" | "onEdit" | "onDelete">) {
  const { t } = useLocale();
  const pct = progressPct(book);
  const left = Math.max(0, book.totalPages - book.pagesRead);

  return (
    <article className={`${BOOK_CARD} flex min-w-0 gap-5 p-5`}>
      <BookCover title={book.title} author={book.author} color={book.color} className="w-28 sm:w-36" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-2 break-words text-lg font-semibold leading-snug text-neutral-900" style={{ fontFamily: SERIF_STACK }} title={book.title}>
              {book.title}
            </h3>
            {book.author && <p className="mt-0.5 truncate text-sm text-neutral-500">{book.author}</p>}
          </div>
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => onEdit(book)}
              aria-label={`${t("Edit book")}: ${book.title}`}
              title={t("Edit book")}
              className="rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(book)}
              aria-label={`${t("Remove book")}: ${book.title}`}
              title={t("Remove book")}
              className="rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-brand-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-3xl font-semibold lining-nums tabular-nums leading-none text-neutral-900" style={{ fontFamily: SERIF_STACK }}>
              {pct}
              <span className="text-base font-medium text-neutral-400">%</span>
            </span>
            <span className="text-xs tabular-nums text-neutral-500">
              {t("Page")} {book.pagesRead} / {book.totalPages} · {left} {t("pages left")}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
            <div className={`h-full rounded-full bg-gradient-to-r ${BOOK_BAR} transition-all duration-500`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {QUICK_PAGES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onQuickAdd(book, n)}
                aria-label={`+${n} ${t("pages")}: ${book.title}`}
                className="rounded-lg border border-amber-900/15 dark:border-amber-300/25 px-3 py-1.5 text-xs font-semibold tabular-nums text-amber-800 dark:text-amber-300 transition hover:bg-amber-600/10"
              >
                +{n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onUpdate(book)}
              aria-label={`${t("Update progress")}: ${book.title}`}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
            >
              {t("Update")}
            </button>
            <button
              type="button"
              onClick={() => onFinish(book)}
              aria-label={`${t("Finish")}: ${book.title}`}
              className="flex items-center gap-1 rounded-lg border border-emerald-600/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-600/10"
            >
              <Check className="h-3.5 w-3.5" /> {t("Finish")}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// The books being read right now, as large cards with quick progress buttons.
export function CurrentlyReading({ reading, wantToRead, onQuickAdd, onUpdate, onFinish, onStart, onEdit, onDelete, onAdd }: CurrentlyReadingProps) {
  const { t } = useLocale();

  return (
    <section>
      <SectionTitle title={t("Currently reading")} count={reading.length} />
      {reading.length === 0 ? (
        <div className={`${BOOK_CARD} flex flex-col items-center px-6 py-10 text-center`}>
          <BookMarked className="mb-3 h-9 w-9 text-amber-500" />
          {wantToRead.length > 0 ? (
            <>
              <p className="text-sm font-medium text-neutral-800">{t("Nothing on your nightstand yet.")}</p>
              <p className="mt-1 text-sm text-neutral-500">{t("Pick one from your want-to-read shelf to begin.")}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {wantToRead.slice(0, 3).map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => onStart(book)}
                    className="max-w-[16rem] truncate rounded-full border border-amber-900/15 dark:border-amber-300/25 px-3.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 transition hover:bg-amber-600/10"
                  >
                    {t("Start")}: {book.title}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-500">{t("All caught up -- add your next book.")}</p>
              <button type="button" onClick={onAdd} className={`${BOOK_CTA} mt-4`}>
                <Plus className="h-4 w-4" /> {t("Add Book")}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {reading.map((book) => (
            <ReadingCard key={book.id} book={book} onQuickAdd={onQuickAdd} onUpdate={onUpdate} onFinish={onFinish} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}
