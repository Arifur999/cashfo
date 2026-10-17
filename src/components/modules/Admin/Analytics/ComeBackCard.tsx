"use client";

import Card from "@/components/smartly/Card";
import { monthsAfter } from "@/lib/analyticsWording";
import { formatMonthName } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import type { ICohortRow } from "@/types/analytics.types";
import T from "@/components/shared/T";

const GRID = "grid min-w-160 grid-cols-[120px_80px_repeat(6,minmax(0,1fr))] items-center gap-2 px-5";

// A cell's green deepens with the share that came back; the month that is
// still running is drawn dashed, and months not reached yet stay empty.
const Cell = ({ percent, running }: { percent: number | null; running: boolean }) => {
  const { translate } = useLocale();
  if (percent === null) {
    return <span role="cell" aria-label={translate("Not reached yet")} className="h-8 rounded-sm border border-dashed border-line bg-surface" />;
  }
  const strength = Math.round(12 + (percent / 100) * 78);
  return (
    <span
      role="cell"
      className={cn(
        "flex h-8 items-center justify-center rounded-sm text-small font-semibold tabular-nums",
        running ? "border-[1.5px] border-dashed border-mint-300 bg-mint-50 text-forest" : percent > 55 ? "text-white" : "text-forest",
      )}
      style={running ? undefined : { background: `color-mix(in srgb, var(--emerald) ${strength}%, transparent)` }}
    >
      {percent.toFixed(1)}%
    </span>
  );
};

// "Do they come back?": of each month's new people, the share who used the
// app in each later month. Month 1 is the month they joined.
const ComeBackCard = ({ rows, currentMonth }: { rows: ICohortRow[]; currentMonth: string }) => {
  const columns = Math.min(6, Math.max(0, ...rows.map((row) => row.monthsSinceSignup.length)));
  const { translate } = useLocale();

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-title text-ink"><T>Do they come back?</T></h2>
          <span className="text-small text-ink-muted"><T>Share of each month&apos;s new people who used the app in later months. Month 1 is the month they joined.</T></span>
        </div>
        <span className="flex items-center gap-2 text-caption text-ink-muted">
          <span aria-hidden="true" className="size-3.5 rounded-xs border-[1.5px] border-dashed border-mint-300 bg-mint-50" />
          {translate("{month} so far", { month: translate(formatMonthName(currentMonth)) })}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="border-t border-line px-5 py-8 text-center text-small text-ink-muted"><T>Nobody has joined yet.</T></p>
      ) : (
        <div role="table" aria-label={translate("Monthly groups of new people")} className="overflow-x-auto pb-3">
          <div role="row" className={cn(GRID, "bg-cream py-2 text-caption font-medium text-ink-muted")}>
            <span role="columnheader"><T>Joined in</T></span>
            <span role="columnheader"><T>People</T></span>
            {Array.from({ length: columns }, (_, month) => (
              <span role="columnheader" key={month} className="text-center">
                {translate("Month {count}", { count: month + 1 })}
              </span>
            ))}
          </div>
          {rows.map((row) => {
            const running = monthsAfter(row.cohortMonth, currentMonth);
            return (
              <div role="row" key={row.cohortMonth} className={cn(GRID, "py-1 text-small")}>
                <span role="rowheader" className="font-semibold text-ink">
                  {translate(formatMonthName(row.cohortMonth))}
                </span>
                <span role="cell" className="text-ink-2 tabular-nums">
                  {formatNumber(row.cohortSize)}
                </span>
                {row.monthsSinceSignup.slice(0, columns).map((percent, month) => (
                  <Cell key={month} percent={percent} running={month === running} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default ComeBackCard;
