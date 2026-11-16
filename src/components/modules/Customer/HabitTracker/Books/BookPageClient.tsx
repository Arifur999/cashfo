"use client";

import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock, FileText, Pencil, Plus, Quote, Trash2, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import PageFrame from "@/components/smartly/PageFrame";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import type { BookDetail, BookNote, Reminder } from "@/lib/customer/api";
import { addBookNoteAction, deleteBookAction, removeBookNoteAction, updateBookAction } from "@/lib/customer/bookActions";
import { formatCurrency } from "@/lib/customer/currency";
import { actionError, dayText } from "@/lib/customer/habitDisplay";
import { longDay, MY_BOOKS_HREF, NOTE_KINDS, type NoteSort, noteDay, noteKind, notePreview, noteStatsOf, shelfOf, sortNotes } from "@/lib/customer/libraryBoard";
import { toDateInputValue } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { useReminderBook } from "../Reminders";
import { paletteFor } from "./bookPalette";
import { BookFormDialog } from "./BookFormDialog";
import { BookNoteDialog } from "./BookNoteDialog";
import { KindChip, LB_AREA, LB_BTN, LB_CARD, LB_OUTLINE, LB_PRIMARY, PageTile } from "./LibraryBits";
import { chipOf } from "./MyBooksPageClient";
import { NoteSortToggle } from "./ReadingNotesDialogs";

const SUMMARY_MAX = 8000;

interface BookPageClientProps {
  detail: BookDetail;
  today: string;
  reminders: Reminder[] | null;
  // ?summary=1: open the summary to write it.
  openSummary?: boolean;
}

