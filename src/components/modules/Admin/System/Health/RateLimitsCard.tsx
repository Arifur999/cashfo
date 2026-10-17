"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import { formatNumber } from "@/lib/number";
import { rateLimitSummaryQuery } from "@/queries/system.queries";

const BUSIEST_SHOWN = 3;

// Beside the backups: whether any caller hit a limit today, and the
// endpoints that take the most requests, with the full list a link away.
const RateLimitsCard = () => {
  const summary = useQuery(rateLimitSummaryQuery()).data?.data;
  const hits = summary?.exceededToday ?? 0;
  const [offender] = summary?.topOffenders ?? [];
  const busiest = (summary?.topEndpoints ?? []).slice(0, BUSIEST_SHOWN);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-2">
        <h2 className="text-title text-ink">Rate limits</h2>
        <Link href="/admin/system/rate-limits" className="text-small font-semibold text-emerald hover:underline">
          See all
        </Link>
      </div>
      {hits > 0 && (
        <p className="mx-4 mb-3 rounded-md bg-expense-soft px-3 py-2 text-small leading-normal text-expense">
          <b className="font-semibold">Limit hit {hits === 1 ? "once" : `${formatNumber(hits)} times`} today</b>
          {offender && `, most often by ${offender.identifier}`}
        </p>
      )}
      <p className="px-5 pb-2 text-caption font-medium text-ink-muted">Busiest endpoints, requests so far</p>
      {busiest.length === 0 ? (
        <p className="border-t border-surface-sunken px-5 py-3 text-small text-ink-muted">No requests recorded yet.</p>
      ) : (
        <ul>
          {busiest.map((entry) => (
            <li key={entry.endpoint} className="flex items-center justify-between gap-3 border-t border-surface-sunken px-5 py-2 text-small">
              <code className="truncate font-mono text-ink-2">{entry.endpoint}</code>
              <span className="shrink-0 font-semibold text-ink tabular-nums">{formatNumber(entry.requestCount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default RateLimitsCard;
