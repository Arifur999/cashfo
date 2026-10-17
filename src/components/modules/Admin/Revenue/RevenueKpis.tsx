import Kpi from "@/components/shared/Kpi";
import { formatCurrency } from "@/lib/currency";
import { formatMonthName } from "@/lib/date";
import { formatNumber, formatPercent } from "@/lib/number";
import type { IRevenueOverview } from "@/types/revenue.types";
import { getTranslator } from "@/lib/i18n/locale";

const money = (value: number) => formatCurrency(value, undefined, 0);

// The design's four figures: MRR, ARR, paid people, churn.
const RevenueKpis = async ({ overview }: { overview: IRevenueOverview }) => {
  const { t } = await getTranslator("admin");
  const month = t(formatMonthName(overview.month));
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
              {t(change >= 0 ? "Up {percent}% on last month" : "Down {percent}% on last month", { percent: Math.abs(change) })}
            </span>
          )
        }
      />
      <Kpi size="sm" label="ARR" value={money(overview.arr)} note="MRR × 12" />
      <Kpi
        size="sm"
        label="Paid people"
        value={formatNumber(paidPeople.now)}
        note={t("{change} in {month}: {joined} joined, {left} left", {
          change: `${delta >= 0 ? "+" : ""}${formatNumber(delta)}`,
          month,
          joined: formatNumber(paidPeople.joinedThisMonth),
          left: formatNumber(paidPeople.leftThisMonth),
        })}
      />
      <Kpi
        size="sm"
        label={t("Churn, {month}", { month })}
        value={formatPercent(churn.churnRatePercent)}
        note={
          <span className={churn.churnedThisMonth > 0 ? "text-warning" : undefined}>
            {t("{left} of the {started} who started the month", { left: formatNumber(churn.churnedThisMonth), started: formatNumber(churn.startOfMonthPaidCount) })}
          </span>
        }
      />
    </div>
  );
};

export default RevenueKpis;
