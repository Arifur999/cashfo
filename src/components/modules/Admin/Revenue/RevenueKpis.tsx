import Kpi from "@/components/shared/Kpi";
import { formatCurrency } from "@/lib/currency";
import { formatMonthName } from "@/lib/date";
import { formatNumber, formatPercent } from "@/lib/number";
import type { IRevenueOverview } from "@/types/revenue.types";

const money = (value: number) => formatCurrency(value, undefined, 0);

// The design's four figures: MRR, ARR, paid people, churn.
const RevenueKpis = ({ overview }: { overview: IRevenueOverview }) => {
  const month = formatMonthName(overview.month);
  const change = overview.mrrChangePct;
  const { paidPeople, churn } = overview;
  const delta = paidPeople.joinedThisMonth - paidPeople.leftThisMonth;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        size="sm"
        label="MRR"
        value={money(overview.mrr)}
        note={
          change === null ? (
            "Monthly recurring revenue"
          ) : (
            <span className={change >= 0 ? "text-emerald" : "text-expense"}>
              {change >= 0 ? "Up" : "Down"} {Math.abs(change)}% on last month
            </span>
          )
        }
      />
      <Kpi size="sm" label="ARR" value={money(overview.arr)} note="MRR × 12" />
      <Kpi
        size="sm"
        label="Paid people"
        value={formatNumber(paidPeople.now)}
        note={`${delta >= 0 ? "+" : ""}${formatNumber(delta)} in ${month}: ${formatNumber(paidPeople.joinedThisMonth)} joined, ${formatNumber(paidPeople.leftThisMonth)} left`}
      />
      <Kpi
        size="sm"
        label={`Churn, ${month}`}
        value={formatPercent(churn.churnRatePercent)}
        note={
          <span className={churn.churnedThisMonth > 0 ? "text-warning" : undefined}>
            {formatNumber(churn.churnedThisMonth)} of the {formatNumber(churn.startOfMonthPaidCount)} who started the month
          </span>
        }
      />
    </div>
  );
};

export default RevenueKpis;
