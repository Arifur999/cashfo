import Card from "@/components/smartly/Card";
import { countPhrase } from "@/components/modules/Admin/Payments/paymentsDisplay";
import { formatCurrency } from "@/lib/currency";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { formatMonthName } from "@/lib/date";
import { planAccentClass } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";
import type { IRevenueOverview } from "@/types/revenue.types";
import T from "@/components/shared/T";
import { getTranslator } from "@/lib/i18n/locale";

// This month's takings by plan: how many payments, how much, what share.
const ByPlanCard = async ({ overview }: { overview: IRevenueOverview }) => {
  const { t, locale } = await getTranslator("admin");
  const total = Number(overview.thisMonthTotal);
  const refunds = overview.refundsThisMonth;

  return (
    <Card padding="none" className="flex flex-col gap-4 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-title text-ink">{t("{month} by plan", { month: t(formatMonthName(overview.month)) })}</h2>
        <b className="text-body font-semibold text-ink tabular-nums">{formatCurrency(total, undefined, 0, locale)}</b>
      </div>
      {overview.byPlan.length === 0 ? (
        <p className="text-small text-ink-muted"><T>No payments yet this month.</T></p>
      ) : (
        overview.byPlan.map((plan) => {
          const amount = Number(plan.amount);
          const share = total > 0 ? (amount / total) * 100 : 0;
          return (
            <div key={plan.planId} className="flex flex-col gap-2">
              <div className="flex justify-between gap-3 text-body">
                <span>
                  <b className="font-semibold text-ink">{plan.planName}</b>{" "}
                  <span className="text-ink-muted">{countPhrase(t, locale, plan.payments, "{count} payment", "{count} payments")}</span>
                </span>
                <span className="tabular-nums">
                  <b className="font-semibold text-ink">{formatCurrency(amount, undefined, 0, locale)}</b> <span className="text-ink-muted">{toLocaleDigits(`${Math.round(share)}%`, locale)}</span>
                </span>
              </div>
              <span className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
                <span className={cn("block h-full rounded-full", planAccentClass(plan.planName))} style={{ width: `${share}%` }} />
              </span>
            </div>
          );
        })
      )}
      {/* Every refund made this month, on this month's payments or older ones:
          the total above only nets the ones on this month's payments. */}
      {refunds.count > 0 && (
        <span className="text-small text-ink-muted">
          {countPhrase(t, locale, refunds.count, "{count} refund this month: {amount}", "{count} refunds this month: {amount}", { amount: formatCurrency(refunds.amount, undefined, 0, locale) })}
        </span>
      )}
    </Card>
  );
};

export default ByPlanCard;