// My Library › a book (the LibraryBook board): its details, its notes by
// page or day, each one read on its own with the ones before and after,
// and the summary of the whole book once it is finished.
export function BookPageClient({ detail, today, reminders: savedReminders, openSummary = false }: BookPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const reminders = useReminderBook(savedReminders);
  const { book, notes, shelves } = detail;
  const count = (n: number) => formatCount(n, fmt);
  const [tab, setTab] = useState<"notes" | "summary">(openSummary ? "summary" : "notes");
  const [sort, setSort] = useState<NoteSort>("page");
  const [viewId, setViewId] = useState<string | null>(null);
  const [form, setForm] = useState<{ editing: BookNote | null; backView: string | null } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(openSummary);
  const [draft, setDraft] = useState(book.summary);
  const [confirm, setConfirm] = useState<{ kind: "note"; note: BookNote } | { kind: "book" } | null>(null);
  const [congrats, setCongrats] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sorted = sortNotes(notes, sort);
  const stats = noteStatsOf(notes);
  const shelf = shelfOf(book.shelf, shelves);
  const chip = chipOf(book);
  const viewIndex = sorted.findIndex((note) => note.id === viewId);
  const viewing = viewIndex >= 0 ? sorted[viewIndex] : null;

  function openSummaryEditor() {
    setDraft(book.summary);
    setTab("summary");
    setSummaryOpen(true);
  }

  function saveSummary() {
    const text = draft.trim();
    startTransition(async () => {
      const result = await updateBookAction(book.id, { summary: text });
      if (!result.success) {
        toast.error(actionError(result.message, "Failed to save book", t, fmt));
        return;
      }
      setSummaryOpen(false);
      setTab("summary");
      router.refresh();
      toast.success(t(text ? "Summary saved" : "Summary cleared"));
    });
  }

  function confirmDelete() {
    const target = confirm;
    if (!target) return;
    startTransition(async () => {
      if (target.kind === "book") {
        const result = await deleteBookAction(book.id);
        if (!result.success) {
          toast.error(actionError(result.message, "Failed to remove book", t, fmt));
          return;
        }
        setConfirm(null);
        toast.success(t("Book deleted"));
        router.push(MY_BOOKS_HREF);
        router.refresh();
        return;
      }
      const note = target.note;
      const ids = sorted.map((n) => n.id);
      const at = ids.indexOf(note.id);
      const next = ids[at + 1] ?? ids[at - 1] ?? null;
      const result = await removeBookNoteAction(book.id, note.id);
      if (!result.success) {
        toast.error(actionError(result.message, "Failed to remove the note", t, fmt));
        return;
      }
      setConfirm(null);
      setViewId(next);
      router.refresh();
      toast(t("Note deleted"), {
        action: {
          label: t("Undo"),
          onClick: async () => {
            const back = await addBookNoteAction(book.id, { page: note.page ?? 1, date: noteDay(note), kind: noteKind(note), line: note.line ?? "", text: note.text, marks: note.marks });
            if (!back.success || !back.data) return void toast.error(actionError(back.message, "Failed to save the note", t, fmt));
            setViewId(back.data.id);
            router.refresh();
          },
        },
      });
    });
  }

  const tiles = [
    { label: t("Total notes"), value: count(stats.count), icon: FileText, big: true, none: false },
    { label: t("First note"), value: stats.first ? longDay(stats.first, fmt) : "–", icon: CalendarDays, big: false, none: !stats.first },
    { label: t("Last note"), value: stats.last ? longDay(stats.last, fmt) : "–", icon: Clock, big: false, none: !stats.last },
  ];

  return (
    <PageFrame className="gap-3.5 leading-[normal] md:pt-4 md:pb-5.5 xl:min-h-full">
      <TopbarExtras heading={t("Book")} />
      <Link href={MY_BOOKS_HREF} className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" strokeWidth={2.25} aria-hidden="true" />
        {t("All books")}
      </Link>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_500px]">
        <section className={cn(LB_CARD, "grid grid-cols-[62px_minmax(0,1fr)_auto] items-center gap-4.5 px-4.5 py-4 max-sm:grid-cols-[48px_minmax(0,1fr)]")}>
          <span aria-hidden="true" className="h-22 w-15.5 rounded-[4px_9px_9px_4px] shadow-[inset_5px_0_0_rgba(0,0,0,0.2)] max-sm:h-17 max-sm:w-12" style={{ background: paletteFor(book.color).from }} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="truncate text-[23px] leading-[1.3] font-bold tracking-[-0.02em] text-ink">{book.title}</h1>
            <span className="text-[14.5px] text-ink-soft">{book.author}</span>
            <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.75 font-semibold", chip.chip)}>
                <span aria-hidden="true" className={cn("size-1.5 rounded-full", chip.dot)} />
                {t(chip.label)}
              </span>
              <span className="text-ink-muted">
                {t("Price")}: <b className={cn("tabular-nums", book.price == null ? "text-ink-faint" : "text-ink")}>{book.price == null ? "–" : formatCurrency(book.price, "BDT", fmt)}</b>
              </span>
              <Link href={`${MY_BOOKS_HREF}?shelf=${encodeURIComponent(shelf.id)}`} className="inline-flex items-center gap-1.5 rounded-full border border-shelf-back-end bg-shelf-wall-end px-2.5 py-0.75 font-semibold text-shelf-chip-ink hover:border-shelf-slot">
                <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ background: paletteFor(shelf.color).from }} />
                {shelf.own ? shelf.name : t(shelf.name)}
              </Link>
            </div>
          </div>
          <button type="button" onClick={() => setEditOpen(true)} className={cn(LB_OUTLINE, "max-sm:col-span-2 max-sm:justify-self-start")}>
            <Pencil className="size-3.75" aria-hidden="true" />
            {t("Edit")}
          </button>
        </section>
        <section aria-label={t("Notes at a glance")} className={cn(LB_CARD, "grid grid-cols-3")}>
          {tiles.map((tile, i) => (
            <div key={tile.label} className={cn("flex min-w-0 flex-col justify-center gap-1.5 p-4", i > 0 && "border-l border-divider")}>
              <span className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
                <tile.icon className={cn("size-3.5", i === 0 ? "text-emerald" : "text-ink-muted")} aria-hidden="true" />
                {tile.label}
              </span>
              <span className={cn("truncate font-bold whitespace-nowrap tabular-nums", tile.big ? "text-[24px]" : "text-[14.5px]", tile.none ? "text-ink-faint" : "text-ink")}>{tile.value}</span>
            </div>
          ))}
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-line">
        <div role="tablist" aria-label={t("Book sections")} className="flex gap-6">
          {(["notes", "summary"] as const).map((value) => {
            const on = tab === value;
            return (
              <button key={value} type="button" role="tab" aria-selected={on} onClick={() => setTab(value)} className={cn("inline-flex h-10 items-center gap-2 border-b-2 px-1 text-[14.5px] font-semibold", on ? "border-primary text-emerald" : "border-transparent text-ink-muted hover:text-ink")}>
                {t(value === "notes" ? "Notes@@book" : "Book summary")}
                {value === "notes" && <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[12px]", on ? "bg-tint-teal text-emerald" : "bg-surface-sunken text-ink-muted")}>{count(notes.length)}</span>}
              </button>
            );
          })}
        </div>
        {tab === "notes" && (
          <div className="flex items-center gap-2.5 pb-2">
            <span className="text-[13px] text-ink-muted">{t("Sort by")}</span>
            <NoteSortToggle sort={sort} onChange={setSort} />
            <button type="button" onClick={() => setForm({ editing: null, backView: null })} className={cn(LB_PRIMARY, "h-9")}>
              <Plus className="size-3.75" strokeWidth={2.5} aria-hidden="true" />
              {t("New note")}
            </button>
          </div>
        )}
      </div>

      {tab === "notes" ? (
        <section className={cn(LB_CARD, "flex min-h-65 flex-1 flex-col overflow-hidden")}>
          {sorted.length === 0 ? (
            <div className="flex min-h-65 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-[16px] bg-emerald-soft">
                <Pencil className="size-6.5 text-emerald" strokeWidth={1.8} />
              </span>
              <span className="text-[16px] font-semibold text-ink">{t("No notes for this book yet")}</span>
              <span className="max-w-95 text-[13.5px] text-ink-muted">{t("While reading, write the page number and what you liked or thought.")}</span>
              <button type="button" onClick={() => setForm({ editing: null, backView: null })} className={LB_PRIMARY}>
                {t("Write the first note")}
              </button>
            </div>
          ) : (
            sorted.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setViewId(note.id)}
                aria-label={t("Page {page}, open note", { page: note.page === null ? "–" : count(note.page) })}
                className={cn("grid w-full grid-cols-[78px_minmax(0,1fr)_24px] items-center gap-x-4 border-b border-divider px-4.5 py-3 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring", highlight === note.id && "bg-emerald-soft")}
              >
                <PageTile page={note.page} size="lg" />
                <span className="flex min-w-0 flex-col gap-1.25">
                  <span className="flex flex-wrap items-center gap-2.5 text-[12.5px] text-ink-muted">
                    <span>{dayText(noteDay(note), fmt, "dayMonthYY")}</span>
                    <KindChip kind={noteKind(note)} className="px-2.25 text-[12px]" />
                    {note.line && (
                      <span className="inline-flex items-center gap-1 text-ink-faint">
                        <Quote className="size-3" aria-hidden="true" />
                        {t("line from the book")}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-[14px] leading-[1.55] text-ink">{notePreview(note)}</span>
                </span>
                <ChevronRight className="size-4.5 text-ink-faint" aria-hidden="true" />
              </button>
            ))
          )}
        </section>
      ) : (
        <section className={cn(LB_CARD, "flex min-h-65 flex-1 flex-col overflow-hidden")}>
          {book.summary ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3.5">
                <span className="text-[13px] text-ink-muted">{book.summaryAt ? t("Last edited {date}", { date: longDay(toDateInputValue(book.summaryAt), fmt) }) : ""}</span>
                <button type="button" onClick={openSummaryEditor} className={cn(LB_OUTLINE, "h-9")}>
                  <Pencil className="size-3.75" aria-hidden="true" />
                  {t("Edit")}
                </button>
              </div>
              <div className="px-5.5 py-4.5">
                <p className="max-w-205 text-[15px] leading-[1.8] whitespace-pre-wrap text-ink">{book.summary}</p>
              </div>
            </>
          ) : (
            <div className="flex min-h-65 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-[16px] bg-tint-yellow">
                <BookOpen className="size-6.5 text-tint-yellow-ink" strokeWidth={1.8} />
              </span>
              <span className="max-w-105 text-[15px] text-ink-soft">{t("When you finish the book, write a summary of the whole book here.")}</span>
              <button type="button" onClick={openSummaryEditor} className={LB_PRIMARY}>
                {t("Write summary")}
              </button>
            </div>
          )}
        </section>
      )}

      <BookFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={book}
        shelves={shelves}
        reminders={reminders}
        onDelete={() => {
          setEditOpen(false);
          setConfirm({ kind: "book" });
        }}
        onSaved={(_, change) => {
          if (change.finishedNow && !book.summary) setCongrats(true);
          else toast.success(t(change.finishedNow ? "Congratulations on finishing the book!" : "Book saved"));
        }}
      />

      <BookNoteDialog
        open={form !== null}
        onClose={() => {
          const back = form?.backView ?? null;
          setForm(null);
          if (back) setViewId(back);
        }}
        book={book}
        editing={form?.editing ?? null}
        today={today}
        onSaved={(note, again) => {
          setHighlight(note.id);
          setTab("notes");
          if (again || !form) return;
          const back = form.backView;
          setForm(null);
          if (back) setViewId(note.id);
        }}
      />

      <PopupDialog
        open={viewing !== null && form === null && confirm === null}
        onClose={() => setViewId(null)}
        width={620}
        className="w-160 rounded-[16px] leading-[normal]" subClassName="leading-[normal]"
        headClassName="items-start px-5.5 py-4.5"
        title={
          viewing ? (
            <span className="flex min-w-0 flex-col gap-1.5">
              <span className="truncate text-[13px] font-semibold text-ink-muted">{book.title}</span>
              <span>{t("Page {page}", { page: viewing.page === null ? "–" : count(viewing.page) })}</span>
            </span>
          ) : (
            ""
          )
        }
        titleClassName="text-[22px] font-bold tabular-nums"
        sub={
          viewing ? (
            <span className="flex items-center gap-2.5 text-[13px] text-ink-muted">
              <span>{longDay(noteDay(viewing), fmt)}</span>
              <span className={cn("rounded-full px-2.25 py-0.5 text-[12px] font-semibold", NOTE_KINDS[noteKind(viewing)].soft, NOTE_KINDS[noteKind(viewing)].ink)}>{t(NOTE_KINDS[noteKind(viewing)].label)}</span>
            </span>
          ) : null
        }
        bodyClassName="gap-4 px-5.5 py-5"
        footerClassName="justify-start gap-2 px-5.5 py-3"
        footer={
          viewing && (
            <>
              <button type="button" onClick={() => setViewId(sorted[viewIndex - 1]?.id ?? viewId)} disabled={viewIndex <= 0} className={cn(LB_OUTLINE, "h-9")}>
                <ChevronLeft className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
                {t("Previous note")}
              </button>
              <span className="min-w-12.5 text-center text-[13px] text-ink-muted tabular-nums">
                {count(viewIndex + 1)} / {count(sorted.length)}
              </span>
              <button type="button" onClick={() => setViewId(sorted[viewIndex + 1]?.id ?? viewId)} disabled={viewIndex >= sorted.length - 1} className={cn(LB_OUTLINE, "h-9")}>
                {t("Next note")}
                <ChevronRight className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
              </button>
              <span className="flex-1" />
              <button type="button" onClick={() => setForm({ editing: viewing, backView: viewing.id })} className={cn(LB_OUTLINE, "h-9")}>
                {t("Edit")}
              </button>
              <button type="button" onClick={() => setConfirm({ kind: "note", note: viewing })} className={cn(LB_OUTLINE, "h-9 border-expense-line text-expense hover:bg-expense-soft")}>
                {t("Delete")}
              </button>
            </>
          )
        }
      >
        {viewing?.line && <blockquote className="rounded-[0_10px_10px_0] border-l-4 border-success bg-note-green px-4 py-3 text-[15.5px] leading-[1.7] whitespace-pre-wrap text-success-ink italic">{viewing.line}</blockquote>}
        {viewing?.text && <p className="text-[15px] leading-[1.8] whitespace-pre-wrap text-ink">{viewing.text}</p>}
      </PopupDialog>

      <PopupDialog
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        busy={isPending}
        width={620}
        className="w-170 rounded-[16px] leading-[normal]" subClassName="leading-[normal]"
        headClassName="items-center px-5.5 py-4"
        title={t("Book summary")}
        sub={<span className="block truncate text-[13px]">{book.title}</span>}
        bodyClassName="gap-2 px-5.5 py-4"
        footerClassName="px-5.5"
        footer={
          <>
            <button type="button" onClick={() => setSummaryOpen(false)} disabled={isPending} className={LB_OUTLINE}>
              {t("Cancel")}
            </button>
            <button type="button" onClick={saveSummary} disabled={isPending} className={LB_PRIMARY}>
              {isPending && <Loader />}
              {t("Save")}
            </button>
          </>
        }
      >
        <span className="text-[13px] text-ink-muted">{t("What was the book about, what will you keep from it, who should read it?")}</span>
        <textarea rows={12} maxLength={SUMMARY_MAX} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t("Write the summary of the whole book here...")} aria-label={t("Book summary")} autoFocus className={LB_AREA} />
        <span className="self-end text-[12px] text-ink-faint tabular-nums">
          {count(draft.length)} / {count(SUMMARY_MAX)}
        </span>
      </PopupDialog>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => !isPending && setConfirm(null)}
        onConfirm={confirmDelete}
        isPending={isPending}
        icon={<Trash2 />}
        title={confirm?.kind === "book" ? t("Delete this book?") : t("Delete this note?")}
        description={
          confirm?.kind === "book"
            ? t(notes.length === 1 ? "{title} and its {count} note and summary will be deleted. This cannot be undone." : "{title} and its {count} notes and summary will be deleted. This cannot be undone.", { title: book.title, count: count(notes.length) })
            : confirm
              ? t("The note for page {page} will be removed. You can undo it right after.", { page: confirm.note.page === null ? "–" : count(confirm.note.page) })
              : ""
        }
        confirmLabel={confirm?.kind === "book" ? t("Delete book") : t("Delete note")}
      />

      {congrats && (
        <div role="status" className="fixed bottom-7 left-1/2 z-50 flex w-138.5 max-w-[calc(100%-48px)] -translate-x-1/2 flex-wrap items-center gap-3.5 rounded-[14px] border border-success-line/70 bg-surface px-4 py-3.5 shadow-overlay">
          <span aria-hidden="true" className="flex size-10.5 shrink-0 items-center justify-center rounded-[12px] bg-success-soft">
            <Trophy className="size-5.5 text-tint-green-ink" />
          </span>
          <span className="min-w-0 flex-1 text-[14px] font-semibold text-success-ink">{t("Congratulations! Write a summary of the book now?")}</span>
          <button
            type="button"
            onClick={() => {
              setCongrats(false);
              openSummaryEditor();
            }}
            className={cn(LB_PRIMARY, "h-9")}
          >
            {t("Write summary")}
          </button>
          <button type="button" onClick={() => setCongrats(false)} className={cn(LB_BTN, "h-9 px-2.5 text-[13.5px] text-ink-soft hover:bg-hover")}>
            {t("Later")}
          </button>
        </div>
      )}
    </PageFrame>
  );
}
