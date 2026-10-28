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
import { AlertTriangle } from "lucide-react";
import { rateLimitLogsListQuery, rateLimitSummaryQuery } from "@/queries/system.queries";

const BUSIEST_SHOWN = 3;
// The newest block, for the banner's "what was it".
const LATEST_BLOCK_QUERY = "page=1&limit=1&limitExceeded=true";

// The banner: how often today, in bold, then the newest block (an
// endpoint, who, how many requests), each a sentence of its own.
const hitsLead = (hits: number) => (hits === 1 ? "Limit hit once today:" : "Limit hit {count} times today:");

// Beside the backups: whether any caller hit a limit today, and the
// endpoints that take the most requests, with the full list a link away.
const RateLimitsCard = () => {
  const { translate, locale } = useLocale();
  const query = useQuery(rateLimitSummaryQuery());
  const summary = query.data?.data;
  const hits = summary?.exceededToday ?? 0;
  const busiest = (summary?.topEndpoints ?? []).slice(0, BUSIEST_SHOWN);
  const latest = useQuery({ ...rateLimitLogsListQuery(LATEST_BLOCK_QUERY), enabled: hits > 0 }).data?.data[0];

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-4.5 pt-3.5 pb-2">
        <h2 className="text-[15px] font-semibold text-ink">
          <T>Rate limits</T>
        </h2>
        <Link href="/admin/system/rate-limits" className="text-[12.5px] font-semibold text-emerald hover:underline">
          <T>See all</T>
        </Link>
      </div>
      {query.isError && !summary ? (
        // A failed read is not "no requests recorded".
        <ErrorState bordered={false} className="border-t border-divider p-4" title={translate("Couldn't load the rate limits")} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {hits > 0 && (
            <p className="mx-4.5 mb-2.5 flex items-center gap-2.5 rounded-sm bg-expense-soft px-3 py-2.25 text-[12.5px] leading-[1.45] text-expense">
              <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
              <span className="wrap-anywhere">
                <b className="font-semibold">{translate(hitsLead(hits), { count: formatCount(hits, locale) })}</b>
                {latest && (
                  <>
                    {" "}
                    {fillNodes(translate("{endpoint} from {who}, {tries} requests in the window"), {
                      endpoint: latest.endpoint,
                      who: latest.identifier,
                      tries: formatCount(latest.requestCount, locale),
                    })}
                  </>
                )}
              </span>
            </p>
          )}
          <p className="px-4.5 pb-1.5 text-caption font-medium text-ink-muted">
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
                <li key={entry.endpoint} className="flex items-center justify-between gap-2.5 border-t border-divider px-4.5 py-2 text-[12.5px]">
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
    </Card>
  );
};

export default RateLimitsCard;
