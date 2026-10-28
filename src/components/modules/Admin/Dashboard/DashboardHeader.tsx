"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { dayPart, firstName } from "@/lib/adminDashboard";
import { ADMIN_HOME_ROUTE } from "@/lib/authUtils";
import { formatDate } from "@/lib/date";
import { datedFileName, downloadCsv } from "@/lib/download";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { DASHBOARD_PERIODS, type DashboardPeriod, type IDashboardOverview } from "@/types/dashboard.types";
import { reportCsv, type ReportLine } from "./dashboardFigures";

const GREETING = { morning: "Good morning, {name}", afternoon: "Good afternoon, {name}", evening: "Good evening, {name}" } as const;
const PERIOD_LABEL: Record<DashboardPeriod, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

// The figures behind every card, one line each, in English: a report to
// keep or share, not a page to read in the panel's language.
function reportLines(summary: IDashboardOverview): ReportLine[] {
  const lines: ReportLine[] = [
    { section: "Period", item: "Last", value: PERIOD_LABEL[summary.period] },
    { section: "Users", item: "Total users", value: summary.users.total },
    { section: "Users", item: `New in ${PERIOD_LABEL[summary.period]}`, value: summary.users.newInPeriod },
    { section: "Users", item: "New in 7 days", value: summary.users.newLast7d },
    { section: "Users", item: "Active in 30 days", value: summary.activeLast30d },
    { section: "Users", item: "Active share (%)", value: summary.activePct },
  ];
  const { attention } = summary;
  if (attention.payoutRequests) lines.push({ section: "Needs you now", item: "Payout requests", value: attention.payoutRequests.count });
  if (attention.ticketsNoReply) lines.push({ section: "Needs you now", item: "Tickets with no reply", value: attention.ticketsNoReply.count });
  if (attention.failedPayments7d) lines.push({ section: "Needs you now", item: "Failed payments, 7 days", value: attention.failedPayments7d.count });
  if (attention.securityFlags) lines.push({ section: "Needs you now", item: "Security flags", value: attention.securityFlags.open });
  if (attention.newErrors24h) lines.push({ section: "Needs you now", item: "New errors, 24 hours", value: attention.newErrors24h.count });
  if (summary.paidUsers) {
    lines.push({ section: "Money", item: "Paid users", value: summary.paidUsers.total });
    for (const plan of summary.paidUsers.byPlan) lines.push({ section: "Paid users", item: plan.planName ?? plan.planId, value: plan.count });
  }
  if (summary.mrr !== null) lines.push({ section: "Money", item: "MRR", value: summary.mrr });
  if (summary.arr !== null) lines.push({ section: "Money", item: "ARR", value: summary.arr });
  if (summary.mrrChangePct !== null) lines.push({ section: "Money", item: "MRR change (%)", value: summary.mrrChangePct });
  for (const month of summary.revenueByMonth ?? []) lines.push({ section: "Revenue", item: month.month, value: month.amount });
  if (summary.revenueThisMonth !== null) lines.push({ section: "Revenue", item: "This month so far", value: summary.revenueThisMonth });
  for (const plan of summary.accountsByPlan ?? []) lines.push({ section: "Accounts by plan", item: plan.name, value: plan.count });
  for (const day of summary.signupsPerDay) lines.push({ section: "Sign-ups", item: day.date, value: day.count });
  return lines;
}

interface DashboardHeaderProps {
  name: string;
  // The hour in the platform's time zone, read on the server.
  hour: number;
  summary: IDashboardOverview;
}

// "Good afternoon, Nadia" (30px), today's date, and on the right the
// period the charts cover and "Download report", as the AdminDashboard
// board heads the page. The period lives in the URL (?period=), so the
// server reads it and a link keeps it.
export function DashboardHeader({ name, hour, summary }: DashboardHeaderProps) {
  const { translate, locale } = useLocale();
  const now = new Date();
  const today = `${translate(formatDate(now, "EEEE"))}, ${toLocaleDigits(formatDate(now, "d"), locale)} ${translate(formatDate(now, "MMMM"))} ${toLocaleDigits(formatDate(now, "yyyy"), locale)}`;

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[30px] leading-[1.2] font-semibold tracking-[-0.03em] text-ink max-sm:text-page-title">{translate(GREETING[dayPart(hour)], { name: firstName(name) })}</h1>
        <p className="text-body text-ink-muted">
          {today} · {translate("here is what needs you today.")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <nav aria-label={translate("Period")} className="flex gap-0.5 rounded-[9px] border border-line bg-surface p-0.75">
          {DASHBOARD_PERIODS.map((period) => {
            const on = period === summary.period;
            return (
              <Link
                key={period}
                href={period === "30d" ? ADMIN_HOME_ROUTE : `${ADMIN_HOME_ROUTE}?period=${period}`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-8 shrink-0 items-center rounded-full px-3 text-small whitespace-nowrap transition-colors pointer-coarse:h-10",
                  on ? "bg-forest font-semibold text-white" : "font-medium text-ink-2 hover:text-ink",
                )}
              >
                {toLocaleDigits(translate(PERIOD_LABEL[period]), locale)}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => downloadCsv(reportCsv(reportLines(summary)), datedFileName(`dashboard-${summary.period}`))}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-input bg-surface px-3.5 text-body font-semibold whitespace-nowrap text-ink transition-colors hover:bg-hover"
        >
          <Download className="size-4 text-ink-2" strokeWidth={2} aria-hidden="true" />
          {translate("Download report")}
        </button>
      </div>
    </div>
  );
}
