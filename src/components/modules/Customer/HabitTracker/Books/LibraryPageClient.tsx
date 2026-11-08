"use client";

import { BookOpen, Check, Clock, FileText, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import PageFrame from "@/components/smartly/PageFrame";
import type { Book, BookNote, BooksOverview, Reminder } from "@/lib/customer/api";
import { addBookNoteAction, removeBookNoteAction, updateBookAction } from "@/lib/customer/bookActions";
import { actionError, dayText } from "@/lib/customer/habitDisplay";
import { bookWeek, dayInitial, latestNote, longDay, MY_BOOKS_HREF, type NoteSort, noteDay, noteKind, notePreview, sortNotes } from "@/lib/customer/libraryBoard";
import { daysToFinish, finishedIn, isPaused, pagesLeft, progressPct, shelves, weekPages } from "@/lib/customer/libraryDisplay";
import { toDateInputValue } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BookNoteDialog } from "./BookNoteDialog";
import { GoalDialog } from "./GoalDialog";
import { CoverArt, coverColors, LB_CARD, LB_SM } from "./LibraryBits";
import { NoteReaderDialog, NotesListDialog } from "./ReadingNotesDialogs";
import { ReadingLogDialog } from "./ReadingLogDialog";

interface LibraryPageClientProps {
  overview: BooksOverview;
  today: string;
  // The page used to set reading reminders here; they live on the book page now.
  reminders?: Reminder[] | null;
}

// Up next shows this many; the rest are on My books.
const UP_NEXT = 4;

