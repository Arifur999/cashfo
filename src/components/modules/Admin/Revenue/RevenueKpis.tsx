import Kpi from "@/components/shared/Kpi";
import { formatCurrency } from "@/lib/currency";
import { formatMonthName } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { formatPercent } from "@/lib/number";
import type { IRevenueOverview } from "@/types/revenue.types";
import { getTranslator } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n/translate";

const money = (value: number, locale: Locale) => formatCurrency(value, undefined, 0, locale);

// The design's four figures: MRR, ARR, paid people, churn. MRR, ARR and
// churn count the plans people are on; the change, paid people and the
// chart come from payments (the API counts them one way in time).
const RevenueKpis = async ({ overview }: { overview: IRevenueOverview }) => {
  const { t, locale } = await getTranslator("admin");
  const month = t(formatMonthName(overview.month));
  const change = overview.mrrChangePct;
  const { paidPeople, churn } = overview;
  const delta = paidPeople.joinedThisMonth - paidPeople.leftThisMonth;
  const count = (value: number) => formatCount(value, locale);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          size="sm"
          label="MRR"
          value={money(overview.mrr, locale)}
          note={
            change === null ? (
              "Monthly recurring revenue"
            ) : (
              <span className={change >= 0 ? "text-emerald" : "text-expense"}>
                {t(change >= 0 ? "Up {percent}% on last month" : "Down {percent}% on last month", { percent: toLocaleDigits(String(Math.abs(change)), locale) })}
              </span>
            )
          }
        />
        <Kpi size="sm" label="ARR" value={money(overview.arr, locale)} note="MRR × 12" />
        <Kpi
          size="sm"
          label="Paid people"
          value={count(paidPeople.now)}
          note={t("{change} in {month}: {joined} joined, {left} left", {
            change: `${delta >= 0 ? "+" : "-"}${count(Math.abs(delta))}`,
            month,
            joined: count(paidPeople.joinedThisMonth),
            left: count(paidPeople.leftThisMonth),
          })}
        />
        <Kpi
          size="sm"
          label={t("Churn, {month}", { month })}
          value={toLocaleDigits(formatPercent(churn.churnRatePercent), locale)}
          note={
            <span className={churn.churnedThisMonth > 0 ? "text-warning" : undefined}>
              {t("{left} of the {started} who started the month", { left: count(churn.churnedThisMonth), started: count(churn.startOfMonthPaidCount) })}
            </span>
          }
        />
      </div>
    </div>
  );
};

export default RevenueKpis;
