"use client";

import { CreditCard } from "lucide-react";
import IconTile from "@/components/smartly/IconTile";
import { ListCell, ListRow, ListRowLink } from "@/components/smartly/list";
import { formatAmount } from "@/lib/currency";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import type { IPayment } from "@/types/payment.types";
import type { IPlanAnalytics, ISubscriptionPlan } from "@/types/plan.types";
import type { IChurnData, IRevenueOverview, IRevenueSummary } from "@/types/revenue.types";
import { dayLabel, monthLabel, shortMonth } from "./dashboardDates";
import { allZero, compactMoney } from "./dashboardFigures";
import { COULD_NOT_LOAD, Greeting, Kpi, LoadFailed, MiniBars, SECTION_ROW, Section, SectionLink, SectionTable, Unavailable } from "./pieces";
import { PlanShareCard, planRows } from "./PlanShareCard";

// Every null below is a call that failed: the card says so rather than
// showing an empty or all-clear state.
export interface FinanceDashboardData {
  revenue: IRevenueSummary | null;
  // MRR at each month end, and its change on the month end before.
  overview: IRevenueOverview | null;
  churn: IChurnData | null;
  plans: IPlanAnalytics | null;
  planList: ISubscriptionPlan[] | null;
  // The newest failed payments, and how many there are in all.
  failed: { rows: IPayment[]; total: number } | null;
}

interface FinanceDashboardProps extends FinanceDashboardData {
  adminName: string;
  hour: number;
}

const ROW = cn(SECTION_ROW, "grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3");

// The finance admin's dashboard: recurring revenue, what failed, and the
// plans the money comes from.
export function FinanceDashboard({ adminName, hour, revenue, overview, churn, plans, planList, failed }: FinanceDashboardProps) {
  const { translate, locale } = useLocale();
  const change = overview?.mrrChangePct ?? null;
  // Both answers carry the same live MRR, so either one can show it.
  const mrr = revenue?.mrr ?? overview?.mrr ?? null;
  const history = overview?.mrrHistory ?? [];
  // The biggest earner first; the API lists them by their first payment.
  const byPlan = revenue ? [...revenue.revenueByPlan].sort((a, b) => b.amount - a.amount) : [];

  return (
    <div className="flex flex-col gap-4">
      <Greeting name={adminName} hour={hour} line={translate("money that needs you today.")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="MRR"
          value={mrr !== null ? formatAmount(mrr, undefined, locale) : "—"}
          chip={change !== null ? { text: `${change > 0 ? "+" : ""}${toLocaleDigits(`${change}%`, locale)}`, tone: change > 0 ? "income" : change < 0 ? "expense" : "neutral" } : null}
          note={change !== null ? "vs last month" : mrr !== null ? undefined : COULD_NOT_LOAD}
        />
        {/* Only part of the month is in, so it gets no change on the last. */}
        <Kpi
          label="This month so far"
          value={revenue ? formatAmount(revenue.thisMonthRevenue, undefined, locale) : "—"}
          note={revenue ? translate("{amount} last month", { amount: formatAmount(revenue.lastMonthRevenue, undefined, locale) }) : COULD_NOT_LOAD}
        />
        <Kpi
          label="Failed payments"
          value={failed ? formatCount(failed.total, locale) : "—"}
          chip={failed && failed.total > 0 ? { text: translate("Needs a look"), tone: "warning" } : null}
          note={failed ? "Waiting for a retry" : COULD_NOT_LOAD}
        />
        <Kpi
          label="Churn"
          value={churn ? toLocaleDigits(`${churn.churnRatePercent}%`, locale) : "—"}
          note={
            churn
              ? plural(translate, churn.churnedThisMonth, "{count} paid workspace lost this month", "{count} paid workspaces lost this month", { count: formatCount(churn.churnedThisMonth, locale) })
              : COULD_NOT_LOAD
          }
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Section title={translate("MRR, last 6 months")} aside={translate("Recurring revenue from paid plans")}>
          {overview === null ? (
            <LoadFailed />
          ) : allZero(history.map((point) => point.mrr)) ? (
            <Unavailable>{translate("No revenue yet.")}</Unavailable>
          ) : (
            <MiniBars
              label="MRR, last 6 months"
              height={190}
              bars={history.map((point, index) => ({
                label: shortMonth(point.month, locale),
                value: point.mrr,
                short: toLocaleDigits(compactMoney(point.mrr, locale), locale),
                highlight: index === history.length - 1,
                spoken: `${monthLabel(point.month, locale, translate)} ${formatAmount(point.mrr, undefined, locale)}`,
              }))}
            />
          )}
        </Section>
        <Section title={translate("Needs you now")} aside={<SectionLink href="/admin/payments?status=FAILED">{translate("All failed payments")}</SectionLink>} flush={Boolean(failed && failed.rows.length > 0)}>
          {failed === null ? (
            <LoadFailed />
          ) : failed.rows.length === 0 ? (
            <Unavailable>{translate("No failed payment. Good.")}</Unavailable>
          ) : (
            <SectionTable label={translate("Failed payments")}>
              {failed.rows.map((payment) => (
                <ListRow key={payment.id} className={ROW}>
                  <ListCell>
                    <IconTile size={36} tone="expense">
                      <CreditCard />
                    </IconTile>
                  </ListCell>
                  <ListCell className="flex flex-col">
                    <ListRowLink href={`/admin/payments/${payment.id}`} className="truncate text-body font-semibold text-ink">
                      {payment.platformUser?.name ?? payment.platformUserId}
                    </ListRowLink>
                    <span className="truncate text-small text-ink-muted">
                      {[payment.plan.name, dayLabel(payment.createdAt, locale), payment.failureReason].filter(Boolean).join(" · ")}
                    </span>
                  </ListCell>
                  <ListCell align="end" className="font-bold text-expense tabular-nums">
                    {formatAmount(payment.amount, payment.currency, locale)}
                  </ListCell>
                </ListRow>
              ))}
            </SectionTable>
          )}
        </Section>
      </div>

      {/* The row above's split, so the gutter runs straight down both rows. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Section title={translate("Revenue by plan")} aside={translate("Last 12 months")} flush={byPlan.length > 0}>
          {revenue === null ? (
            <LoadFailed />
          ) : byPlan.length === 0 ? (
            <Unavailable>{translate("No revenue yet.")}</Unavailable>
          ) : (
            <SectionTable label={translate("Revenue by plan")}>
              {byPlan.map((entry) => (
                <ListRow key={entry.planId} density="dense" className={cn(SECTION_ROW, "py-2")}>
                  <ListCell className="text-ink">{entry.planName}</ListCell>
                  <ListCell align="end" className="font-bold text-ink tabular-nums">
                    {formatAmount(entry.amount, undefined, locale)}
                  </ListCell>
                </ListRow>
              ))}
            </SectionTable>
          )}
        </Section>
        {plans === null ? (
          <Section title={translate("Accounts by plan")}>
            <LoadFailed />
          </Section>
        ) : (
          <PlanShareCard plans={planRows(plans, planList)} deletedLeftOut={null} />
        )}
      </div>
    </div>
  );
}
