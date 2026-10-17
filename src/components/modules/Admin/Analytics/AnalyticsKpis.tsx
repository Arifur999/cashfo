"use client";

import Kpi from "@/components/shared/Kpi";
import { rangeName, shareOfAccounts, shareOfWeek, weekChange } from "@/lib/analyticsWording";
import type { AnalyticsRange } from "@/lib/analyticsRange";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import type { IAnalyticsSummary, IFeatureUsageEntry } from "@/types/analytics.types";

const CHANGE_TONE = { up: "font-semibold text-emerald", down: "font-semibold text-expense", same: "" } as const;

const Note = ({ children, className }: { children: React.ReactNode; className?: string }) => <span className={cn("text-small", className)}>{children}</span>;

interface AnalyticsKpisProps {
  summary: IAnalyticsSummary | undefined;
  featureUsage: IFeatureUsageEntry[] | undefined;
  range: AnalyticsRange;
}

// Four figures over the page: how many people were active in 30 days, in 7
// (against the week before) and yesterday, and how much money was entered
// in the chosen period.
const AnalyticsKpis = ({ summary, featureUsage, range }: AnalyticsKpisProps) => {
  const added = featureUsage?.filter((entry) => entry.eventType === "income_added" || entry.eventType === "expense_added").reduce((sum, entry) => sum + entry.count, 0);
  const change = summary ? weekChange(summary.activeLast7d, summary.activePrevious7d) : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        size="sm"
        label="Active in the last 30 days"
        value={formatNumber(summary?.activeLast30d)}
        note={summary && <Note>{shareOfAccounts(summary.activeLast30d, summary.totalAccounts)}</Note>}
      />
      <Kpi size="sm" label="Active in the last 7 days" value={formatNumber(summary?.activeLast7d)} note={change && <Note className={CHANGE_TONE[change.tone]}>{change.text}</Note>} />
      <Kpi
        size="sm"
        label="Active yesterday"
        value={formatNumber(summary?.activeYesterday)}
        note={summary && <Note>{shareOfWeek(summary.activeYesterday, summary.activeLast7d)}</Note>}
      />
      <Kpi size="sm" label="Income and expenses added" value={formatNumber(added)} note={<Note>{rangeName(range)}</Note>} />
    </div>
  );
};

export default AnalyticsKpis;
