"use client";

import { useId, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { Book } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { BookCover } from "./BookCover";
import { BOOK_CTA } from "./bookTheme";
import { SERIF_STACK } from "./fonts";

interface ProgressModalProps {
  book: Book | null; // null = closed
  onClose: () => void;
  onSave: (book: Book, pagesRead: number) => void;
}

// "Which page are you on?" -- a number box, a slider and a few quick chips.
export function ProgressModal({ book, onClose, onSave }: ProgressModalProps) {
  const { t } = useLocale();
  return (
    <Modal open={book !== null} onClose={onClose} title={t("Update progress")}>
      {book && <ProgressForm key={book.id} book={book} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function ProgressForm({ book, onClose, onSave }: { book: Book; onClose: () => void; onSave: (book: Book, pagesRead: number) => void }) {
  const { t } = useLocale();
  const inputId = useId();
  const [text, setText] = useState(String(book.pagesRead));
  const total = book.totalPages;
  const value = text === "" ? 0 : Math.min(Number(text), total);
  const set = (n: number) => setText(String(Math.min(total, Math.max(0, n))));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(book, value);
      }}
    >
      <div className="mb-5 flex items-center gap-4">
        <BookCover title={book.title} author={book.author} color={book.color} className="w-16" />
        <div className="min-w-0">
          <p className="line-clamp-2 break-words text-base font-semibold text-neutral-900" style={{ fontFamily: SERIF_STACK }}>
            {book.title}
          </p>
          {book.author && <p className="truncate text-sm text-neutral-500">{book.author}</p>}
        </div>
      </div>

      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-neutral-700">
        {t("Which page are you on?")}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={inputId}
          value={text}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 5);
            setText(digits !== "" && Number(digits) > total ? String(total) : digits);
          }}
          inputMode="numeric"
          autoFocus
          className="w-28 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-center text-lg font-semibold tabular-nums outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
        />
        <span className="text-sm tabular-nums text-neutral-500">
          / {total} {t("pages")}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={total}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        aria-label={t("Which page are you on?")}
        className="mt-4 w-full accent-amber-600"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {[-10, 10, 25].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => set(value + n)}
            className="rounded-lg border border-amber-900/15 dark:border-amber-300/25 px-3 py-1.5 text-xs font-semibold tabular-nums text-amber-800 dark:text-amber-300 transition hover:bg-amber-600/10"
          >
            {n > 0 ? `+${n}` : n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => set(total)}
          className="rounded-lg border border-emerald-600/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-600/10"
        >
          {t("Finished")}
        </button>
      </div>

      {value >= total && <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">{t("This will mark the book as finished.")}</p>}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          {t("Cancel")}
        </button>
        <button type="submit" className={BOOK_CTA}>
          {t("Save")}
        </button>
      </div>
    </form>
  );
}
