import { Info } from "lucide-react";
import Kpi from "@/components/shared/Kpi";
import T from "@/components/shared/T";
import { formatCurrency } from "@/lib/currency";
import { formatMonthName } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { formatPercent } from "@/lib/number";
import type { IRevenueOverview } from "@/types/revenue.types";
import { getTranslator } from "@/lib/i18n/locale";

const money = (value: number) => formatCurrency(value, undefined, 0);

// The design's four figures: MRR, ARR, paid people, churn. They come from
// two places today (the plans workspaces are on, and payments), so a line
// under them says which is which until the API counts them one way.
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
          value={formatPercent(churn.churnRatePercent)}
          note={
            <span className={churn.churnedThisMonth > 0 ? "text-warning" : undefined}>
              {t("{left} of the {started} who started the month", { left: count(churn.churnedThisMonth), started: count(churn.startOfMonthPaidCount) })}
            </span>
          }
        />
      </div>
      <p className="flex items-start gap-2 text-small leading-relaxed text-ink-muted">
        <Info className="mt-0.5 size-3.75 shrink-0" aria-hidden="true" />
        <T>MRR, ARR and churn count the workspaces on paid plans now. The change on last month, the chart, paid people and the average per person come from payments, so the two can differ.</T>
      </p>
    </div>
  );
};

export default RevenueKpis;
