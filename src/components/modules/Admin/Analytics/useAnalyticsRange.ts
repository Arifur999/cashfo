"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { type AnalyticsPreset, resolveAnalyticsRange, toAnalyticsRangeQuery } from "@/lib/analyticsRange";

export interface AnalyticsRangeChange {
  preset: AnalyticsPreset;
  // Custom ranges only.
  from?: string;
  to?: string;
}

// The range lives in the URL (shareable, survives reload). Changes go
// through history.pushState, like the tables: no navigation, and the charts'
// queries pick up the new key while keeping the old data on screen.
export function useAnalyticsRange(today: string) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const range = resolveAnalyticsRange({ range: searchParams.get("range"), from: searchParams.get("from"), to: searchParams.get("to") }, today);

  const setRange = useCallback(
    ({ preset, from, to }: AnalyticsRangeChange) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", preset);
      if (preset === "custom" && from && to) {
        params.set("from", from);
        params.set("to", to);
      } else {
        params.delete("from");
        params.delete("to");
      }
      window.history.pushState(null, "", `${pathname}?${params.toString()}`);
    },
    [pathname, searchParams],
  );

  return { range, rangeQuery: toAnalyticsRangeQuery(range), setRange };
}
