"use client";

import { Printer, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PeriodPicker } from "@/components/modules/Customer/Shared/PeriodPicker";
import Card from "@/components/smartly/Card";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The month report the DailyHabitsReport and NamazDashboard boards share:
// a header with the month picker and print, four figures, the sheet of
// days, each row's share, the weeks, what stands out and the other months.

export interface MonthOption {
  key: string;
  // "October 2026".
  label: string;
  pct: number | null;
  href: string;
}

// The month list's percent: forest when good, amber below 80%.
const pctTone = (pct: number | null) => (pct === null ? "text-ink-faint" : pct >= 80 ? "text-emerald" : "text-warning-ink");

// The header: the month and its line, then the board's one period picker
// (months only; months the page has nothing for are greyed out), the
// page's own action and Print.
export function ReportHeader({ title, current, chip, subtitle, months, selected, today, onPrint, action }: { title: string; current: boolean; chip?: React.ReactNode; subtitle: string; months: MonthOption[]; selected: string; today: string; onPrint: () => void; action?: React.ReactNode }) {
  const { t } = useLocale();
  const router = useRouter();
  const ym = (key: string) => ({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) });
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-0.75">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-page-title text-ink">{title}</h1>
          {current && <span className="inline-flex h-6.5 items-center rounded-full bg-emerald-soft px-2.5 text-[12.5px] font-semibold text-emerald">{t("This month")}</span>}
          {chip}
        </div>
        <p className="text-body text-ink-muted">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 print:hidden">
        <PeriodPicker
          period={{ kind: "month", ...ym(selected) }}
          defaultPeriod={{ kind: "month", ...ym(today.slice(0, 7)) }}
          today={today}
          activeMonths={months.map((month) => ({ ...ym(month.key), count: 1 }))}
          modes={["month"]}
          onPick={(picked) => {
            if (picked.kind !== "month") return;
            const key = `${picked.year}-${String(picked.month).padStart(2, "0")}`;
            const href = months.find((month) => month.key === key)?.href;
            if (href) router.push(href);
          }}
        />
        {action}
        <button type="button" onClick={onPrint} aria-label={t("Print this month")} title={t("Print this month")} className="flex size-10 items-center justify-center rounded-sm border border-input bg-surface text-ink-2 hover:bg-surface-sunken pointer-coarse:size-11">
          <Printer className="size-4.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export interface ReportStat {
  label: string;
  value: string;
  sub: string;
  tone?: "bad" | "good";
}

export function ReportStats({ stats }: { stats: ReportStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} padding="none" className="flex min-w-0 flex-col gap-0.5 rounded-[12px] px-4 py-2.75">
          <span className="text-[12.5px] font-medium text-ink-muted">{stat.label}</span>
          <span className={cn("text-[22px] font-bold tracking-[-0.02em] tabular-nums", stat.tone === "bad" ? "text-expense" : stat.tone === "good" ? "text-income" : "text-ink")}>{stat.value}</span>
          <span className="text-caption text-ink-muted">{stat.sub}</span>
        </Card>
      ))}
    </div>
  );
}

export interface SheetColumn {
  key: string;
  // "1", "Fr": the day and its weekday, in the reader's words.
  day: string;
  weekday: string;
  title: string;
  today?: boolean;
  friday?: boolean;
}

export interface SheetRow {
  key: string;
  name: string;
  count: string;
  cells: React.ReactNode[];
}

export interface SheetTotal {
  text: string;
  title: string;
  tone: "full" | "good" | "low";
}

