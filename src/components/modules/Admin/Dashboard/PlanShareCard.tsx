"use client";

import { planShares } from "@/lib/adminDashboard";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import type { IPlanAnalytics } from "@/types/plan.types";
import type { ISubscriptionPlan } from "@/types/plan.types";
import { Section, Unavailable } from "./pieces";

interface PlanShareCardProps {
  analytics: IPlanAnalytics | null;
  // The plans themselves, for each one's price beside its name.
  plans?: ISubscriptionPlan[] | null;
}

// Accounts by plan: one stacked bar, then a row per plan with its price,
// count and share.
export function PlanShareCard({ analytics, plans }: PlanShareCardProps) {
  const { translate } = useLocale();
  const shares = analytics ? planShares(analytics.perPlan) : [];
  const price = (name: string) => {
    const plan = plans?.find((candidate) => candidate.name === name);
    return plan ? formatCurrency(plan.price, plan.currency, 0) : null;
  };
  return (
    <Section title={translate("Accounts by plan")} className="h-full">
      {analytics === null ? (
        <Unavailable>{translate("Money cards show once payments come in.")}</Unavailable>
      ) : shares.length === 0 ? (
        <Unavailable>{translate("No plans yet.")}</Unavailable>
      ) : (
        <>
          <div role="img" aria-label={translate("Accounts by plan")} className="flex h-3 overflow-hidden rounded-full bg-surface-sunken">
            {shares
              .filter((share) => share.pct > 0)
              .map((share) => (
                <span key={share.name} className={cn("h-full", share.color)} style={{ width: `${share.pct}%` }} />
              ))}
          </div>
          <div className="flex flex-col gap-2">
            {shares.map((share) => (
              <div key={share.name} className="flex items-center gap-3 text-body">
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-[3px]", share.color)} />
                <span className="flex-1 truncate text-ink">
                  {share.name} {price(share.name) && <span className="text-ink-muted">{price(share.name)}</span>}
                </span>
                <span className="font-semibold text-ink tabular-nums">{formatNumber(share.count)}</span>
                <span className="w-12 text-right text-ink-muted tabular-nums">{share.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}
