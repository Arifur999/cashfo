"use client";

import { Archive, Check, MoreHorizontal, Tag, Trash2, X } from "lucide-react";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatNumber, formatPercent } from "@/lib/number";
import { billingPeriod, limitText, money, planAccentClass, trialLine, trialsLine } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";
import type { IPlanAnalyticsEntry, ISubscriptionPlan } from "@/types/plan.types";
import { PLAN_FEATURE_TOGGLES, PLAN_NUMERIC_LIMITS } from "./planFeatures";

interface PlanCardProps {
  plan: ISubscriptionPlan;
  analytics?: IPlanAnalyticsEntry;
  // Everyone on any plan, for this plan's share.
  totalUsers: number;
  canManage: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onPutOnSale: () => void;
  onDelete: () => void;
}

// One plan as the design draws it: the name and whether it is on sale, the
// price, who is on it, what it allows, and the Edit plan button.
const PlanCard = ({ plan, analytics, totalUsers, canManage, onEdit, onArchive, onPutOnSale, onDelete }: PlanCardProps) => {
  const people = analytics?.totalUsers ?? 0;
  const share = totalUsers > 0 ? (people / totalUsers) * 100 : 0;
  const period = billingPeriod(plan.billingCycle);

  return (
    <Card padding="none" className={cn("flex flex-col gap-3 p-5", !plan.isActive && "opacity-80")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-title text-ink">{plan.name}</h2>
        <Chip tone={plan.isActive ? "mint" : "neutral"} size="sm">
          {plan.isActive ? "On sale" : "Not on sale"}
        </Chip>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="flex items-baseline gap-1">
          <span className="text-h1 text-ink">{money(plan.price, plan.currency)}</span>
          {period && <span className="text-small text-ink-muted">{period}</span>}
        </span>
        <span className="text-small text-ink-muted">{trialLine(plan)}</span>
      </div>

      <div className="flex flex-col gap-2 rounded-md bg-cream p-3">
        <span className="flex justify-between text-small">
          <b className="font-semibold text-ink">{formatNumber(people)} people</b>
          <span className="text-ink-muted">{formatPercent(share)}</span>
        </span>
        <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <span className={cn("block h-full rounded-full", planAccentClass(plan.name))} style={{ width: `${Math.round(share)}%` }} />
        </span>
        <span className="text-caption text-ink-muted">{trialsLine(plan.billingCycle, analytics?.trialing ?? 0)}</span>
      </div>

      <ul className="flex flex-col gap-2 text-small">
        {PLAN_NUMERIC_LIMITS.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-2">
            <span className="grow text-ink-2">{label}</span>
            <b className="font-semibold text-ink-2 tabular-nums">{limitText(plan.featureLimits[key])}</b>
          </li>
        ))}
        {PLAN_FEATURE_TOGGLES.map(({ key, label }) => {
          const on = plan.featureLimits[key];
          return (
            <li key={key} className={cn("flex items-center gap-2", on ? "text-ink-2" : "text-ink-muted")}>
              <span className="grow">{label}</span>
              {on ? <Check className="size-4 text-emerald" aria-label="Included" /> : <X className="size-4" aria-label="Not included" />}
            </li>
          );
        })}
      </ul>

      {canManage && (
        <div className="mt-auto flex gap-2 border-t border-surface-sunken pt-3">
          <Button variant="outline" size="sm" className="h-9 flex-1 border-line-strong bg-surface text-small font-semibold text-ink hover:bg-cream" onClick={onEdit}>
            Edit plan
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" className="size-9 border-line-strong bg-surface text-ink hover:bg-cream data-[state=open]:bg-cream" aria-label={`More for ${plan.name}`}>
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {plan.isActive ? (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive aria-hidden="true" /> Take off sale
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onPutOnSale}>
                  <Tag aria-hidden="true" /> Put back on sale
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 aria-hidden="true" /> Delete plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Card>
  );
};

export default PlanCard;
