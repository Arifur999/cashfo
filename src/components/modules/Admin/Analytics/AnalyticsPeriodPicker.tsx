"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { PeriodPicker } from "@/components/modules/Customer/Shared/PeriodPicker";
import { monthOf, monthsSince, rangeQueryOf } from "@/lib/adminPeriod";
import { periodHref } from "@/lib/customer/period";
import { analyticsSummaryQuery } from "@/queries/analytics.queries";
import { useAnalyticsPeriod } from "./useAnalyticsPeriod";

// The page's "Choose period" (the canvas's one picker for every report):
// a month, a year or the admin's own days, this month by default. The
// period lives in the address, so the server prefetches its reports and a
// link keeps it; months before the first customer are greyed out.
const AnalyticsPeriodPicker = ({ today }: { today: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const period = useAnalyticsPeriod(today);
  const [switching, startSwitch] = useTransition();
  const since = useQuery(analyticsSummaryQuery(rangeQueryOf(period, today))).data?.data.since ?? null;
  const thisMonth = monthOf(today);

  return (
    <PeriodPicker
      period={period}
      today={today}
      activeMonths={monthsSince(since, today)}
      defaultPeriod={thisMonth}
      accent="forest"
      busy={switching}
      onPick={(next) => {
        if (next.kind === "all") return;
        startSwitch(() => router.push(periodHref(pathname, {}, next, thisMonth), { scroll: false }));
      }}
    />
  );
};

export default AnalyticsPeriodPicker;
