"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { rateLimitSummaryQuery } from "@/queries/system.queries";
import NotRecordedNote from "../RateLimits/NotRecordedNote";

const BUSIEST_SHOWN = 3;

// The banner as one sentence each way, so Bangla can order its clauses.
const hitsSentence = (hits: number, byWhom: boolean) => {
  if (byWhom) return hits === 1 ? "Limit hit once today, by {name}" : "Limit hit {count} times today, most often by {name}";
  return hits === 1 ? "Limit hit once today" : "Limit hit {count} times today";
};

// Beside the backups: whether any caller hit a limit today, and the
// endpoints that take the most requests, with the full list a link away.
const RateLimitsCard = () => {
  const { translate, locale } = useLocale();
  const query = useQuery(rateLimitSummaryQuery());
  const summary = query.data?.data;
  const hits = summary?.exceededToday ?? 0;
  const [offender] = summary?.topOffenders ?? [];
  const busiest = (summary?.topEndpoints ?? []).slice(0, BUSIEST_SHOWN);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-2">
        <h2 className="text-title text-ink">
          <T>Rate limits</T>
        </h2>
        <Link href="/admin/system/rate-limits" className="text-small font-semibold text-emerald hover:underline">
          <T>See all</T>
        </Link>
      </div>
      {query.isError && !summary ? (
        // A failed read is not "no requests recorded".
        <ErrorState bordered={false} className="border-t border-divider p-4" title={translate("Couldn't load the rate limits")} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {hits > 0 && (
            <p className="mx-4 mb-3 rounded-md bg-expense-soft px-3 py-2 text-small leading-normal text-expense">
              {fillNodes(translate(hitsSentence(hits, Boolean(offender))), {
                count: <b className="font-semibold">{formatCount(hits, locale)}</b>,
                name: <b className="font-semibold wrap-anywhere">{offender?.identifier}</b>,
              })}
            </p>
          )}
          <p className="px-5 pb-2 text-caption font-medium text-ink-muted">
            <T>Busiest endpoints, requests so far</T>
          </p>
          {query.isPending ? (
            // Still reading: not yet "no requests recorded".
            <ul aria-busy="true" aria-label={translate("Loading...")}>
              {[0, 1, 2].map((row) => (
                <li key={row} className="border-t border-divider px-5 py-3">
                  <Skeleton className="h-8" />
                </li>
              ))}
            </ul>
          ) : busiest.length === 0 ? (
            <p className="border-t border-divider px-5 py-3 text-small text-ink-muted">
              <T>No requests recorded yet.</T>
            </p>
          ) : (
            <ul>
              {busiest.map((entry) => (
                <li key={entry.endpoint} className="flex items-center justify-between gap-3 border-t border-divider px-5 py-2 text-small">
                  <code className="min-w-0 truncate font-mono text-ink-2" title={entry.endpoint}>
                    {entry.endpoint}
                  </code>
                  <span className="shrink-0 font-semibold text-ink tabular-nums">{formatCount(entry.requestCount, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <NotRecordedNote variant="footer" />
    </Card>
  );
};

export default RateLimitsCard;
