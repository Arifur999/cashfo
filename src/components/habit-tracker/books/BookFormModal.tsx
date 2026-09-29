"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type TransitionStartFunction } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { Book, BookStatus } from "@/lib/api";
import { createBookAction, updateBookAction } from "@/lib/bookActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { BookCover } from "./BookCover";
import { BOOK_PALETTE, suggestColor } from "./bookPalette";
import { BOOK_CTA, STATUS_META } from "./bookTheme";

const STATUSES: BookStatus[] = ["WANT_TO_READ", "READING", "FINISHED"];
const INPUT =
  "w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 aria-[invalid=true]:border-red-400";

interface BookFormModalProps {
  open: boolean;
  onClose: () => void;
  book: Book | null; // the book being edited; null = add a new one
}

// Add or edit a book. The form itself lives in an inner component that is only
// mounted while the dialog is open, so its fields start fresh every time.
export function BookFormModal({ open, onClose, book }: BookFormModalProps) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  // Once a save is in flight it will finish either way, so the dialog can't be
  // dismissed (Cancel / Escape / the X) in the meantime.
  function handleClose() {
    if (!isPending) onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={t(book ? "Edit book" : "Add a book")} size="lg">
      <BookForm book={book} onClose={handleClose} isPending={isPending} startTransition={startTransition} />
    </Modal>
  );
}

function BookForm({ book, onClose, isPending, startTransition }: { book: Book | null; onClose: () => void; isPending: boolean; startTransition: TransitionStartFunction }) {
  const router = useRouter();
  const { t } = useLocale();
  const ids = { title: useId(), author: useId(), pages: useId(), read: useId() };

  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [totalPages, setTotalPages] = useState(book ? String(book.totalPages) : "");
  const [status, setStatus] = useState<BookStatus>("WANT_TO_READ");
  const [pagesRead, setPagesRead] = useState("");
  // Until the reader picks a colour, a new book takes one from its title.
  const [pickedColor, setPickedColor] = useState<string | null>(book?.color ?? null);
  const color = pickedColor ?? suggestColor(title.trim());

  const total = Number(totalPages);
  const titleOk = title.trim().length > 0;
  const totalOk = /^\d+$/.test(totalPages) && total >= 1 && total <= 20000;
  const readTooHigh = status === "READING" && totalOk && pagesRead !== "" && Number(pagesRead) > total;
  // The server rejects a total below the pages already read (it used to mark
  // the book finished, which lost the real progress once the typo was fixed).
  // A finished book is exempt: its pages simply follow the new total.
  const shrinksBelowProgress = book !== null && book.status !== "FINISHED" && totalOk && total < book.pagesRead;
  const valid = titleOk && totalOk && !readTooHigh && !shrinksBelowProgress;

  function submit() {
    if (!valid) return;
    startTransition(async () => {
      const details = { title: title.trim(), author: author.trim(), totalPages: total, color };
      const result = book
        ? await updateBookAction(book.id, details)
        : await createBookAction({ ...details, status, ...(status === "READING" ? { pagesRead: Number(pagesRead || 0) } : {}) });
      if (result.success) {
        toast.success(t(book ? "Book updated" : "Book added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save book"));
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]"
    >
      <div className="hidden sm:block">
        <BookCover title={title.trim() || t("Your book title")} author={author.trim()} color={color} className="w-full" />
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor={ids.title} className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Title")}
          </label>
          <input id={ids.title} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus placeholder={t("e.g. Atomic Habits")} className={INPUT} />
        </div>
        <div>
          <label htmlFor={ids.author} className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Author")} <span className="font-normal text-neutral-400">({t("Optional")})</span>
          </label>
          <input id={ids.author} value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={80} className={INPUT} />
        </div>
        <div>
          <label htmlFor={ids.pages} className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Total pages")}
          </label>
          <input
            id={ids.pages}
            value={totalPages}
            onChange={(e) => setTotalPages(e.target.value.replace(/\D/g, "").slice(0, 5))}
            inputMode="numeric"
            placeholder="320"
            aria-invalid={(totalPages !== "" && !totalOk) || shrinksBelowProgress}
            aria-describedby={(totalPages !== "" && !totalOk) || shrinksBelowProgress ? `${ids.pages}-error` : undefined}
            className={INPUT}
          />
          {totalPages !== "" && !totalOk && (
            <p id={`${ids.pages}-error`} className="mt-1.5 text-xs text-red-500">
              {t("Enter a number from 1 to 20000.")}
            </p>
          )}
          {shrinksBelowProgress && (
            <p id={`${ids.pages}-error`} className="mt-1.5 text-xs text-red-500">
              {t("You've already read more pages than this.")}
            </p>
          )}
        </div>

        {!book && (
          <div>
            <p id={`${ids.title}-status`} className="mb-1 block text-sm font-medium text-neutral-700">
              {t("Status")}
            </p>
            <div role="group" aria-labelledby={`${ids.title}-status`} className="grid grid-cols-3 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                    status === s ? "border-amber-600 bg-amber-600/10 text-amber-800 dark:text-amber-300" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {t(STATUS_META[s].label)}
                </button>
              ))}
            </div>
            {status === "READING" && (
              <div className="mt-3">
                <label htmlFor={ids.read} className="mb-1 block text-sm font-medium text-neutral-700">
                  {t("Pages read")}
                </label>
                <input
                  id={ids.read}
                  value={pagesRead}
                  onChange={(e) => setPagesRead(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  inputMode="numeric"
                  placeholder="0"
                  aria-invalid={readTooHigh}
                  aria-describedby={readTooHigh ? `${ids.read}-error` : undefined}
                  className={INPUT}
                />
                {readTooHigh && (
                  <p id={`${ids.read}-error`} className="mt-1.5 text-xs text-red-500">
                    {t("That's more than the total pages.")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <p id={`${ids.title}-colour`} className="mb-2 block text-sm font-medium text-neutral-700">
            {t("Cover colour")}
          </p>
          <div role="group" aria-labelledby={`${ids.title}-colour`} className="flex flex-wrap gap-2.5">
            {BOOK_PALETTE.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={color === p.key}
                aria-label={t(p.label)}
                title={t(p.label)}
                onClick={() => setPickedColor(p.key)}
                className={`h-7 w-7 rounded-full transition ${color === p.key ? "ring-2 ring-amber-600 ring-offset-2 ring-offset-surface" : "hover:scale-110"}`}
                style={{ backgroundImage: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 sm:col-span-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
        >
          {t("Cancel")}
        </button>
        <button type="submit" disabled={!valid || isPending} className={BOOK_CTA}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t(book ? "Save" : "Add Book")}
        </button>
      </div>
    </form>
  );
}
