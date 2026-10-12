"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { TrackerTheme } from "./theme";

export interface GridColumn {
  day: number;
  // Full literal Tailwind class ("" for none) painted behind the whole column.
  tint: string;
  title?: string; // tooltip on the day header
  badge?: ReactNode; // small mark pinned to the day header's corner
  weekday?: string; // "weekday" variant only: the label stacked above the day number
  accent?: boolean; // "weekday" variant: highlight the weekday label (e.g. Friday)
  current?: boolean; // "weekday" variant: today's column
  // A day that hasn't come yet: its empty boxes can't be ticked. A box that is
  // already ticked stays clickable so it can still be unticked.
  locked?: boolean;
}

export interface GridRowContext {
  item: string;
  index: number;
  done: number;
  pct: number;
}

// "compact": day numbers only (Ramadan). "weekday": a weekday label above each
// day number (Namaz) -- a taller day row and corner cell. Literal strings so
// Tailwind sees every class.
const VARIANTS = {
  compact: { corner: "h-[9.75rem]", dayTh: "h-8", dayInner: "h-8" },
  weekday: { corner: "h-[10.5rem]", dayTh: "h-11", dayInner: "h-11" },
};

interface TrackerGridProps {
  theme: TrackerTheme;
  variant: keyof typeof VARIANTS;
  items: string[];
  columns: GridColumn[]; // one per day, in order (its length is the month/Ramadan length)
  ticked: Set<string>; // `${day}:${item}`
  onToggle: (day: number, item: string, checked: boolean) => void;
  chartLabel: string; // i18n keys for the corner cell
  cornerLabel: string;
  emptyMessage?: string; // shown when there are no items (Namaz always has its five)
  // "[--habit-w:9.5rem] sm:[--habit-w:13rem]" -- the width of the sticky left column.
  habitWidth: string;
  rowHead: (row: GridRowContext) => ReactNode;
}

// Item rows on the left, a column per day with WEEK bands, and a
// daily-percentage bar chart on top -- one table, one scroll box, so the
// sticky item column and header rows and the chart bars all share the same
// column grid.
export function TrackerGrid({ theme, variant, items, columns, ticked, onToggle, chartLabel, cornerLabel, emptyMessage = "", habitWidth, rowHead }: TrackerGridProps) {
  const { t } = useLocale();
  const v = VARIANTS[variant];
  const totalDays = columns.length;
  const weekSpans = Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => Math.min(7, totalDays - 7 * i));

  return (
    <div className="min-w-0 overflow-clip rounded-2xl bg-surface shadow-sm shadow-black/5">
      <div className={`max-h-[calc(100dvh-16rem)] overflow-auto [--day-w:2.25rem] ${habitWidth}`}>
        <table className="table-fixed border-separate border-spacing-0 text-sm" style={{ width: `calc(var(--habit-w) + ${totalDays} * var(--day-w))` }}>
          <colgroup>
            <col style={{ width: "var(--habit-w)" }} />
            {columns.map((col) => (
              <col key={col.day} style={{ width: "var(--day-w)" }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={3} className="sticky left-0 top-0 z-30 bg-surface p-0 align-top shadow-[1px_0_0_0_rgb(0_0_0/0.06)]">
                {/* The three header rows: chart 6rem + week band 1.75rem + day row (2rem, or 2.75rem with weekday labels). */}
                <div className={`flex ${v.corner} flex-col justify-between px-3 py-3`}>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t(chartLabel)}</span>
                  <span className="text-xs font-semibold text-neutral-500">{t(cornerLabel)}</span>
                </div>
              </th>
              {columns.map((col) => {
                const done = items.filter((item) => ticked.has(`${col.day}:${item}`)).length;
                const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
                return (
                  <th key={col.day} className={`sticky top-0 z-20 h-24 bg-surface p-0 font-normal ${col.tint}`}>
                    <div className="flex h-24 flex-col px-1 pb-1 pt-1.5">
                      <span className="h-3 text-center text-[9px] leading-3 tabular-nums text-neutral-400">{pct > 0 ? pct : ""}</span>
                      <div className="flex flex-1 items-end justify-center">
                        <div
                          className={`w-4 rounded-t-sm bg-gradient-to-t ${theme.chartBar} transition-all duration-300`}
                          style={{ height: `${pct}%`, minHeight: pct > 0 ? 2 : 0 }}
                        />
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
            <tr>
              {weekSpans.map((span, i) => (
                <th
                  key={i}
                  colSpan={span}
                  className={`sticky top-24 z-20 h-7 bg-surface p-0 text-[11px] font-semibold uppercase tracking-wide ${theme.weekLabel} ${theme.weekTint}`}
                >
                  {span >= 3 ? `${t("Week")} ${i + 1}` : i + 1}
                </th>
              ))}
            </tr>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.day}
                  title={col.title}
                  aria-current={col.current ? "date" : undefined}
                  className={`sticky top-[7.75rem] z-20 ${v.dayTh} bg-surface p-0 text-xs font-medium text-neutral-600 ${col.tint}`}
                >
                  {variant === "weekday" ? (
                    <div className={`flex ${v.dayInner} flex-col items-center justify-center gap-0.5`}>
                      <span className={`text-[9px] font-semibold uppercase leading-none ${col.accent ? theme.weekLabel : "text-neutral-400"}`}>{col.weekday}</span>
                      <span
                        className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs leading-none ${
                          col.current ? `font-semibold ${theme.todayPill}` : ""
                        }`}
                      >
                        {col.day}
                      </span>
                    </div>
                  ) : (
                    <div className={`relative flex ${v.dayInner} items-center justify-center`}>
                      {col.day}
                      {col.badge}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={totalDays + 1} className="p-0">
                  {/* sticky, left-aligned: a centered message would sit far to the right of a
                      narrow scroll box, out of sight */}
                  <div className="sticky left-0 inline-block px-4 py-10 text-sm text-neutral-400">{emptyMessage}</div>
                </td>
              </tr>
            )}
            {items.map((item, index) => {
              const done = columns.filter((col) => ticked.has(`${col.day}:${item}`)).length;
              const pct = totalDays > 0 ? Math.round((done / totalDays) * 100) : 0;
              return (
                <tr key={item}>
                  <td className="sticky left-0 z-10 border-b border-neutral-100 bg-surface px-3 py-2 shadow-[1px_0_0_0_rgb(0_0_0/0.06)]">{rowHead({ item, index, done, pct })}</td>
                  {columns.map((col) => {
                    const checked = ticked.has(`${col.day}:${item}`);
                    const blocked = col.locked === true && !checked;
                    return (
                      <td key={col.day} title={blocked ? t("This day hasn't come yet") : undefined} className={`border-b border-neutral-100 p-0 ${col.tint}`}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          aria-label={`${t(item)} ${col.day}`}
                          disabled={blocked}
                          onClick={() => onToggle(col.day, item, !checked)}
                          className={`flex h-11 w-full items-center justify-center${blocked ? " cursor-not-allowed" : ""}`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                              blocked ? "border-neutral-200 bg-neutral-100 opacity-60" : checked ? theme.checkOn : theme.checkOff
                            }`}
                          >
                            {checked && <Check className="h-3.5 w-3.5" />}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
