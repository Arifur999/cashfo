"use client";

import { periodLabel } from "@/components/modules/Customer/Shared/PeriodPicker";
import { usePeriodWords } from "@/components/modules/Admin/Dashboard/periodWords";
import Kpi from "@/components/shared/Kpi";
import { shareOfAccounts, shareOfWeek, weekChange } from "@/lib/analyticsWording";
import type { Period } from "@/lib/customer/period";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { IAnalyticsPeriodSummary, IFeatureUsageEntry } from "@/types/analytics.types";
import type { ReportQuery } from "./ReportState";

const CHANGE_TONE = { up: "font-semibold text-emerald", down: "font-semibold text-expense", same: "" } as const;

const Note = ({ children, className }: { children: React.ReactNode; className?: string }) => <span className={cn("text-[12.5px] leading-[normal]", className)}>{children}</span>;

// A figure still on its way in.
const PendingValue = () => {
  const { translate } = useLocale();
  return (
    <span role="status" className="inline-block h-7 w-16 animate-pulse rounded-sm bg-surface-sunken align-middle">
      <span className="sr-only">{translate("Loading")}</span>
    </span>
  );
};

// A figure that couldn't be loaded, and the way to ask again.
const FailedNote = ({ onRetry }: { onRetry: () => void }) => {
  const { translate } = useLocale();
  return (
    <Note>
      {translate("Couldn't load")} ·{" "}
      <button type="button" onClick={onRetry} className="inline-flex items-center font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
        {translate("Try again")}
      </button>
    </Note>
  );
};

interface AnalyticsKpisProps {
  summary: IAnalyticsPeriodSummary | undefined;
  summaryQuery: ReportQuery;
  featureUsage: IFeatureUsageEntry[] | undefined;
  featureQuery: ReportQuery;
  period: Period;
  today: string;
}

// Four figures over the page, as the AdminAnalytics board writes them for
// the period: who was active in it (of the accounts then), in its last
// seven days against the seven before, on its last day (yesterday while it
// runs), and how many incomes and expenses were added in it. Counts and
// their notes are in the reader's digits.
const AnalyticsKpis = ({ summary, summaryQuery, featureUsage, featureQuery, period, today }: AnalyticsKpisProps) => {
  const { translate, locale, fmt } = useLocale();
  const { activeLabel } = usePeriodWords(period, today);
  const digits = (text: string) => toLocaleDigits(text, locale);
  const day = (value: string) => formatDay(value, "d MMM", fmt);
  const added = featureUsage?.filter((entry) => entry.eventType === "income_added" || entry.eventType === "expense_added").reduce((sum, entry) => sum + entry.count, 0);
  const change = summary ? weekChange(summary.activeLast7d, summary.activePrevious7d, translate) : null;
  // The value and note of a summary figure in each of its states.
  const summaryValue = (value: number | undefined) => (summaryQuery.status === "pending" ? <PendingValue /> : value === undefined ? "—" : formatCount(value, locale));
  const summaryNote = (note: React.ReactNode) => (summaryQuery.status === "error" ? <FailedNote onRetry={summaryQuery.retry} /> : note);
  const running = summary?.isNow ?? true;

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        size="sm"
        label={activeLabel}
        value={summaryValue(summary?.activeInPeriod)}
        note={summaryNote(summary && <Note>{digits(shareOfAccounts(summary.activeInPeriod, summary.accounts, translate))}</Note>)}
      />
      <Kpi
        size="sm"
        label={running || !summary ? translate("Active in the last 7 days") : translate("Active in the 7 days to {day}", { day: day(summary.to) })}
        value={summaryValue(summary?.activeLast7d)}
        note={summaryNote(change && <Note className={CHANGE_TONE[change.tone]}>{digits(change.text)}</Note>)}
      />
      <Kpi
        size="sm"
        label={running || !summary ? translate("Active yesterday") : translate("Active on {day}", { day: day(summary.lastDay) })}
        value={summaryValue(summary?.activeLastDay)}
        note={summaryNote(summary && <Note>{digits(shareOfWeek(summary.activeLastDay, summary.activeLast7d, translate))}</Note>)}
      />
      <Kpi
        size="sm"
        label="Income and expenses added"
        value={featureQuery.status === "pending" ? <PendingValue /> : added === undefined ? "—" : formatCount(added, locale)}
        note={featureQuery.status === "error" ? <FailedNote onRetry={featureQuery.retry} /> : <Note>{periodLabel(period, translate, fmt)}</Note>}
      />
    </div>
  );
};

export default AnalyticsKpis;
