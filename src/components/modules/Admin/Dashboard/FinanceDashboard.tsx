"use client";

import { CreditCard } from "lucide-react";
import Link from "next/link";
import IconTile from "@/components/smartly/IconTile";
import { changePercent, monthKeyLabel } from "@/lib/adminDashboard";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import type { IPayment } from "@/types/payment.types";
import type { IPlanAnalytics, ISubscriptionPlan } from "@/types/plan.types";
import type { IChurnData, IRevenueSummary } from "@/types/revenue.types";
import { Greeting, Kpi, MiniBars, Section, SectionLink, Unavailable } from "./pieces";
import { PlanShareCard } from "./PlanShareCard";

export interface FinanceDashboardData {
  revenue: IRevenueSummary | null;
  churn: IChurnData | null;
  plans: IPlanAnalytics | null;
  planList: ISubscriptionPlan[] | null;
  // The newest failed payments, and how many there are in all.
  failed: IPayment[];
  failedTotal: number;
}

interface FinanceDashboardProps extends FinanceDashboardData {
  adminName: string;
  hour: number;
}

// The finance admin's dashboard: recurring revenue, what failed, and the
// plans the money comes from.
export function FinanceDashboard({ adminName, hour, revenue, churn, plans, planList, failed, failedTotal }: FinanceDashboardProps) {
  const { translate } = useLocale();
  const change = revenue ? changePercent(revenue.thisMonthRevenue, revenue.lastMonthRevenue) : null;
  const trend = revenue ? revenue.revenueTrend.slice(-6) : [];
  const money = (value: number | string) => formatCurrency(value, undefined, 0);

  return (
    <div className="flex flex-col gap-4">
      <Greeting name={adminName} hour={hour} line={translate("money that needs you today.")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={translate("MRR")} value={revenue ? money(revenue.mrr) : "—"} chip={change !== null ? { text: `${change >= 0 ? "+" : ""}${change}%`, tone: change >= 0 ? "income" : "expense" } : null} note={change !== null ? translate("vs last month") : undefined} />
        <Kpi label={translate("This month")} value={revenue ? money(revenue.thisMonthRevenue) : "—"} note={revenue ? `${translate("Last month")} ${money(revenue.lastMonthRevenue)}` : undefined} />
        <Kpi label={translate("Failed payments")} value={formatNumber(failedTotal)} chip={failedTotal > 0 ? { text: translate("Needs a look"), tone: "warning" } : null} note={translate("Waiting for a retry or a refund")} />
        <Kpi label={translate("Churn")} value={churn ? `${churn.churnRatePercent}%` : "—"} note={churn ? `${formatNumber(churn.churnedThisMonth)} ${translate("paid accounts lost this month")}` : undefined} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Section title={translate("MRR, last 6 months")} aside={translate("Recurring revenue from paid plans")}>
          {revenue === null ? <Unavailable>{translate("Money cards show once payments come in.")}</Unavailable> : trend.length === 0 ? <Unavailable>{translate("No revenue yet.")}</Unavailable> : <MiniBars label={translate("Revenue each month")} height={190} bars={trend.map((point, index) => ({ label: monthKeyLabel(point.month), value: point.amount, short: money(point.amount), highlight: index === trend.length - 1 }))} />}
        </Section>
        <Section title={translate("Needs you now")} aside={<SectionLink href="/admin/payments?view=failed">{translate("All failed payments")}</SectionLink>}>
          {failed.length === 0 ? (
            <Unavailable>{translate("No failed payment. Good.")}</Unavailable>
          ) : (
            <div className="flex flex-col">
              {failed.map((payment, index) => (
                <Link key={payment.id} href={`/admin/payments/${payment.id}`} className={`flex items-center gap-3 py-3 ${index > 0 ? "border-t border-surface-sunken" : ""}`}>
                  <IconTile size={36} tone="expense">
                    <CreditCard />
                  </IconTile>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-semibold text-ink">{payment.platformUser?.name ?? payment.platformUserId}</span>
                    <span className="truncate text-small text-ink-muted">
                      {payment.plan.name} · {formatDate(payment.createdAt, "d MMM")}
                      {payment.failureReason ? ` · ${payment.failureReason}` : ""}
                    </span>
                  </span>
                  <b className="text-expense tabular-nums">{formatCurrency(payment.amount, payment.currency)}</b>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={translate("Revenue by plan")}>
          {!revenue || revenue.revenueByPlan.length === 0 ? (
            <Unavailable>{translate("No revenue yet.")}</Unavailable>
          ) : (
            <div className="flex flex-col">
              {revenue.revenueByPlan.map((entry, index) => (
                <div key={entry.planId} className={`flex items-center justify-between gap-3 py-2.5 text-body ${index > 0 ? "border-t border-surface-sunken" : ""}`}>
                  <span className="text-ink">{entry.planName}</span>
                  <b className="text-ink tabular-nums">{money(entry.amount)}</b>
                </div>
              ))}
            </div>
          )}
        </Section>
        <PlanShareCard analytics={plans} plans={planList} />
      </div>
    </div>
  );
}
