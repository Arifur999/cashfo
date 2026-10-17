import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/currency";
import { formatMonthName } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import { planAccentClass } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";
import type { IRevenueOverview } from "@/types/revenue.types";

// This month's takings by plan: how many payments, how much, what share.
const ByPlanCard = ({ overview }: { overview: IRevenueOverview }) => {
  const total = Number(overview.thisMonthTotal);
  const refunds = overview.refundsThisMonth;

  return (
    <Card padding="none" className="flex flex-col gap-4 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-title text-ink">{formatMonthName(overview.month)} by plan</h2>
        <b className="text-body font-semibold text-ink tabular-nums">{formatCurrency(total, undefined, 0)}</b>
      </div>
      {overview.byPlan.length === 0 ? (
        <p className="text-small text-ink-muted">No payments yet this month.</p>
      ) : (
        overview.byPlan.map((plan) => {
          const amount = Number(plan.amount);
          const share = total > 0 ? (amount / total) * 100 : 0;
          return (
            <div key={plan.planId} className="flex flex-col gap-2">
              <div className="flex justify-between gap-3 text-body">
                <span>
                  <b className="font-semibold text-ink">{plan.planName}</b>{" "}
                  <span className="text-ink-muted">
                    {formatNumber(plan.payments)} {plan.payments === 1 ? "payment" : "payments"}
                  </span>
                </span>
                <span className="tabular-nums">
                  <b className="font-semibold text-ink">{formatCurrency(amount, undefined, 0)}</b> <span className="text-ink-muted">{Math.round(share)}%</span>
                </span>
              </div>
              <span className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
                <span className={cn("block h-full rounded-full", planAccentClass(plan.planName))} style={{ width: `${share}%` }} />
              </span>
            </div>
          );
        })
      )}
      {refunds.count > 0 && (
        <span className="text-small text-ink-muted">
          After {formatNumber(refunds.count)} {refunds.count === 1 ? "refund" : "refunds"} of {formatCurrency(refunds.amount, undefined, 0)}.
        </span>
      )}
    </Card>
  );
};

export default ByPlanCard;
