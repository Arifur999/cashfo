"use client";

import Kpi from "@/components/shared/Kpi";
import { rangeName, shareOfAccounts, shareOfWeek, weekChange } from "@/lib/analyticsWording";
import type { AnalyticsRange } from "@/lib/analyticsRange";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { IAnalyticsSummary, IFeatureUsageEntry } from "@/types/analytics.types";
import { type ReportQuery, updatingClass } from "./ReportState";

const CHANGE_TONE = { up: "font-semibold text-emerald", down: "font-semibold text-expense", same: "" } as const;

const Note = ({ children, className }: { children: React.ReactNode; className?: string }) => <span className={cn("text-small", className)}>{children}</span>;

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
  summary: IAnalyticsSummary | undefined;
  summaryQuery: ReportQuery;
  featureUsage: IFeatureUsageEntry[] | undefined;
  featureQuery: ReportQuery;
  // The range the feature figures on screen belong to.
  range: AnalyticsRange;
}

// Four figures over the page: how many people were active in 30 days, in 7
// (against the week before) and yesterday, and how much money was entered
// in the chosen period. Counts and their notes are in the reader's digits.
const AnalyticsKpis = ({ summary, summaryQuery, featureUsage, featureQuery, range }: AnalyticsKpisProps) => {
  const { translate, locale } = useLocale();
  const digits = (text: string) => toLocaleDigits(text, locale);
  const added = featureUsage?.filter((entry) => entry.eventType === "income_added" || entry.eventType === "expense_added").reduce((sum, entry) => sum + entry.count, 0);
  const change = summary ? weekChange(summary.activeLast7d, summary.activePrevious7d, translate) : null;
  // The value and note of a summary figure in each of its states.
  const summaryValue = (value: number | undefined) => (summaryQuery.status === "pending" ? <PendingValue /> : value === undefined ? "—" : formatCount(value, locale));
  const summaryNote = (note: React.ReactNode) => (summaryQuery.status === "error" ? <FailedNote onRetry={summaryQuery.retry} /> : note);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        size="sm"
        label="Active in the last 30 days"
        value={summaryValue(summary?.activeLast30d)}
        note={summaryNote(summary && <Note>{digits(shareOfAccounts(summary.activeLast30d, summary.totalAccounts, translate))}</Note>)}
      />
      <Kpi size="sm" label="Active in the last 7 days" value={summaryValue(summary?.activeLast7d)} note={summaryNote(change && <Note className={CHANGE_TONE[change.tone]}>{digits(change.text)}</Note>)} />
      <Kpi
        size="sm"
        label="Active yesterday"
        value={summaryValue(summary?.activeYesterday)}
        note={summaryNote(summary && <Note>{digits(shareOfWeek(summary.activeYesterday, summary.activeLast7d, translate))}</Note>)}
      />
      {/* Set back, and still named for its own range, while the next range loads. */}
      <div aria-busy={featureQuery.updating || undefined} className={cn("grid", updatingClass(featureQuery))}>
        <Kpi
          size="sm"
          label="Income and expenses added"
          value={featureQuery.status === "pending" ? <PendingValue /> : added === undefined ? "—" : formatCount(added, locale)}
          note={featureQuery.status === "error" ? <FailedNote onRetry={featureQuery.retry} /> : <Note>{rangeName(range, translate, locale)}</Note>}
        />
      </div>
    </div>
  );
};

export default AnalyticsKpis;
