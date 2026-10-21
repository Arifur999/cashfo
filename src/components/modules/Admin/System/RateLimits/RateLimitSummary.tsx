"use client";

import { useQuery } from "@tanstack/react-query";
import Kpi from "@/components/shared/Kpi";
import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { humanizeEnum } from "@/lib/statusBadge";
import { cn } from "@/lib/utils";
import { rateLimitSummaryQuery } from "@/queries/system.queries";
import NotRecordedNote from "./NotRecordedNote";

interface RankedItem {
  key: string;
  label: React.ReactNode;
  // The whole label, for a truncated one.
  title: string;
  value: number;
}

interface RankedCardProps {
  title: string;
  // Shown as a line under the title: touch screens have no hover for a tip.
  description: string;
  items: RankedItem[];
  empty: string;
  // The bar's fill on the sunken track.
  bar: string;
  // The first read is still on its way: rows to come, not `empty`.
  loading?: boolean;
}

// A ranked list on the card recipe the Health page and Sign-ins use: each
// entry with its count and a bar, as Most failed sign-ins draws them.
const RankedCard = ({ title, description, items, empty, bar, loading = false }: RankedCardProps) => {
  const { translate, locale } = useLocale();
  const most = Math.max(1, ...items.map((item) => item.value));
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-col gap-0.5 px-5 pt-4 pb-3">
        <h2 className="text-title text-ink">
          <T>{title}</T>
        </h2>
        <p className="text-small text-ink-muted">
          <T>{description}</T>
        </p>
      </div>
      {loading ? (
        <ul aria-busy="true" aria-label={translate("Loading...")}>
          {[0, 1, 2].map((row) => (
            <li key={row} className="border-t border-divider px-5 py-3">
              <Skeleton className="h-8" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="border-t border-divider px-5 py-4 text-small text-ink-muted">
          <T>{empty}</T>
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.key} className="flex flex-col gap-2 border-t border-divider px-5 py-2">
              <span className="flex items-baseline justify-between gap-2 text-small">
                <span className="min-w-0 truncate text-ink" title={item.title}>
                  {item.label}
                </span>
                <span className="shrink-0 font-bold text-ink tabular-nums">{formatCount(item.value, locale)}</span>
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
                <span className={cn("block h-full rounded-full", bar)} style={{ width: `${Math.round((item.value / most) * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

// Two figures over the endpoints that take the most requests and the
// callers who hit a limit most often, under the note that nothing records
// them yet.
const RateLimitSummary = () => {
  const { translate, locale } = useLocale();
  const query = useQuery(rateLimitSummaryQuery());
  const summary = query.data?.data;
  const [busiest] = summary?.topEndpoints ?? [];

  return (
    <div className="space-y-4">
      <NotRecordedNote />
      {query.isError && !summary ? (
        <ErrorState title={translate("Couldn't load the rate limits")} onRetry={() => void query.refetch()} className="shadow-card" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Kpi size="sm" label="Limits hit today" value={summary ? formatCount(summary.exceededToday, locale) : "—"} note="Request windows over their limit" />
            <Kpi
              size="sm"
              label="Busiest endpoint"
              value={
                <code className="block truncate font-mono text-title" title={busiest?.endpoint}>
                  {busiest?.endpoint ?? "—"}
                </code>
              }
              note={busiest ? translate("{count} requests so far", { count: formatCount(busiest.requestCount, locale) }) : summary ? "No requests recorded yet" : undefined}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <RankedCard
              title="Top endpoints"
              description="Endpoints with the most requests recorded across all windows."
              items={(summary?.topEndpoints ?? []).map((entry) => ({
                key: entry.endpoint,
                label: <code className="font-mono">{entry.endpoint}</code>,
                title: entry.endpoint,
                value: entry.requestCount,
              }))}
              empty="No requests recorded yet."
              bar="bg-emerald"
              loading={query.isPending}
            />
            <RankedCard
              title="Top offenders"
              description="Callers who exceeded a limit most often."
              items={(summary?.topOffenders ?? []).map((entry) => {
                const kind = translate(humanizeEnum(entry.identifierType.toUpperCase()));
                return {
                  key: `${entry.identifierType}:${entry.identifier}`,
                  label: (
                    <>
                      <code className="font-mono">{entry.identifier}</code> <span className="text-ink-muted">{kind}</span>
                    </>
                  ),
                  title: `${entry.identifier} · ${kind}`,
                  value: entry.count,
                };
              })}
              empty="Nothing recorded yet."
              bar="bg-expense-fill"
              loading={query.isPending}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default RateLimitSummary;
