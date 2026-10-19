"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import type { Book, BookNote } from "@/lib/customer/api";
import { addBookNoteAction, removeBookNoteAction } from "@/lib/customer/bookActions";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface BookNotesCardProps {
  book: Book;
  notes: BookNote[];
  today: string;
}

// The newest notes the card shows until it is opened up.
const SHOWN = 3;

// The board's notes on the book being read: each with its page and the day
// it was added, and a line to add one.
export function BookNotesCard({ book, notes, today }: BookNotesCardProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const [all, setAll] = useState(false);
  const [isPending, startTransition] = useTransition();
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
        toast.error(result.message ?? t("Failed to save the note"));
      }
    });
  }

  function remove(note: BookNote) {
    startTransition(async () => {
      const result = await removeBookNoteAction(book.id, note.id);
      if (result.success) {
        toast.success(t("Note removed"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove the note"));
      }
    });
  }

  // The day it was added, in the app's timezone.
  const added = (note: BookNote) => (formatDate(note.createdAt, "yyyy-MM-dd") === today ? t("Added today") : t("Added {date}", { date: formatDate(note.createdAt, "d MMM") }));

  return (
    <Card padding="none" className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-title font-semibold text-ink">{t("Notes from {title}", { title: book.title })}</h2>
        <span className="shrink-0 text-small text-ink-muted">{t(notes.length === 1 ? "{count} note" : "{count} notes", { count: notes.length })}</span>
      </div>
      {notes.length === 0 ? (
        <p className="text-small text-ink-muted">{t("Keep the lines you like and your thoughts as you read.")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((note) => (
            <li key={note.id} className="group flex gap-3 rounded-md border border-warning-soft bg-warning-soft p-3">
              {note.page !== null && <span className="flex h-5.5 shrink-0 items-center rounded-sm border border-warning-fill/40 bg-surface px-2 text-caption font-bold text-warning tabular-nums">{t("p. {page}", { page: note.page })}</span>}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body leading-[1.45] break-words text-ink">{note.text}</span>
                <span className="text-caption text-warning">{added(note)}</span>
              </span>
              <button type="button" onClick={() => remove(note)} disabled={isPending} aria-label={t("Remove the note")} className="flex size-6 shrink-0 items-center justify-center self-start rounded-sm text-warning opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface focus-visible:opacity-100 disabled:opacity-40 max-md:opacity-100">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {notes.length > SHOWN && (
        <button type="button" onClick={() => setAll(!all)} className="self-start text-small font-semibold text-emerald hover:underline">
          {all ? t("Show fewer") : t("Show all {count}", { count: notes.length })}
        </button>
      )}
      <form onSubmit={add} className="mt-auto flex gap-2">
        <Input size="sm" value={text} onChange={(event) => setText(event.target.value)} maxLength={500} placeholder={t("Write a note or a line you liked…")} aria-label={t("New note")} frameClassName="min-w-0 flex-1 px-3" />
        <Input size="sm" inputMode="numeric" value={page} onChange={(event) => setPage(event.target.value.replace(/\D/g, "").slice(0, 5))} placeholder={t("Page")} aria-label={t("Page")} aria-invalid={pageNumber !== null && pageNumber > book.totalPages} frameClassName="w-18 px-3" />
        <Button type="submit" variant="soft" size="sm" disabled={!valid || isPending} className="h-9.5 px-4 text-emerald">
          {t("Add")}
        </Button>
      </form>
    </Card>
  );
}