// My Library › Reading now (the LibraryHome board): today's pages, the
// streak, this week and this year's finished books; each book being read with
// its last seven days, the day's reading a popup away, and its notes inside
// it; the books up next.
export function LibraryPageClient({ overview, today }: LibraryPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { year, goalTarget, books } = overview;
  const count = (n: number) => formatCount(n, fmt);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [goalOpen, setGoalOpen] = useState(false);
  const [logFor, setLogFor] = useState<string | null>(null);
  const [listFor, setListFor] = useState<string | null>(null);
  const [readId, setReadId] = useState<string | null>(null);
  const [form, setForm] = useState<{ bookId: string; editing: BookNote | null; backRead: string | null } | null>(null);
  const [confirm, setConfirm] = useState<BookNote | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sort, setSort] = useState<NoteSort>("page");

  const byShelf = shelves(books);
  // In the order they were started, so a card never jumps while it is used.
  const reading = [...byShelf.READING].sort((a, b) => (a.startedAt ?? a.createdAt).localeCompare(b.startedAt ?? b.createdAt));
  const upNext = byShelf.WANT_TO_READ.slice(0, UP_NEXT);
  const finished = finishedIn(books, year).length;
  const pagesToday = Object.values(overview.pagesToday).reduce((sum, n) => sum + n, 0);
  const week = weekPages(overview.reading.week, today).total;
  const notesOf = (bookId: string) => overview.notes[bookId] ?? [];
  const bookById = (id: string | null) => (id ? (books.find((book) => book.id === id) ?? null) : null);
  const listBook = bookById(listFor);
  const listNotes = listBook ? sortNotes(notesOf(listBook.id), sort) : [];
  const formBook = bookById(form?.bookId ?? null);

  function run(book: Book, input: { status?: "READING" | "FINISHED"; paused?: boolean }, done: (saved: Book) => void) {
    if (busy) return;
    setBusy(book.id);
    startTransition(async () => {
      const result = await updateBookAction(book.id, input);
      if (result.success && result.data) done(result.data);
      else toast.error(actionError(result.message, "Failed to update", t, fmt));
      router.refresh();
      setBusy(null);
    });
  }

  const finish = (book: Book) =>
    run(book, { status: "FINISHED" }, () =>
      toast.success(t("{title} finished. Book {count} this year!", { title: book.title, count: count(finished + 1) }), {
        action: { label: t("Write summary"), onClick: () => router.push(`${MY_BOOKS_HREF}/${book.id}?summary=1`) },
      }),
    );
  const pause = (book: Book) => run(book, { paused: true }, () => toast.success(t("{title} paused. It is in Up next.", { title: book.title })));
  // Up next: a paused book is resumed with its page, any other one started.
  const start = (book: Book) => run(book, isPaused(book) ? { paused: false } : { status: "READING" }, () => toast.success(t("Now reading {title}", { title: book.title })));

  function closeForm() {
    const back = form?.backRead ?? null;
    setForm(null);
    if (back) setReadId(back);
  }

  function deleteNote() {
    const note = confirm;
    if (!note || deleting) return;
    const ids = listNotes.map((n) => n.id);
    const at = ids.indexOf(note.id);
    const next = ids[at + 1] ?? ids[at - 1] ?? null;
    setDeleting(true);
    startTransition(async () => {
      const result = await removeBookNoteAction(note.bookId, note.id);
      setDeleting(false);
      if (!result.success) {
        toast.error(actionError(result.message, "Failed to remove the note", t, fmt));
        return;
      }
      setConfirm(null);
      setReadId(next);
      router.refresh();
      toast(t("Note deleted"), {
        action: {
          label: t("Undo"),
          onClick: async () => {
            const back = await addBookNoteAction(note.bookId, { page: note.page ?? 1, date: noteDay(note), kind: noteKind(note), line: note.line ?? "", text: note.text, marks: note.marks });
            if (!back.success || !back.data) {
              toast.error(actionError(back.message, "Failed to save the note", t, fmt));
              return;
            }
            setListFor(note.bookId);
            setReadId(back.data.id);
            router.refresh();
          },
        },
      });
    });
  }

  const kpis = [
    { emoji: "📖", tone: "bg-success-soft", label: t("Pages today"), value: t(pagesToday === 1 ? "{count} page" : "{count} pages", { count: count(pagesToday) }) },
    { emoji: "🔥", tone: "bg-orange-soft", label: t("Reading streak"), value: t(overview.reading.streak === 1 ? "{count} day" : "{count} days", { count: count(overview.reading.streak) }) },
    { emoji: "📅", tone: "bg-sky-soft", label: t("This week"), value: t(week === 1 ? "{count} page" : "{count} pages", { count: count(week) }) },
  ];

  const startedText = (book: Book) => {
    if (!book.startedAt) return null;
    const day = toDateInputValue(book.startedAt);
    return day === today ? t("started today") : t("started {date}", { date: dayText(day, fmt, "dayMonth") });
  };

  const card = (book: Book) => {
    const { color, dark } = coverColors(book.color);
    const read = overview.pagesToday[book.id] ?? 0;
    const left = pagesLeft(book);
    const days = daysToFinish(book, today);
    const notes = notesOf(book.id);
    const last = latestNote(notes);
    const waiting = busy === book.id;
    const pct = progressPct(book);
    return (
      <section key={book.id} aria-label={book.title} className={cn("flex flex-col overflow-hidden rounded-[16px] border bg-surface shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.12)]", read > 0 ? "border-success-line/70" : "border-line")}>
        <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4.5 px-4.5 pt-4.5 pb-4 max-sm:grid-cols-[72px_minmax(0,1fr)] max-sm:gap-3.5">
          <CoverArt
            title={book.title}
            author={book.author}
            color={book.color}
            className="h-34.5 w-24 rounded-[3px_9px_9px_3px] pt-3 pr-2.25 pb-2.5 pl-4 shadow-[inset_6px_0_0_rgba(0,0,0,0.22),inset_8px_0_0_rgba(255,255,255,0.10),0_10px_18px_-8px_rgba(15,23,42,0.45)] max-sm:h-26 max-sm:w-18"
            titleClassName="text-[13px] max-sm:text-[11px]"
            authorClassName="text-[10px]"
          />
          <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2.5 max-sm:flex-col">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[18px] font-bold tracking-[-0.01em] text-ink">{book.title}</span>
                <span className="truncate text-[13px] text-ink-muted">{[book.author, startedText(book)].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap", read > 0 ? "bg-success-soft text-tint-green-ink" : "bg-warning-soft text-warning")}>
                {read > 0 ? <Check className="size-3.25" strokeWidth={2.5} aria-hidden="true" /> : <Clock className="size-3.25" strokeWidth={2.5} aria-hidden="true" />}
                {read > 0 ? t("Read today · {count} pages", { count: count(read) }) : t("Not read today")}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] text-ink-soft">
                  <b className="text-[20px] text-ink tabular-nums">{count(book.pagesRead)}</b> / {t("{count} pages", { count: count(book.totalPages) })}
                </span>
                <span className="text-[14px] font-bold tabular-nums" style={{ color }}>
                  {count(pct)}%
                </span>
              </div>
              <span className="block h-2 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${dark})` }} />
              </span>
              <span className="text-[12.5px] text-ink-muted">
                {left === 0
                  ? t("Last page reached")
                  : days
                    ? t(days === 1 ? "{count} pages left · about {days} day" : "{count} pages left · about {days} days", { count: count(left), days: count(days) })
                    : t(left === 1 ? "{count} page left" : "{count} pages left", { count: count(left) })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 max-sm:flex-col max-sm:items-start">
              <span className="text-[12px] font-semibold text-ink-muted">{t("Last 7 days")}</span>
              <span className="flex gap-1.5">
                {bookWeek(book.id, today, overview.lastWeek).map((day) => {
                  const on = day.pages > 0;
                  const isToday = day.date === today;
                  return (
                    <span key={day.date} title={`${longDay(day.date, fmt)} · ${on ? t("{count} pages", { count: count(day.pages) }) : t("not read")}`} className="flex flex-col items-center gap-0.75">
                      <span
                        className={cn("flex size-5.5 items-center justify-center rounded-[7px] text-white", isToday ? "border-[1.5px]" : "border", !on && "bg-surface-sunken", !on && (isToday ? "border-ink-faint" : "border-line"))}
                        style={on ? { background: color, borderColor: color } : undefined}
                      >
                        {on && <Check className="size-2.75" strokeWidth={3.5} aria-hidden="true" />}
                      </span>
                      <span className={cn("text-[10.5px]", isToday ? "font-bold text-ink" : "font-medium text-ink-faint")}>{isToday ? t("Today") : dayInitial(day.date, fmt)}</span>
                    </span>
                  );
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="px-4.5 pb-4">
          <button type="button" onClick={() => setLogFor(book.id)} disabled={waiting} className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] bg-primary text-[14.5px] font-bold text-on-action shadow-[0_6px_14px_-6px_var(--primary)] hover:bg-emerald-hover disabled:opacity-60">
            <BookOpen className="size-4.5" aria-hidden="true" />
            {t("Start reading")}
          </button>
        </div>
        <div className="mt-auto flex flex-col gap-2.5 border-t border-divider bg-page/50 px-4.5 py-3">
          {last ? (
            <button
              type="button"
              onClick={() => {
                setListFor(book.id);
                setReadId(last.id);
              }}
              className="flex w-full items-center gap-2.5 rounded-[9px] border border-warning-soft bg-warning-50 px-2.5 py-2 text-left hover:border-warning-line"
            >
              <span className="shrink-0 text-[11.5px] font-bold text-warning-ink">{last.page === null ? t("Note") : t("p. {page}", { page: count(last.page) })}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{notePreview(last)}</span>
              <span className="shrink-0 text-[11.5px] text-warning-ink">{longDay(noteDay(last), fmt)}</span>
            </button>
          ) : (
            <button type="button" onClick={() => setForm({ bookId: book.id, editing: null, backRead: null })} className="flex w-full items-center gap-2.5 rounded-[9px] border border-dashed border-input bg-surface px-2.5 py-2 text-left text-[13px] text-ink-muted hover:border-emerald">
              <span className="shrink-0 text-[11.5px] font-bold text-ink-faint">{t("Notes")}</span>
              <span className="min-w-0 flex-1 truncate">{t("No notes for this book yet")}</span>
              <span className="shrink-0 text-[11.5px] font-semibold text-emerald">{t("+ Write the first one")}</span>
            </button>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setForm({ bookId: book.id, editing: null, backRead: null })} className={cn(LB_SM, "border-emerald-line bg-emerald-soft text-emerald hover:border-emerald")}>
              <Pencil className="size-3.75" aria-hidden="true" />
              {t("Notes@@write")}
            </button>
            <button
              type="button"
              onClick={() => {
                setListFor(book.id);
                setReadId(null);
              }}
              className={cn(LB_SM, "border-input bg-surface text-ink hover:bg-hover")}
            >
              <FileText className="size-3.75" aria-hidden="true" />
              {t("Note details")}
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-sunken px-1.5 text-[12px] text-ink-soft">{count(notes.length)}</span>
            </button>
            <span className="flex-1" />
            <button type="button" onClick={() => finish(book)} disabled={waiting} className={cn(LB_SM, "border-success-line/70 bg-note-green text-tint-green-ink hover:border-success")}>
              ✓ {t("Finished")}
            </button>
            <button type="button" onClick={() => pause(book)} disabled={waiting} className={cn(LB_SM, "border-line bg-surface text-ink-muted hover:bg-hover")}>
              {t("Pause")}
            </button>
          </div>
        </div>
      </section>
    );
  };

  return (
    <PageFrame className="gap-3.5 leading-[normal] md:pt-5 md:pb-5.5">
      <div className="flex flex-col gap-0.75">
        <h1 className="text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Reading now")}</h1>
        <p className="text-[14px] text-ink-muted">{t("Add the pages you read today. Write notes right inside each book.")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="flex min-w-0 items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-2.75 shadow-card">
            <KpiBody {...kpi} />
          </div>
        ))}
        <button type="button" onClick={() => setGoalOpen(true)} title={t(goalTarget ? "Change this year's goal" : "Set a goal for this year")} className="flex min-w-0 items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-2.75 text-left shadow-card hover:border-line-strong">
          <KpiBody emoji="🏆" tone="bg-warning-soft" label={t("Finished in {year}", { year: toLocaleDigits(String(year), fmt) })} value={goalTarget ? t("{done} of {total}", { done: count(finished), total: count(goalTarget) }) : count(finished)} />
        </button>
      </div>

      {reading.length > 0 ? (
        <div className="grid items-stretch gap-3.5 lg:grid-cols-2">{reading.map(card)}</div>
      ) : (
        <div className="rounded-[14px] border-[1.5px] border-dashed border-input p-10 text-center text-[14px] text-ink-muted">{t("Nothing being read. Pick a book from Up next.")}</div>
      )}

      <section aria-labelledby="up-next" className={cn(LB_CARD, "flex flex-col gap-2.5 px-4 py-3.5")}>
        <div className="flex items-center justify-between gap-2">
          <h2 id="up-next" className="text-[15px] font-semibold text-ink">
            {t("Up next")}
          </h2>
          <Link href={MY_BOOKS_HREF} className="text-[12.5px] font-semibold text-emerald hover:underline">
            {t("All books")}
          </Link>
        </div>
        {upNext.length === 0 ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
            {t("Nothing waiting. Add the book you want to read next.")}
            <Link href={`${MY_BOOKS_HREF}?add=1`} className="font-semibold text-emerald hover:underline">
              {t("Add book")}
            </Link>
          </p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {upNext.map((book) => {
              const paused = isPaused(book);
              return (
                <div key={book.id} className="flex min-w-0 items-center gap-2.5 rounded-[10px] border border-divider p-2.5">
                  <span aria-hidden="true" className="h-8.5 w-6 shrink-0 rounded-[2px_5px_5px_2px]" style={{ background: coverColors(book.color).color }} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-semibold text-ink">{book.title}</span>
                    <span className="truncate text-[11.5px] text-ink-muted">
                      {[book.author, paused ? t("page {page} of {total}", { page: count(book.pagesRead), total: count(book.totalPages) }) : t("{count} pages", { count: count(book.totalPages) })].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <button type="button" onClick={() => start(book)} disabled={busy === book.id} className="h-7.5 shrink-0 rounded-[8px] border border-input bg-surface px-2.5 text-[12.5px] font-semibold whitespace-nowrap text-ink hover:bg-hover disabled:opacity-50">
                    {t(paused ? "Resume" : "Start")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ReadingLogDialog open={logFor !== null} onClose={() => setLogFor(null)} book={bookById(logFor)} last={logFor ? overview.lastLogs?.[logFor] : undefined} today={today} finishedThisYear={finished} />

      {listBook && (
        <>
          <NotesListDialog
            open={!readId && !form}
            onClose={() => setListFor(null)}
            bookTitle={listBook.title}
            notes={listNotes}
            sort={sort}
            onSort={setSort}
            onOpenNote={(note) => setReadId(note.id)}
            onWrite={() => setForm({ bookId: listBook.id, editing: null, backRead: null })}
          />
          <NoteReaderDialog
            open={!!readId && !form && !confirm}
            onClose={() => {
              setReadId(null);
              setListFor(null);
            }}
            bookId={listBook.id}
            bookTitle={listBook.title}
            notes={listNotes}
            noteId={readId}
            onMove={setReadId}
            onBack={() => setReadId(null)}
            onEdit={(note) => {
              setForm({ bookId: listBook.id, editing: note, backRead: note.id });
              setReadId(null);
            }}
            onDelete={setConfirm}
          />
        </>
      )}

      {formBook && (
        <BookNoteDialog
          open={!!form}
          onClose={closeForm}
          book={formBook}
          editing={form?.editing ?? null}
          startPage={form?.editing ? undefined : formBook.pagesRead || undefined}
          today={today}
          onSaved={(note, again) => {
            if (again || !form) return;
            const back = form.backRead ? note.id : null;
            setForm(null);
            if (back) setReadId(back);
          }}
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => !deleting && setConfirm(null)}
        onConfirm={deleteNote}
        isPending={deleting}
        title={t("Delete this note?")}
        description={confirm ? t("The note for page {page} will be removed. You can undo it right after.", { page: confirm.page === null ? "–" : count(confirm.page) }) : ""}
        confirmLabel={t("Delete note")}
      />
      <GoalDialog open={goalOpen} onClose={() => setGoalOpen(false)} year={year} current={goalTarget} />
    </PageFrame>
  );
}

function KpiBody({ emoji, tone, label, value }: { emoji: string; tone: string; label: string; value: string }) {
  return (
    <>
      <span aria-hidden="true" className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-[10px] text-[18px]", tone)}>
        {emoji}
      </span>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="truncate text-[12.5px] text-ink-muted">{label}</span>
        <span className="truncate text-[20px] font-bold text-ink tabular-nums">{value}</span>
      </span>
    </>
  );
}
