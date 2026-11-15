"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { monthLabel } from "@/components/modules/Customer/Budget/MonthSwitcher";
import { PeriodPicker } from "@/components/modules/Customer/Shared/PeriodPicker";
import LoadMore from "@/components/smartly/LoadMore";
import PageFrame from "@/components/smartly/PageFrame";
import type { BookPages, BooksOverview, BookYear } from "@/lib/customer/api";
import { dayText } from "@/lib/customer/habitDisplay";
import { monthName } from "@/lib/customer/insights";
import { LIBRARY_DASHBOARD_HREF, MY_BOOKS_HREF, READING_NOW_HREF } from "@/lib/customer/libraryBoard";
import { type BookShelf as Shelf, bookShelf, daysWithBook, finishedByMonth, periodFigures, progressPct, shelves } from "@/lib/customer/libraryDisplay";
import { type Period, periodHref, periodRange } from "@/lib/customer/period";
import { toDateInputValue } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { paletteFor } from "./bookPalette";
import { LB_CARD } from "./LibraryBits";

interface LibraryDashboardClientProps {
  overview: BooksOverview;
  bookYear: BookYear;
  pages: BookPages;
  period: Period;
  today: string;
}

type Tab = "all" | Shelf;
const STEP = 25;
const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reading", label: "Reading" },
  { value: "finished", label: "Finished" },
  { value: "want", label: "Want to read" },
  { value: "paused", label: "Stopped" },
];
const CHIP: Record<Shelf, { label: string; tone: string }> = {
  reading: { label: "Reading", tone: "bg-emerald-soft text-emerald" },
  finished: { label: "Finished", tone: "bg-success-soft text-tint-green-ink" },
  want: { label: "Want to read", tone: "bg-surface-sunken text-ink-soft" },
  paused: { label: "Stopped", tone: "bg-rose-soft text-rose" },
};
const ORDER: Record<Shelf, number> = { reading: 0, paused: 1, finished: 2, want: 3 };
// The most green books drawn over one month's bar; more show as a number.
const MAX_MARKS = 3;
// The board's table: the book takes what the other columns leave.
const COLUMNS = "grid-cols-[minmax(0,1fr)_162px_126px_183px_71px_216px]";

