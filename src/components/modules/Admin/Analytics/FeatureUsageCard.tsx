"use client";

import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { IFeatureUsageEntry } from "@/types/analytics.types";
import { featureLabel } from "./analyticsLabels";
import { ListPlaceholder, ReportError, type ReportQuery, updatingClass } from "./ReportState";

interface FeatureUsageCardProps {
  data: IFeatureUsageEntry[] | undefined;
  query: ReportQuery;
  // The range the figures on screen belong to.
  rangeLabel: string;
}

// What people did in the chosen period, the most common first, each as a
// bar against the most common one.
const FeatureUsageCard = ({ data, query, rangeLabel }: FeatureUsageCardProps) => {
  const { locale } = useLocale();
  const rows = [...(data ?? [])].sort((a, b) => b.count - a.count);
  const most = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card aria-busy={query.updating || undefined} className={cn("flex flex-col gap-3 px-5 py-4", updatingClass(query))}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-title text-ink">
          <T>What people do</T>
        </h2>
        <span className="text-[12.5px] leading-[normal] text-ink-muted">{rangeLabel}</span>
      </div>
      {query.status === "pending" ? (
        <ListPlaceholder rows={4} />
      ) : query.status === "error" ? (
        <ReportError onRetry={query.retry} />
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-small text-ink-muted">
          <T>Nothing recorded in these days.</T>
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.eventType} className="grid grid-cols-[150px_minmax(0,1fr)_70px] items-center gap-3 text-[13.5px] leading-[normal]">
              <span className="truncate text-ink">
                <T>{featureLabel(row.eventType)}</T>
              </span>
              <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full bg-emerald" style={{ width: `${Math.max(1.5, (row.count / most) * 100)}%` }} />
              </span>
              <b className="text-right font-semibold text-ink tabular-nums">{formatCount(row.count, locale)}</b>
            </li>
          ))}
        </ul>
      )}
      <span className="text-[12.5px] leading-[normal] text-ink-faint">
        <T>{"The password manager isn't counted yet."}</T>
      </span>
    </Card>
  );
};

export default FeatureUsageCard;
