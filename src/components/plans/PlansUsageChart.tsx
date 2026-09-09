import type { PlanAnalytics } from "@/lib/api";
import { t } from "@/lib/i18n/t";

interface PlansUsageChartProps {
  analytics: PlanAnalytics;
}

export function PlansUsageChart({ analytics }: PlansUsageChartProps) {
  const maxUsers = Math.max(...analytics.perPlan.map((p) => p.totalUsers), 1);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900">{t("Users per Plan")}</h2>
        <p className="text-xs text-neutral-400">
          {analytics.summary.freePercentage}% {t("free")} · {analytics.summary.paidPercentage}% {t("paid")} ·{" "}
          {analytics.summary.totalRevenueEstimate} {t("BDT est. revenue")}
        </p>
      </div>
      <div className="space-y-3">
        {analytics.perPlan.map((plan) => (
          <div key={plan.planId} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-sm text-neutral-600">{plan.planName}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-brand-primary"
                style={{ width: `${(plan.totalUsers / maxUsers) * 100}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs text-neutral-500">{plan.totalUsers}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