// The sheet: a row per habit (or prayer), a column per day, and how many
// were done each day under it. Wider than a phone, it scrolls sideways.
export function ReportSheet({ title, label, legend, hint, columns, rows, totalsLabel, totals }: { title: string; label: string; legend: { label: string; swatch: React.ReactNode }[]; hint?: string; columns: SheetColumn[]; rows: SheetRow[]; totalsLabel: string; totals: (SheetTotal | null)[] }) {
  return (
    <section aria-labelledby="report-sheet-title" className="flex flex-col gap-2.5 rounded-[12px] border border-line-card bg-surface px-4.5 pt-3 pb-3.5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="report-sheet-title" className="text-[15px] font-semibold text-ink">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-caption text-ink-2">
          {legend.map((item) => (
            <span key={item.label} className="flex items-center gap-1.25">
              {item.swatch}
              {item.label}
            </span>
          ))}
          {hint && <span className="border-l border-line pl-3 text-ink-muted print:hidden">{hint}</span>}
        </div>
      </div>
      <div role="grid" aria-label={label} className="flex flex-col gap-0.75 overflow-x-auto pb-1">
        <div role="row" className="mb-0.5 flex items-end gap-0.75">
          <span className="w-37.5 shrink-0" />
          {columns.map((column) => (
            <span
              key={column.key}
              role="columnheader"
              title={column.title}
              className={cn(
                "flex w-6.5 shrink-0 flex-col items-center rounded-[6px] py-0.5 text-[11.5px] font-semibold tabular-nums",
                column.today ? "bg-emerald text-white dark:text-on-action" : column.friday ? "bg-warning-soft text-warning-ink" : "text-ink-muted",
              )}
            >
              <span>{column.day}</span>
              <span className="text-[9px] opacity-80">{column.weekday}</span>
            </span>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.key} role="row" className="flex items-center gap-0.75">
            <span role="rowheader" className="flex w-37.5 shrink-0 items-baseline justify-between gap-2 pr-2">
              <span className="truncate text-small font-semibold text-ink">{row.name}</span>
              <span className="text-[11.5px] text-ink-muted tabular-nums">{row.count}</span>
            </span>
            {row.cells}
          </div>
        ))}
        <div role="row" className="mt-0.75 flex items-center gap-0.75 border-t border-dashed border-line pt-1.5">
          <span role="rowheader" className="w-37.5 shrink-0 text-caption font-semibold text-ink-soft">
            {totalsLabel}
          </span>
          {totals.map((total, index) => (
            <span
              key={columns[index]?.key ?? index}
              role="gridcell"
              title={total?.title}
              className={cn(
                "flex h-5 w-6.5 shrink-0 items-center justify-center rounded-[5px] text-[9.5px] font-bold tabular-nums",
                !total ? "" : total.tone === "full" ? "bg-emerald-soft text-emerald" : total.tone === "good" ? "bg-surface-sunken text-ink-2" : "bg-expense-soft text-expense",
              )}
            >
              {total?.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export interface EachRow {
  key: string;
  name: string;
  tag?: { text: string; tone: "good" | "bad" };
  // The bar's parts, left to right, each a share of 100 and its colour.
  segments: { pct: number; className?: string; style?: React.CSSProperties }[];
  value: string;
  total: string;
  title: string;
}

export function EachBars({ title, rows, note }: { title: string; rows: EachRow[]; note: string }) {
  return (
    <Card padding="none" className="flex min-w-0 flex-col gap-2 rounded-[12px] px-4 py-3">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      <div className="flex flex-col gap-1.75">
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[130px_minmax(0,1fr)_54px] items-center gap-2.5">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-small font-semibold text-ink">{row.name}</span>
              {row.tag && <span className={cn("text-[10.5px] font-bold", row.tag.tone === "good" ? "text-income" : "text-expense")}>{row.tag.text}</span>}
            </span>
            <span title={row.title} className="flex h-2.5 overflow-hidden rounded-full bg-surface-sunken">
              {row.segments.map((segment, index) => (
                <span key={index} className={segment.className} style={{ width: `${segment.pct}%`, ...segment.style }} />
              ))}
            </span>
            <span className="text-right text-[12.5px] font-bold text-ink tabular-nums">
              {row.value}
              <span className="font-medium text-ink-muted">/{row.total}</span>
            </span>
          </div>
        ))}
      </div>
      <span className="mt-auto pt-1 text-[11.5px] text-ink-muted">{note}</span>
    </Card>
  );
}

export function WeekBars({ title, label, weeks }: { title: string; label: string; weeks: { key: string; label: string; pct: number | null; title: string }[] }) {
  const { fmt } = useLocale();
  return (
    <Card padding="none" className="flex min-w-0 flex-col gap-2 rounded-[12px] px-4 py-3">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      <div role="img" aria-label={label} className="flex min-h-37 flex-1 items-end gap-2.5 border-b border-line pb-0.5">
        {weeks.map((week) => (
          <span key={week.key} title={week.title} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11.5px] font-bold text-ink-2 tabular-nums">{week.pct === null ? "—" : `${formatCount(week.pct, fmt)}%`}</span>
            <span
              className={cn("w-full max-w-8.5 rounded-t-[6px]", week.pct === null ? "bg-line" : week.pct >= 85 ? "bg-emerald" : week.pct >= 70 ? "bg-emerald/45" : "bg-expense-line")}
              style={{ height: week.pct === null ? 3 : `${Math.max(4, Math.round(week.pct * 0.9))}%` }}
            />
          </span>
        ))}
      </div>
      <div className="flex gap-2.5">
        {weeks.map((week) => (
          <span key={week.key} className="flex-1 text-center text-[11px] text-ink-muted tabular-nums">
            {week.label}
          </span>
        ))}
      </div>
    </Card>
  );
}

export interface StandOut {
  key: string;
  icon: LucideIcon;
  tone: "good" | "bad" | "warn" | "streak" | "info";
  text: string;
}

const STAND_TONE: Record<StandOut["tone"], string> = {
  good: "bg-income-soft text-income",
  bad: "bg-expense-soft text-expense",
  warn: "bg-warning-soft text-warning-ink",
  streak: "bg-orange-soft text-orange",
  info: "bg-emerald-soft text-emerald",
};

export function StandsOut({ title, items, empty }: { title: string; items: StandOut[]; empty: string }) {
  return (
    <Card padding="none" className="flex min-w-0 flex-col gap-2 rounded-[12px] px-4 py-3">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {items.length === 0 ? (
        <p className="text-small text-ink-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.25">
          {items.map((item) => (
            <li key={item.key} className="flex gap-2.25 text-[12.5px] leading-[1.4] text-ink-2">
              <span className={cn("flex size-5.5 shrink-0 items-center justify-center rounded-[6px]", STAND_TONE[item.tone])}>
                <item.icon className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
              </span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function MonthStrip({ title, months, selected }: { title: string; months: MonthOption[]; selected: string }) {
  const { fmt } = useLocale();
  return (
    <section aria-labelledby="report-months-title" className="flex flex-col gap-2 print:hidden">
      <h2 id="report-months-title" className="text-[15px] font-semibold text-ink">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {months.map((month) => {
          const on = month.key === selected;
          return (
            <Link
              key={month.key}
              href={month.href}
              aria-current={on ? "page" : undefined}
              className={cn("flex flex-col gap-1.5 rounded-field border-[1.5px] px-3 py-2.5 transition-colors", on ? "border-emerald bg-emerald-soft" : "border-line bg-surface hover:border-line-strong")}
            >
              <span className="flex items-baseline justify-between gap-1.5">
                <span className="truncate text-small font-semibold text-ink">{month.label}</span>
                <span className={cn("text-small font-bold tabular-nums", pctTone(month.pct))}>{month.pct === null ? "—" : `${formatCount(month.pct, fmt)}%`}</span>
              </span>
              <span className="h-1.25 overflow-hidden rounded-full bg-surface-sunken">
                <span className={cn("block h-full", month.pct === null ? "bg-line" : month.pct >= 80 ? "bg-emerald" : "bg-warning-fill")} style={{ width: `${month.pct ?? 0}%` }} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
