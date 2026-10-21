"use client";

import { Bug, CreditCard, MessageCircle, ShieldAlert } from "lucide-react";
import T from "@/components/shared/T";
import { formatAmount } from "@/lib/currency";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { IAnalyticsSummary } from "@/types/analytics.types";
import type { IDashboardSummary } from "@/types/dashboard.types";
import type { IPlanAnalytics, ISubscriptionPlan } from "@/types/plan.types";
import type { IRevenueOverview, IRevenueSummary } from "@/types/revenue.types";
import type { ITicketStats } from "@/types/ticket.types";
import { ActivityCard } from "./ActivityCard";
import { monthLabel, shortMonth } from "./dashboardDates";
import { allZero, compactMoney } from "./dashboardFigures";
import { COULD_NOT_LOAD, Greeting, Kpi, LoadFailed, MiniBars, NeedsYou, Section, Unavailable, type Attention, type ChipTone } from "./pieces";
import { PlanShareCard } from "./PlanShareCard";
import { SystemCard, type SystemState } from "./SystemCard";

// Every null below is a call that failed: the card says so rather than
// showing an empty or all-clear state.
export interface SuperDashboardData {
  summary: IDashboardSummary;
  // Who used the app lately, from the analytics summary.
  activity: IAnalyticsSummary | null;
  tickets: ITicketStats | null;
  failedPayments: number | null;
  revenue: IRevenueSummary | null;
  // For the MRR's change: month end against the month end before.
  overview: IRevenueOverview | null;
  plans: IPlanAnalytics | null;
  planList: ISubscriptionPlan[] | null;
  system: SystemState | null;
}

interface SuperDashboardProps extends SuperDashboardData {
  adminName: string;
  hour: number;
}

// Two KPIs to a row on a phone (a 171px card at 390px): there the figure
// steps down to h2 with a little less inset, so a lakh-sized MRR still fits.
// A longer figure (a crore, or a lakh with paisa) can't wrap, so it steps
// down once more to h3.
const PHONE_KPI = "max-sm:px-4 max-sm:[&>span:nth-child(2)]:text-h2";
const PHONE_KPI_LONG = "max-sm:[&>span:nth-child(2)]:text-h3";

// A change is good news only when it is above zero: no change is grey.
const changeTone = (value: number): ChipTone => (value > 0 ? "income" : value < 0 ? "expense" : "neutral");

// The super admin's dashboard: what needs action first, then users, money
// and system health.
export function SuperDashboard({ adminName, hour, summary, activity, tickets, failedPayments, revenue, overview, plans, planList, system }: SuperDashboardProps) {
  const { translate, locale } = useLocale();
  const count = (value: number) => formatCount(value, locale);
  const percent = (value: number) => toLocaleDigits(`${value}%`, locale);
  const change = overview?.mrrChangePct ?? null;
  const mrrText = summary.mrr !== null ? formatAmount(summary.mrr) : "—";
  const trend = revenue ? revenue.revenueTrend.slice(-6) : [];
  const attention: Attention[] = [
    {
      count: tickets ? tickets.openCount : null,
      title: translate("Tickets with no reply"),
      sub: tickets ? translate("{count} with no one assigned", { count: count(tickets.unassignedOpenCount) }) : "",
      link: translate("Open inbox"),
      href: "/admin/support?status=OPEN",
      icon: <MessageCircle />,
      tone: "info",
    },
    { count: failedPayments, title: translate("Failed payments"), sub: translate("Waiting for a retry"), link: translate("See payments"), href: "/admin/payments?status=FAILED", icon: <CreditCard />, tone: "expense" },
    // The summary leaves flags out (null) for a role that can't review them.
    ...(summary.pendingFlags !== null
      ? [{ count: summary.pendingFlags, title: translate("Security flags"), sub: translate("Open, waiting for review"), link: translate("Review flags"), href: "/admin/security/flags", icon: <ShieldAlert />, tone: "expense" as const }]
      : []),
    { count: system ? system.unresolvedErrors : null, title: translate("New errors"), sub: translate("Last 24 hours, not fixed yet"), link: translate("Error log"), href: "/admin/system/errors?within=24h", icon: <Bug />, tone: "neutral" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Greeting name={adminName} hour={hour} line={translate("here is what needs you today.")} />
      <NeedsYou items={attention} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi
          label="Total users"
          value={count(summary.totalUsers)}
          chip={{ text: summary.newUsersLast30d > 0 ? `+${count(summary.newUsersLast30d)}` : count(0), tone: changeTone(summary.newUsersLast30d) }}
          note="in 30 days"
          className={PHONE_KPI}
        />
        {/* Each share names what it is a share of: the totals come from different counts. */}
        <Kpi
          label="Active in 30 days"
          value={activity ? count(activity.activeLast30d) : "—"}
          chip={activity && activity.totalAccounts > 0 ? { text: percent(Math.round((activity.activeLast30d / activity.totalAccounts) * 100)), tone: "neutral" } : null}
          note={activity ? translate("of {total} accounts", { total: count(activity.totalAccounts) }) : COULD_NOT_LOAD}
          className={PHONE_KPI}
        />
        <Kpi
          label="Paid users"
          value={plans ? count(plans.summary.paidUsers) : "—"}
          chip={plans ? { text: percent(plans.summary.paidPercentage), tone: "neutral" } : null}
          note={plans ? translate("of {total} accounts", { total: count(plans.summary.totalUsers) }) : COULD_NOT_LOAD}
          className={PHONE_KPI}
        />
        <Kpi
          label="MRR"
          value={mrrText}
          chip={change !== null ? { text: `${change > 0 ? "+" : ""}${percent(change)}`, tone: changeTone(change) } : null}
          note={change !== null ? "vs last month" : undefined}
          className={cn(PHONE_KPI, mrrText.length > 11 && PHONE_KPI_LONG)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* The month still running is only part of a month, so it gets no change on the last. */}
        <Section title={translate("Revenue, last 6 months")} aside={revenue && <T values={{ amount: <b className="text-ink">{formatAmount(revenue.thisMonthRevenue)}</b> }}>{"So far this month {amount}"}</T>}>
          {revenue === null ? (
            <LoadFailed />
          ) : allZero(trend.map((point) => point.amount)) ? (
            <Unavailable>{translate("No revenue yet.")}</Unavailable>
          ) : (
            <MiniBars
              label="Revenue, last 6 months"
              bars={trend.map((point, index) => ({
                label: shortMonth(point.month, locale),
                value: point.amount,
                short: compactMoney(point.amount),
                highlight: index === trend.length - 1,
                spoken: `${monthLabel(point.month, locale, translate)} ${formatAmount(point.amount)}`,
              }))}
            />
          )}
        </Section>
        <PlanShareCard analytics={plans} plans={planList} />
      </div>

      {/* The revenue row's split, so the gutter runs straight down both rows. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <ActivityCard logs={summary.recentAuditLogs} />
        <SystemCard state={system} />
      </div>
    </div>
  );
}
