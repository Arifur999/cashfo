"use client";

import { monthLabel } from "@/components/modules/Admin/Dashboard/dashboardDates";
import T from "@/components/shared/T";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { ListCard, ListEmpty, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import { monthsAfter } from "@/lib/analyticsWording";
import { formatMonthName } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { ICohortRow } from "@/types/analytics.types";
import { cohortShade } from "./analyticsLabels";
import { ReportError, type ReportQuery } from "./ReportState";

// The table keeps its columns on a phone and scrolls sideways instead.
const COLUMNS = "grid-cols-[120px_80px_repeat(6,minmax(0,1fr))]";
const ROW = "min-w-160 gap-x-2";

// A cell's green deepens with the share that came back, in the five steps
// cohortShade keeps readable; the month that is still running is drawn
// dashed, and months not reached yet stay empty.
const Cell = ({ percent, running }: { percent: number | null; running: boolean }) => {
  const { translate, locale } = useLocale();
  if (percent === null) {
    return <span role="cell" aria-label={translate("Not reached yet")} className="h-8 rounded-sm border border-dashed border-line bg-surface" />;
  }
  const shade = cohortShade(percent);
  return (
    <span
      role="cell"
      className={cn(
        "flex h-8 items-center justify-center rounded-sm text-small font-semibold tabular-nums",
        running ? "border-[1.5px] border-dashed border-mint-300 bg-mint-50 text-forest" : shade.text === "white" ? "text-white" : "text-forest",
      )}
      style={running ? undefined : { background: shade.fill === 100 ? "var(--emerald)" : `color-mix(in srgb, var(--emerald) ${shade.fill}%, transparent)` }}
    >
      {toLocaleDigits(`${percent.toFixed(1)}%`, locale)}
    </span>
  );
};

// A loading or failed state, kept inside the table as one row and cell.
const TableNote = ({ children }: { children: React.ReactNode }) => (
  <div role="row">
    <div role="cell">{children}</div>
  </div>
);

// "Do they come back?": of each month's new people, the share who used the
// app in each later month. Month 1 is the month they joined.
const ComeBackCard = ({ rows, query, currentMonth }: { rows: ICohortRow[] | undefined; query: ReportQuery; currentMonth: string }) => {
  const { translate, locale } = useLocale();
  const list = rows ?? [];
  const columns = Math.min(6, Math.max(0, ...list.map((row) => row.monthsSinceSignup.length)));
  // Once the groups run over more than one year, two Octobers need their years.
  const withYear = new Set(list.map((row) => row.cohortMonth.slice(0, 4))).size > 1;
  const filled = query.status === "ready" && list.length > 0;

  return (
    <ListCard
      label={translate("Monthly groups of new people")}
      title={<T>Do they come back?</T>}
      description={<T>Share of each month&apos;s new people who used the app in later months. Month 1 is the month they joined.</T>}
      actions={
        <span className="flex items-center gap-2 text-caption text-ink-muted">
          <span aria-hidden="true" className="size-3.5 rounded-xs border-[1.5px] border-dashed border-mint-300 bg-mint-50" />
          {translate("{month} so far", { month: translate(formatMonthName(currentMonth)) })}
        </span>
      }
      scrollable={filled}
      tableClassName={filled ? "overflow-x-auto" : undefined}
    >
      {query.status === "pending" ? (
        <TableNote>
          <SkeletonRows rows={3} avatar={false} />
        </TableNote>
      ) : query.status === "error" ? (
        <TableNote>
          <ReportError onRetry={query.retry} />
        </TableNote>
      ) : list.length === 0 ? (
        <ListEmpty title={<T>Nobody has joined yet.</T>} className="text-small" />
      ) : (
        <>
          <ListHead columns={COLUMNS} showOnPhone className={ROW}>
            <ListHeadCell>
              <T>Joined in</T>
            </ListHeadCell>
            <ListHeadCell>
              <T>People</T>
            </ListHeadCell>
            {Array.from({ length: columns }, (_, month) => (
              <ListHeadCell key={month} align="center">
                {translate("Month {count}", { count: formatCount(month + 1, locale) })}
              </ListHeadCell>
            ))}
          </ListHead>
          {list.map((row) => {
            const running = monthsAfter(row.cohortMonth, currentMonth);
            return (
              <ListRow key={row.cohortMonth} density="dense" className={cn(COLUMNS, ROW, "py-1 text-small md:py-1")}>
                <span role="rowheader" className="truncate font-semibold text-ink">
                  {monthLabel(row.cohortMonth, locale, translate, withYear)}
                </span>
                <span role="cell" className="text-ink-2 tabular-nums">
                  {formatCount(row.cohortSize, locale)}
                </span>
                {row.monthsSinceSignup.slice(0, columns).map((percent, month) => (
                  <Cell key={month} percent={percent} running={month === running} />
                ))}
              </ListRow>
            );
          })}
        </>
      )}
    </ListCard>
  );
};

export default ComeBackCard;