// My Library › Dashboard (the LibraryDashboard board): the period picked --
// a month, a year or the reader's own days -- in five figures, its year's
// pages month by month (a month a tap away), and every book with its dates,
// days and progress.
export function LibraryDashboardClient({ overview, bookYear, pages, period, today }: LibraryDashboardClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { books } = overview;
  const { year, months } = bookYear;
  const count = (n: number) => formatCount(n, fmt);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(STEP);
  const [isSwitching, startSwitch] = useTransition();

  const range = periodRange(period) as { dateFrom: string; dateTo: string };
  const figures = periodFigures(books, range.dateFrom, range.dateTo, pages.total, today);
  const readingNow = shelves(books).READING;
  const finishedMonths = finishedByMonth(books, year);
  const most = Math.max(1, ...months);
  const thisMonth = today.slice(0, 7);
  const goal = period.kind === "year" ? bookYear.goalTarget : null;
  const activeMonths = (bookYear.activeMonths ?? []).map((key) => ({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)), count: 1 }));
  const periodName =
    period.kind === "year" ? toLocaleDigits(String(period.year), fmt) : period.kind === "month" ? monthLabel(period.month, period.year, fmt) : t("this period");

  function pick(next: Period | { kind: "all" }) {
    if (next.kind === "all") return;
    startSwitch(() => router.push(periodHref(LIBRARY_DASHBOARD_HREF, {}, next, { kind: "year", year: Number(today.slice(0, 4)) }), { scroll: false }));
  }

  const names = figures.finished.map((book) => book.title);
  const kpis = [
    {
      label: t("Books finished in {period}", { period: periodName }),
      value: goal ? t("{done} of {total}", { done: count(figures.finished.length), total: count(goal) }) : count(figures.finished.length),
      sub: goal
        ? figures.finished.length >= goal
          ? `${t("Goal reached")} 🎉`
          : t("{count} to go for the goal", { count: count(goal - figures.finished.length) })
        : names.length
          ? names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${count(names.length - 2)}` : "")
          : t("None finished"),
    },
    { label: t("Pages read"), value: count(figures.pages), sub: figures.pages > 0 && figures.perDay === 0 ? t("Under one a day") : t("About {count} a day", { count: count(figures.perDay) }) },
    { label: t("Books started"), value: count(figures.started.length), sub: t("{count} stopped", { count: count(figures.stopped) }) },
    { label: t("Reading now"), value: count(readingNow.length), sub: readingNow.length ? readingNow.map((b) => b.title).join(", ") : t("Nothing being read") },
    { label: t("Days per book"), value: figures.daysPerBook === null ? "–" : t(figures.daysPerBook === 1 ? "{count} day" : "{count} days", { count: count(figures.daysPerBook) }), sub: t("Average to finish one") },
  ];

  const counts: Record<Tab, number> = { all: books.length, reading: 0, finished: 0, want: 0, paused: 0 };
  for (const book of books) counts[bookShelf(book)]++;
  const needle = query.trim().toLowerCase();
  const rows = books
    .filter((book) => (tab === "all" || bookShelf(book) === tab) && (!needle || `${book.title} ${book.author}`.toLowerCase().includes(needle)))
    .sort((a, b) => ORDER[bookShelf(a)] - ORDER[bookShelf(b)] || (b.finishedAt ?? b.startedAt ?? b.createdAt).localeCompare(a.finishedAt ?? a.startedAt ?? a.createdAt));
  const visible = rows.slice(0, shown);

  const full = (iso: string | null) => (iso ? dayText(toDateInputValue(iso), fmt, "dayMonthYY") : "–");

  return (
    <PageFrame className="gap-3.5 leading-[normal] md:pt-5 md:pb-5.5 xl:min-h-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-0.75">
          <h1 className="text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Library dashboard")}</h1>
          <p className="text-[14px] text-ink-muted">{t("Every book you started, finished or want to read, month by month.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <PeriodPicker period={period} today={today} activeMonths={activeMonths} defaultPeriod={{ kind: "year", year: Number(today.slice(0, 4)) }} onPick={pick} busy={isSwitching} />
          <Link href={READING_NOW_HREF} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-primary px-4 text-[14px] font-semibold text-on-action hover:bg-emerald-hover">
            <span aria-hidden="true">📖</span>
            {t("Reading now")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="flex min-w-0 flex-col gap-0.5 rounded-[12px] border border-line bg-surface px-4 py-2.75 shadow-card">
            <span className="truncate text-[12.5px] text-ink-muted">{kpi.label}</span>
            <span className="truncate text-[22px] font-bold text-ink tabular-nums">{kpi.value}</span>
            <span className="truncate text-[12px] text-ink-muted" title={kpi.sub}>
              {kpi.sub}
            </span>
          </div>
        ))}
      </div>

      <section aria-labelledby="mc-title" className={cn(LB_CARD, "flex h-67.5 flex-col gap-2 px-4 py-3.5")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="mc-title" className="text-[15px] font-semibold text-ink">
            {t("Pages read each month")}
          </h2>
          <span className="text-[12px] text-ink-muted">📗 = {t("books finished · tap a month")}</span>
        </div>
        <div role="group" aria-label={t("Pages read each month in {year}", { year: toLocaleDigits(String(year), fmt) })} className="flex min-h-0 flex-1 items-end gap-2 border-b border-line max-sm:gap-1">
          {months.map((pagesRead, i) => {
            const key = `${year}-${String(i + 1).padStart(2, "0")}`;
            const monthFrom = `${key}-01`;
            const monthTo = `${key}-31`;
            const inPeriod = monthFrom <= range.dateTo && monthTo >= range.dateFrom;
            const marked = period.kind !== "year";
            const on = marked && inPeriod;
            const future = key > thisMonth;
            const height = pagesRead ? Math.max(4, Math.round((pagesRead / most) * 78)) : 0;
            const finishedHere = finishedMonths[i];
            const label = t("{month}: {pages} pages, {finished} finished", { month: monthName(key, fmt), pages: count(pagesRead), finished: count(finishedHere) });
            return (
              <button
                key={key}
                type="button"
                disabled={future}
                onClick={() => pick({ kind: "month", month: i + 1, year })}
                aria-label={label}
                aria-pressed={period.kind === "month" && period.month === i + 1 && period.year === year}
                title={label}
                className={cn("flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-0.75 rounded-t-[8px] disabled:cursor-default", on ? "bg-emerald-soft" : !future && "hover:bg-hover")}
              >
                <span className="flex h-3.5 items-center text-[11px] leading-none font-bold text-emerald">
                  {finishedHere > 0 && "📗".repeat(Math.min(finishedHere, MAX_MARKS))}
                  {finishedHere > MAX_MARKS && `+${count(finishedHere - MAX_MARKS)}`}
                </span>
                {pagesRead > 0 && height < 22 && <span className="text-[11.5px] font-bold text-ink-soft tabular-nums max-sm:hidden">{count(pagesRead)}</span>}
                <span
                  className={cn("box-border flex w-[62%] max-w-16 flex-col items-center gap-px overflow-hidden rounded-t-[7px] pt-1.75", !marked || on ? "bg-primary" : "bg-primary/40")}
                  style={{ height: pagesRead ? `${height}%` : "2px" }}
                >
                  {height >= 22 && (
                    <>
                      <span className="text-[13px] leading-[1.1] font-bold text-white tabular-nums max-sm:text-[10px]">{count(pagesRead)}</span>
                      <span className="text-[10px] leading-[1.1] font-medium text-white/80 max-sm:hidden">{t("pages")}</span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 max-sm:gap-1">
          {months.map((_, i) => {
            const key = `${year}-${String(i + 1).padStart(2, "0")}`;
            const on = period.kind !== "year" && `${key}-01` <= range.dateTo && `${key}-31` >= range.dateFrom;
            return (
              <span key={key} className={cn("min-w-0 flex-1 truncate text-center text-[11.5px]", on ? "font-bold text-emerald" : "font-medium text-ink-muted")}>
                {monthName(key, fmt, "short")}
              </span>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="bk-title" className={cn(LB_CARD, "flex flex-1 flex-col gap-2.5 px-4 pt-3 pb-1.5")}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="bk-title" className="text-[15px] font-semibold text-ink">
            {t("All books")}
          </h2>
          <div role="tablist" className="flex flex-wrap gap-0.5 rounded-[9px] bg-surface-sunken p-0.75">
            {TABS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={tab === option.value}
                onClick={() => {
                  setTab(option.value);
                  setShown(STEP);
                }}
                className={cn("h-7 rounded-[7px] px-2.5 text-[12.5px] font-semibold whitespace-nowrap", tab === option.value ? "bg-surface text-ink shadow-[0_1px_2px_rgba(15,23,42,0.12)]" : "text-ink-muted hover:text-ink")}
              >
                {t(option.label)} · {count(counts[option.value])}
              </button>
            ))}
          </div>
          <span className="flex-1" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(STEP);
            }}
            placeholder={t("Search title or author")}
            aria-label={t("Search books")}
            className="h-8.5 w-60 rounded-[8px] border border-input bg-surface px-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-emerald focus:focus-halo max-md:w-full"
          />
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[860px] text-[13px]">
            <div className={cn("grid items-center gap-x-0 border-b border-line text-[12px] font-semibold text-ink-muted", COLUMNS)}>
              <span className="px-2 py-1.5">{t("Book")}</span>
              <span className="px-2 py-1.5">{t("Status")}</span>
              <span className="px-2 py-1.5">{t("Started")}</span>
              <span className="px-2 py-1.5">{t("Finished")}</span>
              <span className="px-2 py-1.5 text-right">{t("Days")}</span>
              <span className="px-2 py-1.5">{t("Progress")}</span>
            </div>
            {rows.length === 0 ? (
              <div className="p-6 text-center text-[13.5px] text-ink-muted">{books.length === 0 ? t("No books yet.") : t("No books match.")}</div>
            ) : (
              visible.map((book) => {
                const shelf = bookShelf(book);
                const days = daysWithBook(book, today);
                const color = paletteFor(book.color).from;
                return (
                  <div key={book.id} className={cn("grid items-center border-b border-divider", COLUMNS)}>
                    <span className="flex min-w-0 items-center gap-2.5 p-2">
                      <span aria-hidden="true" className="h-5.5 w-4 shrink-0 rounded-[2px_4px_4px_2px]" style={{ background: color }} />
                      <span className="flex min-w-0 flex-col">
                        <Link href={`${MY_BOOKS_HREF}/${book.id}`} className="truncate font-semibold text-ink hover:underline">
                          {book.title}
                        </Link>
                        <span className="truncate text-[12px] text-ink-muted">{book.author}</span>
                      </span>
                    </span>
                    <span className="p-2">
                      <span className={cn("inline-flex h-5.5 items-center rounded-full px-2 text-[11.5px] font-bold whitespace-nowrap", CHIP[shelf].tone)}>{t(CHIP[shelf].label)}</span>
                    </span>
                    <span className="p-2 whitespace-nowrap text-ink-2">{book.startedAt ? full(book.startedAt) : "–"}</span>
                    <span className="p-2 whitespace-nowrap text-ink-2">{shelf === "paused" ? t("stopped at p. {page}", { page: count(book.pagesRead) }) : full(book.finishedAt)}</span>
                    <span className="p-2 text-right tabular-nums">{days === null ? "–" : count(days)}</span>
                    <span className="flex min-w-0 items-center gap-2 p-2">
                      {shelf === "want" ? (
                        <span className="text-[12px] text-ink-soft">{t("{count} pages", { count: count(book.totalPages) })}</span>
                      ) : (
                        <>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                            <span className="block h-full" style={{ width: `${progressPct(book)}%`, background: color }} />
                          </span>
                          <span className="text-[12px] whitespace-nowrap text-ink-soft tabular-nums">
                            {count(book.pagesRead)} / {count(book.totalPages)}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
        {rows.length > STEP && (
          <div className="py-2">
            <LoadMore shown={Math.min(shown, rows.length)} total={rows.length} step={STEP} onMore={() => setShown((value) => value + STEP)} onLess={shown >= rows.length ? () => setShown(STEP) : undefined} />
          </div>
        )}
      </section>

    </PageFrame>
  );
}
