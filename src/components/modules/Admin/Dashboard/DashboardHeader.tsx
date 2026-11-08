"use client";

import { Download } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { PeriodPicker } from "@/components/modules/Customer/Shared/PeriodPicker";
import { dayPart, firstName } from "@/lib/adminDashboard";
import { monthOf, monthsSince } from "@/lib/adminPeriod";
import { periodHref, type Period } from "@/lib/customer/period";
import { formatDate } from "@/lib/date";
import { datedFileName, downloadCsv } from "@/lib/download";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IDashboardPeriodOverview } from "@/types/dashboard.types";
import { reportCsv, type ReportLine } from "./dashboardFigures";

const GREETING = { morning: "Good morning, {name}", afternoon: "Good afternoon, {name}", evening: "Good evening, {name}" } as const;

// The figures behind every card, one line each, in English: a report to
// keep or share, not a page to read in the panel's language.
function reportLines(overview: IDashboardPeriodOverview): ReportLine[] {
  const { range, attention, money } = overview;
  const lines: ReportLine[] = [
    { section: "Period", item: "From", value: range.from },
    { section: "Period", item: "To", value: range.to },
    { section: "Users", item: "Total users", value: overview.users.total },
    { section: "Users", item: "New in the period", value: overview.users.newInPeriod },
    { section: "Users", item: "Active in the period", value: overview.active.count },
    { section: "Users", item: "Active share (%)", value: overview.active.pct },
  ];
  if (attention.payoutRequests) lines.push({ section: "Needs you now", item: "Payout requests", value: attention.payoutRequests.count });
  if (attention.ticketsNoReply) lines.push({ section: "Needs you now", item: "Tickets with no reply", value: attention.ticketsNoReply.count });
  if (attention.failedPayments7d) lines.push({ section: "Needs you now", item: "Failed payments, 7 days", value: attention.failedPayments7d.count });
  if (attention.securityFlags) lines.push({ section: "Needs you now", item: "Security flags", value: attention.securityFlags.open });
  if (attention.newErrors24h) lines.push({ section: "Needs you now", item: "New errors, 24 hours", value: attention.newErrors24h.count });
  if (money) {
    lines.push({ section: "Money", item: "Paid users", value: money.paidUsers.total });
    for (const plan of money.paidUsers.byPlan) lines.push({ section: "Paid users", item: plan.planName ?? plan.planId, value: plan.count });
    lines.push({ section: "Money", item: "MRR", value: money.mrr });
    lines.push({ section: "Money", item: "ARR", value: money.arr });
    if (money.mrrChange.pct !== null) lines.push({ section: "Money", item: "MRR change (%)", value: money.mrrChange.pct });
    lines.push({ section: "Money", item: "Revenue in the period", value: money.revenue.total });
    for (const month of money.revenue.months) lines.push({ section: "Revenue", item: month.month, value: month.amount });
    for (const plan of money.accountsByPlan) lines.push({ section: "Accounts by plan", item: plan.name, value: plan.count });
  }
  for (const point of overview.signups.points) lines.push({ section: "Sign-ups", item: point.key, value: point.count });
  return lines;
}

interface DashboardHeaderProps {
  name: string;
  // The hour in the platform's time zone, read on the server.
  hour: number;
  overview: IDashboardPeriodOverview;
  period: Period;
  // YYYY-MM-DD on the platform's calendar, read on the server.
  today: string;
}

// "Good afternoon, Nadia" (30px), today's date, and on the right the
// period the page shows ("Choose period": a month, a year or the admin's
// own days, this month by default) and "Download report", as the
// AdminDashboard board heads the page. The period lives in the address, so
// the server reads it and a link keeps it.
export function DashboardHeader({ name, hour, overview, period, today }: DashboardHeaderProps) {
  const { translate, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [switching, startSwitch] = useTransition();
  const day = new Date(`${today}T12:00:00Z`);
  const todayLine = `${translate(formatDate(day, "EEEE"))}, ${toLocaleDigits(formatDate(day, "d"), locale)} ${translate(formatDate(day, "MMMM"))} ${toLocaleDigits(formatDate(day, "yyyy"), locale)}`;
  const thisMonth = monthOf(today);

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[30px] leading-[1.2] font-semibold tracking-[-0.03em] text-ink max-sm:text-page-title">{translate(GREETING[dayPart(hour)], { name: firstName(name) })}</h1>
        <p className="text-body text-ink-muted">
          {todayLine} · {translate("here is what needs you today.")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <PeriodPicker
          period={period}
          today={today}
          activeMonths={monthsSince(overview.since, today)}
          defaultPeriod={thisMonth}
          accent="forest"
          busy={switching}
          onPick={(next) => {
            if (next.kind === "all") return;
            startSwitch(() => router.push(periodHref(pathname, {}, next, thisMonth), { scroll: false }));
          }}
        />
        <button
          type="button"
          onClick={() => downloadCsv(reportCsv(reportLines(overview)), datedFileName(`dashboard-${overview.range.from}-${overview.range.to}`))}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-input bg-surface px-3.5 text-body font-semibold whitespace-nowrap text-ink transition-colors hover:bg-hover"
        >
          <Download className="size-4 text-ink-2" strokeWidth={2} aria-hidden="true" />
          {translate("Download report")}
        </button>
      </div>
    </div>
  );
}
