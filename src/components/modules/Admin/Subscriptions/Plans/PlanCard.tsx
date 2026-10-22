"use client";

import { Archive, Check, MoreHorizontal, Tag, Trash2, X } from "lucide-react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { countPhrase } from "@/components/modules/Admin/Payments/paymentsDisplay";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPercent } from "@/lib/number";
import { billingPeriod, limitText, money, planAccentClass, trialLine, trialsLine } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";
import type { IPlanAnalyticsEntry, ISubscriptionPlan } from "@/types/plan.types";
import { FREE_PLAN_SLUG, PLAN_FEATURE_TOGGLES, PLAN_NUMERIC_LIMITS } from "./planFeatures";
import T from "@/components/shared/T";

interface PlanCardProps {
  plan: ISubscriptionPlan;
  analytics?: IPlanAnalyticsEntry;
  // False while the plans' figures are loading or failed to: the card
  // shows "—" rather than claiming nobody is on the plan.
  figuresKnown: boolean;
  // Everyone on any plan, for this plan's share.
  totalUsers: number;
  canManage: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onPutOnSale: () => void;
  onDelete: () => void;
}

// One plan as the design draws it: the name and whether it is on sale, the
// price, who is on it now, what it allows, and the Edit plan button. A plan
// off sale gets a dashed, flat frame, its text kept at full strength.
const PlanCard = ({ plan, analytics, figuresKnown, totalUsers, canManage, onEdit, onArchive, onPutOnSale, onDelete }: PlanCardProps) => {
  const people = analytics?.totalUsers ?? 0;
  const share = totalUsers > 0 ? (people / totalUsers) * 100 : 0;
  const { translate, locale } = useLocale();
  const period = billingPeriod(plan.billingCycle, translate);
  // Delete only goes through for a plan nobody is on (and never for the
  // free plan, which new accounts start on); the API checks the rest.
  const deletable = plan.slug !== FREE_PLAN_SLUG;
  const blockedBy = figuresKnown ? people : 0;

  return (
    <Card padding="none" elevated={plan.isActive} className={cn("flex flex-col gap-3 p-5", !plan.isActive && "border-dashed")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-title text-ink">{plan.name}</h2>
        <Chip tone={plan.isActive ? "mint" : "neutral"} size="sm">
          <T>{plan.isActive ? "On sale" : "Not on sale"}</T>
        </Chip>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="flex items-baseline gap-1">
          <span className="text-h1 text-ink">{money(plan.price, plan.currency, locale)}</span>
          {period && <span className="text-small text-ink-muted">{period}</span>}
        </span>
        <span className="text-small text-ink-muted">{trialLine(plan, translate, locale)}</span>
      </div>

      {/* Who is on the plan now (its workspaces), not the paid people the
          chart below counts from payments. */}
      <div className="flex flex-col gap-2 rounded-md bg-strip p-3">
        <span className="flex justify-between text-small">
          <b className="font-semibold text-ink">{figuresKnown ? countPhrase(translate, locale, people, "{count} person on it now", "{count} people on it now") : "—"}</b>
          <span className="text-ink-muted">{figuresKnown ? toLocaleDigits(formatPercent(share), locale) : "—"}</span>
        </span>
        <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <span className={cn("block h-full rounded-full", planAccentClass(plan.name))} style={{ width: `${figuresKnown ? Math.round(share) : 0}%` }} />
        </span>
        <span className="text-caption text-ink-muted">{figuresKnown ? trialsLine(plan.billingCycle, analytics?.trialing ?? 0, translate, locale) : "—"}</span>
      </div>

      <ul className="flex flex-col gap-2 text-small">
        {PLAN_NUMERIC_LIMITS.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-2">
            <span className="grow text-ink-2">
              <T>{label}</T>
            </span>
            <b className="font-semibold text-ink-2 tabular-nums">{limitText(plan.featureLimits[key], translate, locale)}</b>
          </li>
        ))}
        {PLAN_FEATURE_TOGGLES.map(({ key, label }) => {
          const on = plan.featureLimits[key];
          return (
            <li key={key} className={cn("flex items-center gap-2", on ? "text-ink-2" : "text-ink-muted")}>
              <span className="grow">
                <T>{label}</T>
              </span>
              {on ? <Check className="size-4 text-emerald" aria-label={translate("Included")} /> : <X className="size-4" aria-label={translate("Not included")} />}
            </li>
          );
        })}
      </ul>

      {canManage && (
        <div className="mt-auto flex gap-2 border-t border-divider pt-3">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onEdit}>
            <T>Edit plan</T>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon-sm" className="data-[state=open]:bg-surface-sunken" aria-label={translate("More for {name}", { name: plan.name })}>
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {plan.isActive ? (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive aria-hidden="true" /> <T>Take off sale</T>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onPutOnSale}>
                  <Tag aria-hidden="true" /> <T>Put back on sale</T>
                </DropdownMenuItem>
              )}
              {deletable && <DropdownMenuSeparator />}
              {deletable &&
                (blockedBy > 0 ? (
                  // Offered, but greyed with the reason, while people are on it.
                  // Inert yet still focusable (not `disabled`, which Radix drops
                  // from arrow-key focus), so a keyboard or screen-reader user
                  // reaches it and hears the reason as part of its name.
                  <DropdownMenuItem aria-disabled="true" onSelect={(event) => event.preventDefault()} className="cursor-default flex-col items-start gap-0.5 text-ink-muted">
                    <span className="flex items-center gap-2.5 text-ink-muted">
                      <Trash2 aria-hidden="true" /> <T>Delete plan</T>
                    </span>
                    <span className="text-caption text-ink-muted">
                      {countPhrase(translate, locale, blockedBy, "{count} person is on it. Take it off sale instead.", "{count} people are on it. Take it off sale instead.")}
                    </span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem variant="destructive" onClick={onDelete}>
                    <Trash2 aria-hidden="true" /> <T>Delete plan</T>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Card>
  );
};

export default PlanCard;
