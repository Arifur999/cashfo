"use client";

import { BookOpen, CalendarDays, Check, Flame, LayoutDashboard, Library, MoreVertical, Pause, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Book, BooksOverview, Reminder } from "@/lib/customer/api";
import { deleteBookAction, updateBookAction } from "@/lib/customer/bookActions";
import { actionError, dayText, latinDigits } from "@/lib/customer/habitDisplay";
import { applyProgress, daysToFinish, finishedIn, isPaused, pagesLeft, progressPct, shelves, weekPages } from "@/lib/customer/libraryDisplay";
import { toDateInputValue } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { useReminderBook } from "../Reminders";
import { BookDrawer } from "./BookDrawer";
import { BookNotesCard } from "./BookNotesCard";
import { paletteFor } from "./bookPalette";
import { GoalDialog } from "./GoalDialog";

interface LibraryPageClientProps {
  overview: BooksOverview;
  today: string;
  // Saved reminders (each one's is set in its drawer); null when they couldn't be read.
  reminders: Reminder[] | null;
}

type BookUpdate = { kind: "progress"; id: string; pagesRead: number } | { kind: "paused"; id: string; paused: boolean };

// One tap adds this many pages read today.
const QUICK_PAGES = [10, 20, 30];
// Up next shows this many; the rest are on the dashboard.
const UP_NEXT = 5;
const KPI_TONE = ["bg-income-soft text-income", "bg-orange-soft text-orange", "bg-info-soft text-info", "bg-warning-soft text-warning"];

