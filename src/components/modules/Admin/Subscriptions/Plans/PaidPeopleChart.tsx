import Card from "@/components/smartly/Card";
import { formatMonthKey } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import { planAccentClass } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";
import type { IPlanAnalytics } from "@/types/plan.types";

const CHART_HEIGHT = 170;
// Room above the tallest bar for its total.
const LABEL_ROOM = 24;

// The design's "Paid people at the end of each month": one stacked bar per
// month, a slice per paid plan, the total on top.
const PaidPeopleChart = ({ analytics }: { analytics: IPlanAnalytics }) => {
  const paidPlans = analytics.perPlan.filter((plan) => plan.billingCycle !== "FREE");
  const months = analytics.history.map((entry) => ({
    month: entry.month,
    total: paidPlans.reduce((sum, plan) => sum + (entry.perPlan[plan.planId] ?? 0), 0),
  }));
  const most = Math.max(1, ...months.map((entry) => entry.total));
  const scale = (CHART_HEIGHT - LABEL_ROOM) / most;
  const nobody = months.every((entry) => entry.total === 0);

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-title text-ink">Paid people at the end of each month</h2>
        <span className="flex flex-wrap gap-4 text-small text-ink-2">
          {paidPlans.map((plan) => (
            <span key={plan.planId} className="flex items-center gap-1">
              <span className={cn("size-2.5 rounded-[3px]", planAccentClass(plan.planName))} aria-hidden="true" />
              {plan.planName}
            </span>
          ))}
        </span>
      </div>
      {nobody ? (
        <p className="py-8 text-center text-small text-ink-muted">Nobody has paid for a plan in these months yet.</p>
      ) : (
        <>
          <div role="img" aria-label="Paid people per plan at the end of each month" className="flex items-end gap-8 border-b border-line px-3" style={{ height: CHART_HEIGHT }}>
            {analytics.history.map((entry, index) => (
              <span key={entry.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-caption font-bold text-ink tabular-nums">{formatNumber(months[index].total)}</span>
                <span className="flex w-full max-w-16 flex-col overflow-hidden rounded-t-[5px]">
                  {[...paidPlans].reverse().map((plan) => {
                    const people = entry.perPlan[plan.planId] ?? 0;
                    return (
                      <span
                        key={plan.planId}
                        title={`${plan.planName}: ${formatNumber(people)}`}
                        className={planAccentClass(plan.planName)}
                        style={{ height: `${Math.round(people * scale)}px` }}
                      />
                    );
                  })}
                </span>
              </span>
            ))}
          </div>
          <div className="-mt-1.5 flex gap-8 px-3">
            {analytics.history.map((entry) => (
              <span key={entry.month} className="flex-1 text-center text-caption text-ink-muted">
                {formatMonthKey(entry.month, false)}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

export default PaidPeopleChart;
