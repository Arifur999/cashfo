"use client";

import { BookOpen, MoreVertical, Pencil, Play, RotateCcw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import LoadMore from "@/components/smartly/LoadMore";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Book, BookYear, BooksOverview, Reminder } from "@/lib/customer/api";
import { deleteBookAction, updateBookAction } from "@/lib/customer/bookActions";
import { actionError, dayText } from "@/lib/customer/habitDisplay";
import { monthName } from "@/lib/customer/insights";
import { type BookShelf, bookShelf, daysWithBook, finishedByMonth, goalPace, monthBooks, paceSentence, progressPct, shelves, yearFigures } from "@/lib/customer/libraryDisplay";
import { toDateInputValue } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { useReminderBook } from "../Reminders";
import { BookDrawer } from "./BookDrawer";
import { paletteFor } from "./bookPalette";

interface LibraryDashboardClientProps {
  overview: BooksOverview;
  bookYear: BookYear;
  today: string;
  // Saved reminders (each book's is set in its drawer); null when they couldn't be read.
  reminders: Reminder[] | null;
}

type Tab = "all" | BookShelf;

const COLUMNS = "md:grid-cols-[minmax(0,1.6fr)_120px_110px_130px_70px_minmax(0,1fr)_40px]";
const STEP = 25;
const SHELF_CHIP: Record<BookShelf, { label: string; tone: string }> = {
  reading: { label: "Reading", tone: "bg-mint-50 text-brand-ink" },
  finished: { label: "Finished", tone: "bg-income-soft text-income" },
  want: { label: "Want to read", tone: "bg-surface-sunken text-ink-soft" },
  paused: { label: "Paused", tone: "bg-warning-soft text-warning-ink" },
};
const SHELF_ORDER: Record<BookShelf, number> = { reading: 0, paused: 1, finished: 2, want: 3 };
// The most books drawn over one month's bar; more show as a number.
const MAX_MARKS = 3;