// My Library › Reading now (the LibraryHome board): today's pages, the
// streak, this week and this year's finished books; every book being read
// with the pages read today a tap away, finished or paused from there; the
// notes on the one picked and the books up next.
export function LibraryPageClient({ overview, today, reminders: savedReminders }: LibraryPageClientProps) {
  const reminders = useReminderBook(savedReminders);
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { year, goalTarget } = overview;
  const count = (n: number) => formatCount(n, fmt);

  // Server props stay the source of truth; a page update or a pause is
  // layered on top until the PATCH and refresh land.
  const [books, applyUpdate] = useOptimistic(overview.books, (current, update: BookUpdate) =>
    current.map((book) => {
      if (book.id !== update.id) return book;
      if (update.kind === "progress") return applyProgress(book, update.pagesRead, year);
      return { ...book, pausedAt: update.paused ? new Date().toISOString() : null };
    }),
  );
  const [, startUpdate] = useTransition();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Book | null }>({ open: false, editing: null });
  const [goalOpen, setGoalOpen] = useState(false);
  const [removing, setRemoving] = useState<Book | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const byShelf = shelves(books);
  // In the order they were started, so a card never jumps while it is used.
  const reading = [...byShelf.READING].sort((a, b) => (a.startedAt ?? a.createdAt).localeCompare(b.startedAt ?? b.createdAt));
  const upNext = byShelf.WANT_TO_READ.slice(0, UP_NEXT);
  const selected = reading.find((book) => book.id === picked) ?? reading[0] ?? null;
  // Pages read today in a book: the server's count, moved along with an
  // optimistic page update until the server's count comes back.
  const served = (id: string) => overview.books.find((book) => book.id === id);
  const todayIn = (book: Book) => Math.max(0, (overview.pagesToday[book.id] ?? 0) + book.pagesRead - (served(book.id)?.pagesRead ?? book.pagesRead));
  const pagesToday = books.reduce((sum, book) => sum + todayIn(book), 0);
  const servedToday = Object.values(overview.pagesToday).reduce((sum, n) => sum + n, 0);
  const week = weekPages(overview.reading.week, today).total + pagesToday - servedToday;
  const streak = overview.reading.streak + (servedToday === 0 && pagesToday > 0 ? 1 : 0);
  const finished = finishedIn(books, year).length;

  function run(book: Book, update: BookUpdate, input: { pagesRead?: number; paused?: boolean }, done?: (result: Book | undefined) => void) {
    if (busy.has(book.id)) return;
    setBusy((prev) => new Set(prev).add(book.id));
    startUpdate(async () => {
      applyUpdate(update);
      const result = await updateBookAction(book.id, input);
      if (result.success) done?.(result.data);
      else toast.error(actionError(result.message, "Failed to update", t, fmt));
      router.refresh();
      setBusy((prev) => {
        const rest = new Set(prev);
        rest.delete(book.id);
        return rest;
      });
    });
  }

  // Never past the last page or below the first: the server refuses both.
  function setPage(book: Book, requested: number) {
    const pagesRead = Math.min(Math.max(0, Math.round(requested)), book.totalPages);
    if (pagesRead === book.pagesRead) return;
    run(book, { kind: "progress", id: book.id, pagesRead }, { pagesRead }, (saved) => {
      if (saved?.status === "FINISHED" && book.status !== "FINISHED") toast.success(t("{title} finished. Book {count} this year.", { title: book.title, count: count(finished + 1) }));
      else if (pagesRead >= book.totalPages) toast.success(t("Last page! Tap Finished when you're done."));
    });
  }

  function saveDraft(book: Book) {
    const value = Number(latinDigits(drafts[book.id] ?? ""));
    if (!drafts[book.id] || !Number.isInteger(value)) {
      toast.error(t("Type the page you are on"));
      return;
    }
    setDrafts((prev) => ({ ...prev, [book.id]: "" }));
    setPage(book, value);
  }

  function setPaused(book: Book, paused: boolean) {
    run(book, { kind: "paused", id: book.id, paused }, { paused }, () => toast.success(paused ? t("{title} paused. It waits in Up next.", { title: book.title }) : t("Now reading {title}", { title: book.title })));
  }

  // Up next: a paused book is resumed with its page, any other one started.
  function start(book: Book) {
    if (isPaused(book)) return setPaused(book, false);
    startTransition(async () => {
      const result = await updateBookAction(book.id, { status: "READING" });
      if (result.success) {
        toast.success(t("Now reading {title}", { title: book.title }));
        setPicked(book.id);
      } else {
        toast.error(actionError(result.message, "Failed to update", t, fmt));
      }
      router.refresh();
    });
  }

  function remove() {
    if (!removing) return;
    const target = removing;
    startTransition(async () => {
      const result = await deleteBookAction(target.id);
      if (result.success) {
        toast.success(t("Book removed"));
        setRemoving(null);
      } else {
        toast.error(actionError(result.message, "Failed to remove book", t, fmt));
      }
      router.refresh();
    });
  }

  const openAdd = () => setDrawer({ open: true, editing: null });
  const startedText = (book: Book) => (book.startedAt ? (toDateInputValue(book.startedAt) === today ? t("started today") : t("started {date}", { date: dayText(toDateInputValue(book.startedAt), fmt, "dayMonth") })) : null);

  const kpis = [
    { icon: BookOpen, label: t("Pages today"), value: count(pagesToday) },
    { icon: Flame, label: t("Reading streak"), value: t(streak === 1 ? "{count} day" : "{count} days", { count: count(streak) }) },
    { icon: CalendarDays, label: t("This week"), value: t(week === 1 ? "{count} page" : "{count} pages", { count: count(week) }) },
    { icon: Trophy, label: t("Finished in {year}", { year: toLocaleDigits(String(year), fmt) }), value: goalTarget ? t("{done} of {total}", { done: count(finished), total: count(goalTarget) }) : count(finished), goal: true },
  ];

  const readingCard = (book: Book) => {
    const on = selected?.id === book.id;
    const palette = paletteFor(book.color);
    const left = pagesLeft(book);
    const days = daysToFinish(book, today);
    const readToday = todayIn(book);
    const waiting = busy.has(book.id);
    const draft = drafts[book.id] ?? "";
    return (
      <Card key={book.id} padding="none" className={cn("relative grid grid-cols-[56px_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-[14px] border-[1.5px] px-4.5 py-4 transition-colors", on ? "border-emerald" : "border-line")}>
        <span aria-hidden="true" className="row-span-2 flex h-19 w-14 items-center justify-center rounded-[4px_9px_9px_4px] text-[15px] font-bold tabular-nums shadow-[0_6px_14px_rgba(0,0,0,0.18)] max-sm:row-span-1" style={{ background: `linear-gradient(90deg, ${palette.to} 0 6px, ${palette.from} 6px 100%)`, color: palette.ink }}>
          {count(progressPct(book))}%
        </span>
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 flex-col gap-0.5">
              <button type="button" onClick={() => setPicked(book.id)} aria-pressed={on} className="truncate text-left text-[16px] font-semibold text-ink after:absolute after:inset-0 after:rounded-[14px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-focus-ring">
                {book.title}
              </button>
              <span className="truncate text-[12.5px] text-ink-muted">{[book.author, startedText(book)].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="relative z-10 flex shrink-0 items-center gap-1.5">
              {readToday > 0 && <span className="rounded-full bg-mint-50 px-2.5 py-1 text-[12px] font-semibold text-brand-ink tabular-nums">{t(readToday === 1 ? "{count} page today" : "{count} pages today", { count: count(readToday) })}</span>}
              <DropdownMenu>
                <DropdownMenuTrigger aria-label={t("More for {name}", { name: book.title })} className="flex size-8 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
                  <MoreVertical className="size-4.5" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-md border border-line bg-surface p-1 shadow-overlay ring-0">
                  <DropdownMenuItem onSelect={() => setDrawer({ open: true, editing: book })} className="rounded-sm px-3 py-2 text-body text-ink focus:bg-surface-sunken pointer-coarse:min-h-11">
                    <Pencil className="size-4" aria-hidden="true" />
                    {t("Edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setRemoving(book)} className="rounded-sm px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense pointer-coarse:min-h-11">
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t("Remove")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px]">
              <b className="font-semibold text-ink tabular-nums">{t("Page {page} of {total}", { page: count(book.pagesRead), total: count(book.totalPages) })}</b>
              <span className="text-ink-muted">{left === 0 ? t("Last page reached") : days ? t(days === 1 ? "{count} pages left · about {days} day" : "{count} pages left · about {days} days", { count: count(left), days: count(days) }) : t(left === 1 ? "{count} page left" : "{count} pages left", { count: count(left) })}</span>
            </div>
            <span className="block h-2 overflow-hidden rounded-full bg-surface-sunken">
              <span className="block h-full rounded-full bg-emerald transition-[width]" style={{ width: `${progressPct(book)}%` }} />
            </span>
          </div>
        </div>
        <div className="relative z-10 col-span-full flex flex-wrap items-center gap-2 sm:col-start-2">
          <span className="text-[12.5px] font-semibold text-ink-soft">{t("Read today:")}</span>
          {QUICK_PAGES.map((n) => (
            <button key={n} type="button" disabled={waiting || book.pagesRead >= book.totalPages} onClick={() => setPage(book, book.pagesRead + n)} className="h-8 rounded-full border border-emerald-line bg-mint-50 px-3 text-[13px] font-semibold text-brand-ink tabular-nums hover:border-emerald disabled:opacity-50 pointer-coarse:h-11">
              +{count(n)}
            </button>
          ))}
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-line max-sm:hidden" />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveDraft(book);
            }}
            className="flex items-center gap-1.5"
          >
            <label htmlFor={`page-${book.id}`} className="text-[12.5px] text-ink-soft">
              {t("or I'm on page")}
            </label>
            <input
              id={`page-${book.id}`}
              inputMode="numeric"
              value={draft}
              onChange={(event) => setDrafts((prev) => ({ ...prev, [book.id]: latinDigits(event.target.value).replace(/\D/g, "").slice(0, 5) }))}
              placeholder={count(book.pagesRead)}
              className="h-8 w-16 rounded-sm border border-input bg-surface px-2 text-[13px] text-ink tabular-nums outline-none focus:border-emerald pointer-coarse:h-11"
            />
            <Button type="submit" variant="secondary" size="sm" disabled={waiting || draft === ""} className="h-8 rounded-sm px-3 pointer-coarse:h-11">
              {t("Save")}
            </Button>
          </form>
          <span className="ml-auto flex gap-2 max-sm:ml-0">
            <Button size="sm" disabled={waiting} onClick={() => setPage(book, book.totalPages)} className="h-8 rounded-sm px-3 pointer-coarse:h-11">
              <Check strokeWidth={3} />
              {t("Finished")}
            </Button>
            <Button variant="secondary" size="sm" disabled={waiting} onClick={() => setPaused(book, true)} className="h-8 rounded-sm px-3 pointer-coarse:h-11">
              <Pause />
              {t("Pause")}
            </Button>
          </span>
        </div>
      </Card>
    );
  };

  return (
    <PageFrame className="gap-3.5 md:pt-6">
      <PageHeader
        title={t("Reading now")}
        description={t("Add the pages you read today. Everything else is counted for you.")}
        actions={
          <>
            <Button variant="secondary" asChild className="rounded-sm px-3.5">
              <Link href="/habit-tracker/habits/library">
                <LayoutDashboard className="text-ink-soft" />
                {t("Dashboard")}
              </Link>
            </Button>
            <Button onClick={openAdd} className="rounded-sm">
              <Plus strokeWidth={2.25} />
              {t("Add book")}
            </Button>
          </>
        }
      />

      {books.length === 0 ? (
        <EmptyState icon={<Library />} tone="habits" title={t("Your shelf is empty, for now")} description={t("Add the book you want to read next. It takes ten seconds.")} action={<Button onClick={openAdd}>{t("Add book")}</Button>} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {kpis.map((kpi, i) => {
              const body = (
                <>
                  <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", KPI_TONE[i])}>
                    <kpi.icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[12.5px] text-ink-muted">{kpi.label}</span>
                    <span className="truncate text-[20px] leading-tight font-bold text-ink tabular-nums">{kpi.value}</span>
                  </span>
                </>
              );
              const look = "flex min-w-0 items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 text-left shadow-card";
              return kpi.goal ? (
                <button key={kpi.label} type="button" onClick={() => setGoalOpen(true)} title={t(goalTarget ? "Change this year's goal" : "Set a goal for this year")} className={cn(look, "hover:border-line-strong")}>
                  {body}
                </button>
              ) : (
                <div key={kpi.label} className={look}>
                  {body}
                </div>
              );
            })}
          </div>

          <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-3.5">
              {reading.length === 0 ? <p className="rounded-[14px] border border-dashed border-line bg-surface px-5 py-10 text-center text-body text-ink-muted">{t("Nothing being read. Pick a book from Up next.")}</p> : reading.map(readingCard)}
            </div>

            <div className="flex min-w-0 flex-col gap-3.5">
              {selected && <BookNotesCard key={selected.id} book={selected} notes={overview.notes[selected.id] ?? []} today={today} />}
              <Card padding="none" className="flex flex-col gap-1 rounded-[14px] px-4.5 py-3.5">
                <div className="flex items-center justify-between gap-2 pb-1">
                  <h2 className="text-[15px] font-semibold text-ink">{t("Up next")}</h2>
                  <Link href="/habit-tracker/habits/library" className="text-[13px] font-semibold text-emerald hover:underline">
                    {t("All books")}
                  </Link>
                </div>
                {upNext.length === 0 ? (
                  <p className="py-2 text-small text-ink-muted">{t("Nothing waiting. Add the book you want to read next.")}</p>
                ) : (
                  upNext.map((book) => {
                    const palette = paletteFor(book.color);
                    const paused = isPaused(book);
                    return (
                      <div key={book.id} className="flex items-center gap-3 border-t border-divider py-2.5 first-of-type:border-t-0">
                        <span aria-hidden="true" className="h-9.5 w-6.5 shrink-0 rounded-[2px_5px_5px_2px] shadow-[inset_3px_0_0_rgba(0,0,0,0.18)]" style={{ background: palette.from }} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[14px] font-semibold text-ink">{book.title}</span>
                          <span className="truncate text-[12px] text-ink-muted">
                            {[book.author, paused ? t("page {page} of {total}", { page: count(book.pagesRead), total: count(book.totalPages) }) : t("{count} pages", { count: count(book.totalPages) })].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <Button variant="secondary" size="sm" disabled={busy.has(book.id) || isPending} onClick={() => start(book)} className="h-8 shrink-0 rounded-sm px-3 pointer-coarse:h-11">
                          {t(paused ? "Resume" : "Start")}
                        </Button>
                      </div>
                    );
                  })
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      <BookDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, editing: null })}
        editing={drawer.editing}
        reminders={reminders}
        onRemove={(book) => {
          setDrawer({ open: false, editing: null });
          setRemoving(book);
        }}
      />
      <GoalDialog open={goalOpen} onClose={() => setGoalOpen(false)} year={year} current={goalTarget} />
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} onConfirm={remove} isPending={isPending} danger title={t("Remove book")} description={removing ? t("Remove \"{name}\"? Your progress on it will be lost.", { name: removing.title }) : ""} confirmLabel={t("Remove")} />
    </PageFrame>
  );
}
