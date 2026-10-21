"use client";

import ErrorState from "@/components/smartly/ErrorState";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// Where a report's query is, so a card says "nobody" only when the answer
// really was nobody: its first load still running, failed with nothing to
// show, or in.
export interface ReportQuery {
  status: "pending" | "error" | "ready";
  // The figures on screen are the previous range's while the next loads.
  updating: boolean;
  retry: () => void;
}

interface QueryLike {
  data: unknown;
  isError: boolean;
  isPlaceholderData: boolean;
  refetch: () => unknown;
}

// From a TanStack query. Figures already on screen win over a failed
// background refetch: they are still the best there is.
export const reportQuery = (query: QueryLike): ReportQuery => ({
  status: query.data !== undefined ? "ready" : query.isError ? "error" : "pending",
  updating: query.isPlaceholderData,
  retry: () => void query.refetch(),
});

// A card being refilled for a new range is set back (and marked aria-busy
// by the card itself).
export const updatingClass = (query: ReportQuery) => cn("transition-opacity motion-reduce:transition-none", query.updating && "opacity-60");

// A chart-sized block while the first load runs.
export function ChartPlaceholder({ className }: { className?: string }) {
  const { translate } = useLocale();
  return (
    <div role="status" className={cn("animate-pulse rounded-md bg-surface-sunken", className)}>
      <span className="sr-only">{translate("Loading")}</span>
    </div>
  );
}

// Lines for a list while the first load runs, edge to edge in a padded card.
export function ListPlaceholder({ rows = 3 }: { rows?: number }) {
  return <SkeletonRows rows={rows} avatar={false} className="-mx-5" />;
}

// In place of a report that failed: what happened, and a retry.
export function ReportError({ onRetry }: { onRetry: () => void }) {
  const { translate } = useLocale();
  return <ErrorState bordered={false} title={translate("Couldn't load this report")} onRetry={onRetry} className="py-8" />;
}