// My Library › Dashboard (the LibraryDashboard board): one year's books and
// pages, each month as a bar to open, that month's books, and every book
// with its dates, days and progress.
export function LibraryDashboardClient({ overview, bookYear, today, reminders: savedReminders }: LibraryDashboardClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const reminders = useReminderBook(savedReminders);
  const { books } = overview;
  const { year, months } = bookYear;
  const thisYear = Number(today.slice(0, 4));
  const thisMonth = Number(today.slice(5, 7));
  // The months a year has had so far.
  const lastMonth = year === thisYear ? thisMonth : year < thisYear ? 12 : 0;
  const [picked, setPicked] = useState<number | null>(null);
  const month = picked ?? Math.max(1, lastMonth);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(STEP);
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Book | null }>({ open: false, editing: null });
  const [removing, setRemoving] = useState<Book | null>(null);
  const [isPending, startTransition] = useTransition();
  const count = (n: number) => formatCount(n, fmt);
  const yearText = (value: number) => toLocaleDigits(String(value), fmt);
  const short = (iso: string | null) => (iso ? dayText(toDateInputValue(iso), fmt, "dayMonth") : "—");
  const full = (iso: string | null) => (iso ? dayText(toDateInputValue(iso), fmt, "dayMonthYear") : "—");

  const figures = yearFigures(books, months, year, today);
  const finishedMonths = finishedByMonth(books, year);
  const most = Math.max(1, ...months);
  const goal = bookYear.goalTarget;
  const readingNow = shelves(books).READING;
  // How often a book has to be finished to reach this year's goal in time.
  const pace = goal && year === thisYear ? goalPace(books, year, goal, today).weeksPerBook : null;
  const detail = monthBooks(books, bookYear.bookMonths, year, month);

  const kpis = [
    {
      label: t("Books finished in {year}", { year: yearText(year) }),
      value: goal ? t("{done} of {total}", { done: count(figures.finished), total: count(goal) }) : count(figures.finished),
      sub: goal ? (figures.finished >= goal ? t("Goal reached") : t("{count} to go for the goal", { count: count(goal - figures.finished) })) : t("No goal set for this year"),
      hint: pace ? paceSentence(pace, t, fmt) : undefined,
    },
    { label: t("Pages read"), value: count(figures.pages), sub: figures.pages > 0 && figures.perDay === 0 ? t("Under one a day") : t("About {count} a day", { count: count(figures.perDay) }) },
    { label: t("Books started"), value: count(figures.started), sub: t("{count} paused", { count: count(figures.paused) }) },
    { label: t("Reading now"), value: count(readingNow.length), sub: readingNow.length ? readingNow.map((b) => b.title).join(", ") : t("Nothing being read") },
    { label: t("Days per book"), value: figures.daysPerBook === null ? "—" : t(figures.daysPerBook === 1 ? "{count} day" : "{count} days", { count: count(figures.daysPerBook) }), sub: t("Average to finish one") },
  ];

  // Every book on the list, the tab's and the search's.
  const counts: Record<Tab, number> = { all: books.length, reading: 0, finished: 0, want: 0, paused: 0 };
  for (const book of books) counts[bookShelf(book)]++;
  const needle = query.trim().toLowerCase();
  const rows = books
    .filter((book) => (tab === "all" || bookShelf(book) === tab) && (!needle || `${book.title} ${book.author}`.toLowerCase().includes(needle)))
    // Being read first, then paused, finished (latest first) and waiting.
    .sort((a, b) => SHELF_ORDER[bookShelf(a)] - SHELF_ORDER[bookShelf(b)] || (b.finishedAt ?? b.startedAt ?? b.createdAt).localeCompare(a.finishedAt ?? a.startedAt ?? a.createdAt));
  const visible = rows.slice(0, shown);

  function goYear(next: string) {
    setPicked(null);
    router.push(`/habit-tracker/habits/library?year=${next}`, { scroll: false });
  }

  function move(book: Book, input: { status?: "READING"; paused?: boolean }, message: string) {
    startTransition(async () => {
      const result = await updateBookAction(book.id, input);
      if (result.success) toast.success(t(message, { title: book.title }));
      else toast.error(actionError(result.message, "Failed to update", t, fmt));
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

  const spine = (book: Book, className?: string) => <span aria-hidden="true" className={cn("h-9.5 w-6.5 shrink-0 rounded-[2px_5px_5px_2px] shadow-[inset_3px_0_0_rgba(0,0,0,0.18)]", className)} style={{ background: paletteFor(book.color).from }} />;

  const groups = [
    { key: "finished", label: t("Finished"), tone: "text-income", items: detail.finished.map((book) => ({ book, note: [short(book.finishedAt), t(daysWithBook(book, today) === 1 ? "{count} day" : "{count} days", { count: count(daysWithBook(book, today) ?? 0) })].join(" · ") })) },
    { key: "started", label: t("Started"), tone: "text-emerald", items: detail.started.map((book) => ({ book, note: short(book.startedAt) })) },
    { key: "read", label: t("Read this month"), tone: "text-ink-soft", items: detail.read.map(({ book, pages }) => ({ book, note: t(pages === 1 ? "{count} page" : "{count} pages", { count: count(pages) }) })) },
  ];

  return (
    <PageFrame className="gap-3.5 md:pt-6">
      <PageHeader
        title={t("Library dashboard")}
        description={t("Every book you started, finished or want to read, month by month.")}
        actions={
          <>
            {bookYear.years.length <= 4 ? (
              <SegmentedControl label={t("Year")} variant="pill" value={String(year)} onChange={goYear} options={bookYear.years.map((value) => ({ value: String(value), label: yearText(value) }))} />
            ) : (
              <NativeSelect size="sm" aria-label={t("Year")} value={String(year)} onChange={(event) => goYear(event.target.value)} frameClassName="w-28" className="h-10">
                {bookYear.years.map((value) => (
                  <option key={value} value={value}>
                    {yearText(value)}
                  </option>
                ))}
              </NativeSelect>
            )}
            <Button asChild className="rounded-sm">
              <Link href="/habit-tracker/habits?category=Book">
                <BookOpen />
                {t("Reading now")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label} padding="none" title={"hint" in kpi ? kpi.hint : undefined} className="flex min-w-0 flex-col gap-0.5 rounded-md px-4 py-2.75">
            <span className="truncate text-[12.5px] text-ink-muted">{kpi.label}</span>
            <span className="truncate text-[22px] leading-tight font-bold text-ink tabular-nums">{kpi.value}</span>
            <span className="truncate text-caption text-ink-muted" title={kpi.sub}>
              {kpi.sub}
            </span>
          </Card>
        ))}
      </div>

      <div className="grid items-stretch gap-3.5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card padding="none" className="flex min-w-0 flex-col gap-2 rounded-[14px] px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-ink">{t("Pages read each month")}</h2>
            <span className="flex items-center gap-1.5 text-caption text-ink-muted">
              <span aria-hidden="true" className="size-2.5 rounded-[2px] bg-income" />
              {t("books finished · tap a month")}
            </span>
          </div>
          <div role="group" aria-label={t("Pages read each month in {year}", { year: yearText(year) })} className="flex h-48 items-stretch gap-1.5 border-b border-line sm:gap-2">
            {months.map((pages, i) => {
              const m = i + 1;
              const on = m === month;
              const future = m > lastMonth;
              const finishedCount = finishedMonths[i];
              const label = t("{month}: {pages} pages, {finished} finished", { month: `${monthName(`${year}-${String(m).padStart(2, "0")}`, fmt)}`, pages: count(pages), finished: count(finishedCount) });
              return (
                <button key={m} type="button" disabled={future} onClick={() => setPicked(m)} aria-pressed={on} aria-label={label} title={label} className={cn("flex min-w-0 flex-1 flex-col items-center justify-end gap-0.75 rounded-t-sm transition-colors disabled:cursor-default", on ? "bg-mint-50" : !future && "hover:bg-surface-sunken")}>
                  <span className="flex h-3.5 items-center gap-px">
                    {Array.from({ length: Math.min(finishedCount, MAX_MARKS) }, (_, k) => (
                      <span key={k} aria-hidden="true" className="h-2.5 w-1.5 rounded-[1px] bg-income" />
                    ))}
                    {finishedCount > MAX_MARKS && <span className="text-[9.5px] font-bold text-income">+{count(finishedCount - MAX_MARKS)}</span>}
                  </span>
                  <span className="text-[10.5px] font-semibold text-ink-2 tabular-nums max-sm:hidden">{pages > 0 ? count(pages) : ""}</span>
                  <span className={cn("w-[70%] rounded-t-[5px]", on ? "bg-emerald" : "bg-emerald/45")} style={{ height: pages > 0 ? `${Math.max(4, Math.round((pages / most) * 70))}%` : "2px" }} />
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            {months.map((_, i) => (
              <span key={i} className={cn("min-w-0 flex-1 truncate text-center text-[11.5px]", i + 1 === month ? "font-bold text-emerald" : "font-medium text-ink-muted")}>
                {monthName(`${year}-${String(i + 1).padStart(2, "0")}`, fmt, "short")}
              </span>
            ))}
          </div>
        </Card>

        <Card padding="none" className="flex min-w-0 flex-col gap-2.5 rounded-[14px] px-4 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-ink">{monthName(`${year}-${String(month).padStart(2, "0")}`, fmt, "long", true)}</h2>
            <span className="text-[13px] font-bold text-emerald tabular-nums">{t(months[month - 1] === 1 ? "{count} page" : "{count} pages", { count: count(months[month - 1] ?? 0) })}</span>
          </div>
          {lastMonth === 0 ? (
            <p className="text-small text-ink-muted">{t("This year hasn't begun yet.")}</p>
          ) : (
            groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-1.5">
                <span className={cn("text-[12px] font-bold tracking-[0.02em]", group.tone)}>
                  {group.label} · {count(group.items.length)}
                </span>
                {group.items.length === 0 ? (
                  <span className="text-[12.5px] text-ink-faint">{t("None")}</span>
                ) : (
                  group.items.map(({ book, note }) => (
                    <span key={book.id} className="flex min-w-0 items-center gap-2 text-[13px]">
                      <span aria-hidden="true" className="h-3.5 w-2.5 shrink-0 rounded-[1px_3px_3px_1px]" style={{ background: paletteFor(book.color).from }} />
                      <b className="min-w-0 truncate font-semibold text-ink">{book.title}</b>
                      <span className="shrink-0 text-ink-muted">{note}</span>
                    </span>
                  ))
                )}
              </div>
            ))
          )}
        </Card>
      </div>

      <ListCard
        label={t("All books")}
        className="rounded-[14px]"
        header={
          <div className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-3 md:px-5">
            <h2 className="text-[15px] font-semibold text-ink">{t("All books")}</h2>
            <SegmentedControl
              label={t("Show")}
              variant="pill"
              value={tab}
              onChange={(value) => {
                setTab(value);
                setShown(STEP);
              }}
              options={(["all", "reading", "finished", "want", "paused"] as Tab[]).map((value) => ({ value, label: `${t(value === "all" ? "All" : SHELF_CHIP[value].label)} · ${count(counts[value])}` }))}
            />
            <Input
              size="sm"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShown(STEP);
              }}
              leading={<Search />}
              placeholder={t("Search title or author")}
              aria-label={t("Search books")}
              frameClassName="ml-auto h-9.5 w-60 max-md:ml-0 max-md:w-full"
            />
          </div>
        }
        footer={
          rows.length > STEP && (
            <ListFooter>
              <LoadMore shown={Math.min(shown, rows.length)} total={rows.length} step={STEP} onMore={() => setShown((value) => value + STEP)} onLess={shown >= rows.length ? () => setShown(STEP) : undefined} />
            </ListFooter>
          )
        }
      >
        {rows.length === 0 ? (
          <ListEmpty title={books.length === 0 ? t("No books yet.") : t("No books match.")} />
        ) : (
          <>
            <ListHead columns={COLUMNS}>
              <ListHeadCell>{t("Book")}</ListHeadCell>
              <ListHeadCell>{t("Status")}</ListHeadCell>
              <ListHeadCell>{t("Started")}</ListHeadCell>
              <ListHeadCell>{t("Finished")}</ListHeadCell>
              <ListHeadCell align="end">{t("Days")}</ListHeadCell>
              <ListHeadCell>{t("Progress")}</ListHeadCell>
              <ListHeadCell>
                <span className="sr-only">{t("Actions")}</span>
              </ListHeadCell>
            </ListHead>
            {visible.map((book) => {
              const shelf = bookShelf(book);
              const days = daysWithBook(book, today);
              return (
                <ListRow key={book.id} columns={COLUMNS} className="min-h-15 gap-x-4 md:px-5">
                  <ListCell className="flex min-w-0 items-center gap-3">
                    {spine(book)}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-body font-semibold text-ink">{book.title}</span>
                      <span className="truncate text-[12.5px] text-ink-muted">{book.author}</span>
                    </span>
                  </ListCell>
                  <ListCell>
                    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-bold whitespace-nowrap", SHELF_CHIP[shelf].tone)}>{t(SHELF_CHIP[shelf].label)}</span>
                  </ListCell>
                  <ListCell className="text-small text-ink-2 max-md:hidden">{full(book.startedAt)}</ListCell>
                  <ListCell className="text-small text-ink-2 max-md:hidden">{shelf === "paused" ? t("paused at p. {page}", { page: count(book.pagesRead) }) : full(book.finishedAt)}</ListCell>
                  <ListCell align="end" className="text-small text-ink-2 tabular-nums max-md:hidden">
                    {days === null ? "—" : count(days)}
                  </ListCell>
                  <ListCell className="flex min-w-0 items-center gap-2.5">
                    {shelf === "want" ? (
                      <span className="text-[12.5px] text-ink-muted">{t("{count} pages", { count: count(book.totalPages) })}</span>
                    ) : (
                      <>
                        <span className="block h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                          <span className={cn("block h-full rounded-full", shelf === "finished" ? "bg-income" : shelf === "paused" ? "bg-warning-fill" : "bg-emerald")} style={{ width: `${progressPct(book)}%` }} />
                        </span>
                        <span className="text-[12.5px] whitespace-nowrap text-ink-soft tabular-nums">
                          {count(book.pagesRead)} / {count(book.totalPages)}
                        </span>
                      </>
                    )}
                  </ListCell>
                  <ListCell align="end">
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label={t("More for {name}", { name: book.title })} className="flex size-8 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
                        <MoreVertical className="size-4.5" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-md border border-line bg-surface p-1 shadow-overlay ring-0">
                        {shelf === "want" && (
                          <DropdownMenuItem onSelect={() => move(book, { status: "READING" }, "Now reading {title}")} className="rounded-sm px-3 py-2 text-body text-ink focus:bg-surface-sunken pointer-coarse:min-h-11">
                            <Play className="size-4" aria-hidden="true" />
                            {t("Start reading")}
                          </DropdownMenuItem>
                        )}
                        {shelf === "paused" && (
                          <DropdownMenuItem onSelect={() => move(book, { paused: false }, "Now reading {title}")} className="rounded-sm px-3 py-2 text-body text-ink focus:bg-surface-sunken pointer-coarse:min-h-11">
                            <Play className="size-4" aria-hidden="true" />
                            {t("Resume")}
                          </DropdownMenuItem>
                        )}
                        {shelf === "finished" && (
                          <DropdownMenuItem onSelect={() => move(book, { status: "READING" }, "Reading {title} again")} className="rounded-sm px-3 py-2 text-body text-ink focus:bg-surface-sunken pointer-coarse:min-h-11">
                            <RotateCcw className="size-4" aria-hidden="true" />
                            {t("Read again")}
                          </DropdownMenuItem>
                        )}
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
                  </ListCell>
                </ListRow>
              );
            })}
          </>
        )}
      </ListCard>

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
      <ConfirmDialog open={removing !== null} onClose={() => !isPending && setRemoving(null)} onConfirm={remove} isPending={isPending} danger title={t("Remove book")} description={removing ? t("Remove \"{name}\"? Your progress on it will be lost.", { name: removing.title }) : ""} confirmLabel={t("Remove")} />
    </PageFrame>
  );
}
