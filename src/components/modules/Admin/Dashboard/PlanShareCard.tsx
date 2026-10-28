"use client";

import { formatAmount } from "@/lib/currency";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import type { IDashboardPlanRow } from "@/types/dashboard.types";
import type { IPlanAnalytics, ISubscriptionPlan } from "@/types/plan.types";
import { Section, Unavailable } from "./pieces";

// The plans in their own order, as the board colours them: the free plan
// grey, then the primary, forest and amber, and more after those.
const COLORS = ["bg-input", "bg-emerald", "bg-forest", "bg-warning-fill", "bg-info", "bg-pillar-loans"];

interface PlanShareCardProps {
  plans: IDashboardPlanRow[];
  // Deleted accounts, which the shares leave out.
  deletedLeftOut: number | null;
}

// Accounts by plan: one stacked bar, then a row per plan with its price,
// count and share; the deleted accounts left out are named at the foot.
export function PlanShareCard({ plans, deletedLeftOut }: PlanShareCardProps) {
  const { translate, locale } = useLocale();
  const title = translate("Accounts by plan");
  return (
    <Section title={title} className="h-full">
      {plans.length === 0 ? (
        <Unavailable>{translate("No plans yet.")}</Unavailable>
      ) : (
        <>
          <div role="img" aria-label={title} className="flex h-3 overflow-hidden rounded-full bg-surface-sunken">
            {plans.map((plan, index) =>
              plan.pct > 0 ? <span key={plan.planId} className={cn("h-full", COLORS[index % COLORS.length])} style={{ width: `${plan.pct}%` }} /> : null,
            )}
          </div>
          <div className="flex flex-col gap-3">
            {plans.map((plan, index) => (
              <div key={plan.planId} className="flex items-center gap-2.5 text-[13.5px] leading-[normal]">
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-[3px]", COLORS[index % COLORS.length])} />
                <span className="min-w-0 flex-1 truncate text-ink">
                  {plan.name} <span className="text-ink-faint">{formatAmount(plan.price, undefined, locale)}</span>
                </span>
                <span className="font-semibold text-ink tabular-nums">{formatCount(plan.count, locale)}</span>
                <span className="w-12 text-right text-ink-muted tabular-nums">{toLocaleDigits(`${plan.pct}%`, locale)}</span>
              </div>
            ))}
          </div>
          {deletedLeftOut !== null && deletedLeftOut > 0 && (
            <span className="mt-auto text-[12.5px] leading-[normal] text-ink-muted">
              {plural(translate, deletedLeftOut, "{count} deleted account is left out.", "{count} deleted accounts are left out.", undefined, locale)}
            </span>
          )}
        </>
      )}
    </Section>
  );
}

// The plan analytics (GET /admin/plans/analytics) as the card's rows, for
// the finance dashboard: each plan with its price from the plan list.
export function planRows(analytics: IPlanAnalytics, plans: ISubscriptionPlan[] | null): IDashboardPlanRow[] {
  const total = analytics.perPlan.reduce((sum, plan) => sum + plan.totalUsers, 0);
  return analytics.perPlan.map((entry) => ({
    planId: entry.planId,
    name: entry.planName,
    price: plans?.find((plan) => plan.id === entry.planId)?.price ?? "0",
    billingCycle: entry.billingCycle,
    count: entry.totalUsers,
    pct: total > 0 ? Math.round((entry.totalUsers / total) * 1000) / 10 : 0,
  }));
}
