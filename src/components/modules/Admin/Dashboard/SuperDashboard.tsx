"use client";

import { Bug, CreditCard, MessageCircle, ShieldAlert } from "lucide-react";
import { changePercent, monthKeyLabel } from "@/lib/adminDashboard";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import type { IDashboardSummary } from "@/types/dashboard.types";
import type { IPlanAnalytics, ISubscriptionPlan } from "@/types/plan.types";
import type { IRevenueSummary } from "@/types/revenue.types";
import type { ITicketStats } from "@/types/ticket.types";
import { ActivityCard } from "./ActivityCard";
import { Greeting, Kpi, MiniBars, NeedsYou, Section, Unavailable, type Attention } from "./pieces";
import { PlanShareCard } from "./PlanShareCard";
import { SystemCard, type SystemState } from "./SystemCard";

export interface SuperDashboardData {
  summary: IDashboardSummary;
  tickets: ITicketStats | null;
  failedPayments: number | null;
  revenue: IRevenueSummary | null;
  plans: IPlanAnalytics | null;
  planList: ISubscriptionPlan[] | null;
  system: SystemState | null;
}

interface SuperDashboardProps extends SuperDashboardData {
  adminName: string;
  hour: number;
}

// The super admin's dashboard: what needs action first, then users, money
// and system health.
export function SuperDashboard({ adminName, hour, summary, tickets, failedPayments, revenue, plans, planList, system }: SuperDashboardProps) {
  const { translate } = useLocale();
  const change = revenue ? changePercent(revenue.thisMonthRevenue, revenue.lastMonthRevenue) : null;
  const trend = revenue ? revenue.revenueTrend.slice(-6) : [];
  const attention: Attention[] = [
    { count: summary.openTickets, title: translate("Tickets waiting"), sub: tickets ? `${tickets.urgentCount} ${translate("marked urgent")}` : translate("Open, waiting for review"), link: translate("Open inbox"), href: "/admin/support?status=OPEN", icon: <MessageCircle />, tone: "info" },
    ...(failedPayments !== null ? [{ count: failedPayments, title: translate("Failed payments"), sub: translate("Waiting for a retry or a refund"), link: translate("See payments"), href: "/admin/payments?view=failed", icon: <CreditCard />, tone: "expense" as const }] : []),
    ...(summary.pendingFlags !== null ? [{ count: summary.pendingFlags, title: translate("Security flags"), sub: translate("Open, waiting for review"), link: translate("Review flags"), href: "/admin/security/flags", icon: <ShieldAlert />, tone: "expense" as const }] : []),
    ...(system?.unresolvedErrors !== null && system?.unresolvedErrors !== undefined ? [{ count: system.unresolvedErrors, title: translate("New errors"), sub: translate("Not fixed yet"), link: translate("Error log"), href: "/admin/system/errors", icon: <Bug />, tone: "neutral" as const }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <Greeting name={adminName} hour={hour} line={translate("here is what needs you today.")} />
      <NeedsYou items={attention} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={translate("Total users")} value={formatNumber(summary.totalUsers)} chip={{ text: `+${formatNumber(summary.newUsersLast30d)}`, tone: "income" }} note={translate("in 30 days")} />
        <Kpi label={translate("Paid users")} value={plans ? formatNumber(plans.summary.paidUsers) : "—"} chip={plans ? { text: `${plans.summary.paidPercentage}%`, tone: "neutral" } : null} note={plans ? translate("of accounts") : translate("Money cards show once payments come in.")} />
        <Kpi label={translate("MRR")} value={summary.mrr !== null ? formatCurrency(summary.mrr, undefined, 0) : "—"} chip={change !== null ? { text: `${change >= 0 ? "+" : ""}${change}%`, tone: change >= 0 ? "income" : "expense" } : null} note={change !== null ? translate("vs last month") : undefined} />
        <Kpi label={translate("Open tickets")} value={formatNumber(summary.openTickets)} chip={tickets ? { text: `${tickets.inProgressCount} ${translate("In progress")}`, tone: "neutral" } : null} note={tickets ? `${tickets.urgentCount} ${translate("urgent")}` : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Section title={translate("Revenue, last 6 months")} aside={revenue && <>{translate("This month")} <b className="text-ink">{formatCurrency(revenue.thisMonthRevenue, undefined, 0)}</b>{change !== null && <span className={change >= 0 ? "font-semibold text-emerald" : "font-semibold text-expense"}> {change >= 0 ? "+" : ""}{change}%</span>}</>}>
          {revenue === null ? <Unavailable>{translate("Money cards show once payments come in.")}</Unavailable> : trend.length === 0 ? <Unavailable>{translate("No revenue yet.")}</Unavailable> : <MiniBars label={translate("Revenue each month")} bars={trend.map((point, index) => ({ label: monthKeyLabel(point.month), value: point.amount, short: formatCurrency(point.amount, undefined, 0), highlight: index === trend.length - 1 }))} />}
        </Section>
        <PlanShareCard analytics={plans} plans={planList} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
        <ActivityCard logs={summary.recentAuditLogs} />
        <SystemCard state={system} />
      </div>
    </div>
  );
}
