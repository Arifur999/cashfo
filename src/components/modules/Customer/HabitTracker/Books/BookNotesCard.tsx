"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Input from "@/components/smartly/form/Input";
import type { Book, BookNote } from "@/lib/customer/api";
import { addBookNoteAction, removeBookNoteAction } from "@/lib/customer/bookActions";
import { actionError, instantText, latinDigits } from "@/lib/customer/habitDisplay";
import { toDateInputValue } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface BookNotesCardProps {
  book: Book;
  notes: BookNote[];
  today: string;
}

// The newest notes the card shows until it is opened up.
const SHOWN = 3;

// The board's notes on the book being read: each with its page and the day
// it was added, and a line to add one. Removing a note asks first.
export function BookNotesCard({ book, notes, today }: BookNotesCardProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const [all, setAll] = useState(false);
  const [removing, setRemoving] = useState<BookNote | null>(null);
  const [isPending, startTransition] = useTransition();
  const count = (n: number) => formatCount(n, locale);
  const shown = all ? notes : notes.slice(-SHOWN);
  const pageNumber = page ? Number(page) : null;
  const valid = text.trim() !== "" && (pageNumber === null || (pageNumber >= 1 && pageNumber <= book.totalPages));

  function add(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    startTransition(async () => {
      const result = await addBookNoteAction(book.id, { text: text.trim(), ...(pageNumber !== null && { page: pageNumber }) });
      if (result.success) {
        setText("");
        setPage("");
        router.refresh();
      } else {
        toast.error(actionError(result.message, "Failed to save the note", t, locale));
      }
    });
  }

  function remove() {
    if (!removing) return;
    const note = removing;
    startTransition(async () => {
      const result = await removeBookNoteAction(book.id, note.id);
      if (result.success) {
        toast.success(t("Note removed"));
        setRemoving(null);
        router.refresh();
      } else {
        toast.error(actionError(result.message, "Failed to remove the note", t, locale));
      }
    });
  }

  // The day it was added, in the app's timezone.
  const added = (note: BookNote) => (toDateInputValue(note.createdAt) === today ? t("Added today") : t("Added {date}", { date: instantText(note.createdAt, locale) }));

  return (
    <Card padding="none" className="flex min-w-0 flex-col gap-3 rounded-md px-5 py-4.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-title font-semibold text-ink">{t("Notes from {title}", { title: book.title })}</h2>
        <span className="shrink-0 text-[12.5px] text-ink-muted">{t(notes.length === 1 ? "{count} note" : "{count} notes", { count: count(notes.length) })}</span>
      </div>
      {notes.length === 0 ? (
        <p className="text-small text-ink-muted">{t("Keep the lines you like and your thoughts as you read.")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((note) => (
            <li key={note.id} className="group flex gap-3 rounded-field border border-warning-soft bg-warning-50 px-3 py-2.5">
              {note.page !== null && <span className="flex h-5.5 shrink-0 items-center rounded-[6px] border border-warning-line bg-surface px-1.75 text-[11.5px] font-bold text-warning-ink tabular-nums">{t("p. {page}", { page: count(note.page) })}</span>}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13.5px] leading-[1.45] wrap-break-word text-ink">{note.text}</span>
                <span className="text-[11.5px] text-warning-ink">{added(note)}</span>
              </span>
              {/* Shown on hover and focus with a mouse; always under a finger or on a phone. */}
              <button type="button" onClick={() => setRemoving(note)} disabled={isPending} aria-label={t("Remove the note")} className="flex size-6 shrink-0 items-center justify-center self-start rounded-sm text-warning opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-surface focus-visible:opacity-100 disabled:opacity-40 max-md:opacity-100 pointer-coarse:size-9 pointer-coarse:opacity-100">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {notes.length > SHOWN && (
        <button type="button" aria-expanded={all} onClick={() => setAll(!all)} className="flex min-h-8 items-center self-start text-small font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
          {all ? t("Show fewer") : t("Show all {count}", { count: count(notes.length) })}
        </button>
      )}
      <form onSubmit={add} className="mt-auto flex gap-2">
        <Input size="sm" value={text} onChange={(event) => setText(event.target.value)} maxLength={500} placeholder={t("Write a note or a line you liked…")} aria-label={t("New note")} frameClassName="min-w-0 flex-1 px-3 pointer-coarse:h-11" />
        <Input size="sm" inputMode="numeric" value={page} onChange={(event) => setPage(latinDigits(event.target.value).replace(/\D/g, "").slice(0, 5))} placeholder={t("Page")} aria-label={t("Page")} aria-invalid={pageNumber !== null && pageNumber > book.totalPages} frameClassName="w-18 px-2.5 pointer-coarse:h-11" />
        <Button type="submit" variant="soft" size="sm" disabled={!valid || isPending} className="h-9.5 px-3.5 pointer-coarse:h-11">
          {t("Add")}
        </Button>
      </form>
      <ConfirmDialog open={removing !== null} onClose={() => !isPending && setRemoving(null)} onConfirm={remove} isPending={isPending} title={t("Remove this note?")} description={removing ? `“${removing.text.length > 80 ? `${removing.text.slice(0, 80)}…` : removing.text}”` : ""} confirmLabel={t("Remove the note")} />
    </Card>
  );
}
