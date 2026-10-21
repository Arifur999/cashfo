"use client";

import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import Link from "next/link";
import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { networkNote, networkTone } from "@/lib/loginAttempts";
import { cn } from "@/lib/utils";
import { loginAttemptsSummaryQuery } from "@/queries/security.queries";

const COUNT_TONE = { danger: "text-expense", warning: "text-warning", neutral: "text-ink-2" } as const;
const BAR_TONE = { danger: "bg-expense-fill", warning: "bg-warning-fill", neutral: "bg-ink-muted" } as const;

// A network's failed tries over the card's own window, in the list beside it.
const triesHref = (ipAddress: string) => `/admin/security/logins?${new URLSearchParams({ ipAddress, success: "false", within: "7d" }).toString()}`;

// Beside the list: the networks with the most failures this week, each with
// a bar, whose account it went for and how its flag ended; then the rule
// that pauses them. Each network links to its tries.
const FailingNetworks = () => {
  const { translate, locale } = useLocale();
  const query = useQuery(loginAttemptsSummaryQuery());
  const networks = query.data?.data.topIps ?? [];
  const most = Math.max(1, ...networks.map((network) => network.count));

  return (
    <aside className="flex flex-col gap-4">
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-0.5 px-5 pt-4 pb-3">
          <h2 className="text-title text-ink">
            <T>Most failed sign-ins</T>
          </h2>
          <span className="text-small text-ink-muted">
            <T>By network, last 7 days</T>
          </span>
        </div>
        {query.isError && !query.data ? (
          // A failed read is not a quiet week.
          <ErrorState bordered={false} className="border-t border-divider p-4" title={translate("Couldn't load the failed sign-ins")} onRetry={() => void query.refetch()} />
        ) : query.isPending ? (
          // Still reading (or retrying a failed prefetch): not yet a quiet week.
          <ul aria-busy="true" aria-label={translate("Loading...")}>
            {[0, 1, 2].map((row) => (
              <li key={row} className="border-t border-divider px-5 py-3">
                <Skeleton className="h-8" />
              </li>
            ))}
          </ul>
        ) : networks.length === 0 ? (
          <p className="border-t border-divider px-5 py-4 text-small text-ink-muted">
            <T>No failed sign-ins in the last 7 days.</T>
          </p>
        ) : (
          <ul>
            {networks.map((network) => {
              const tone = networkTone(network);
              return (
                <li key={network.ipAddress} className="flex flex-col gap-2 border-t border-divider px-5 py-2">
                  <span className="flex items-baseline justify-between gap-2">
                    {/* A full IPv6 address wraps rather than pushing the count off the card. */}
                    <Link
                      href={triesHref(network.ipAddress)}
                      aria-label={translate("See the tries from {ip}", { ip: network.ipAddress })}
                      className="min-w-0 text-ink hover:text-emerald hover:underline"
                    >
                      <code className="font-mono text-small font-semibold break-all">{network.ipAddress}</code>
                    </Link>
                    <span className={cn("shrink-0 text-small font-bold tabular-nums", COUNT_TONE[tone])}>{formatCount(network.count, locale)}</span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
                    <span className={cn("block h-full rounded-full", BAR_TONE[tone])} style={{ width: `${Math.round((network.count / most) * 100)}%` }} />
                  </span>
                  <span className="text-caption wrap-anywhere text-ink-muted">{networkNote(network, { t: translate, locale })}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <div role="note" className="flex gap-3 rounded-md border border-line bg-strip px-4 py-3 text-small leading-relaxed text-ink-2">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
        <span>
          <T>After 5 tries in 15 minutes on one account from one network, sign-in pauses there for 15 minutes; 30 tries pause the whole network. This list covers the admin panel and the app.</T>
        </span>
      </div>
    </aside>
  );
};

export default FailingNetworks;
