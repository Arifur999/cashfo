"use client";

import { Archive, Pencil, Trash2 } from "lucide-react";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/currency";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import type { IPlanAnalyticsEntry, ISubscriptionPlan } from "@/types/plan.types";
import PlanFeatureList from "./PlanFeatureList";

const CYCLE_SUFFIX = { FREE: "", MONTHLY: " / month", YEARLY: " / year" } as const;

interface PlanCardProps {
  plan: ISubscriptionPlan;
  analytics?: IPlanAnalyticsEntry;
  canManage: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const PlanCard = ({ plan, analytics, canManage, onEdit, onArchive, onDelete }: PlanCardProps) => {
  const isFree = Number(plan.price) === 0;

  return (
    <Card className={cn("shadow-sm shadow-black/5", !plan.isActive && "opacity-70")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold">{plan.name}</CardTitle>
          {!plan.isActive && <StatusBadgeCell status="ARCHIVED" />}
        </div>
        <p className="text-2xl font-bold text-foreground">
          {isFree ? "Free" : formatCurrency(plan.price, plan.currency, 0)}
          <span className="text-sm font-normal text-muted-foreground">{CYCLE_SUFFIX[plan.billingCycle]}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {formatNumber(analytics?.totalUsers ?? 0)} users
          {plan.trialDays > 0 && ` · ${plan.trialDays}-day trial`}
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        <PlanFeatureList limits={plan.featureLimits} />
      </CardContent>
      {canManage && (
        <CardFooter className="gap-2 border-t pt-4">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Pencil aria-hidden="true" /> Edit
          </Button>
          {plan.isActive && (
            <Button variant="outline" size="sm" className="flex-1" onClick={onArchive}>
              <Archive aria-hidden="true" /> Archive
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="destructive" size="sm" className="flex-1" onClick={onDelete}>
                <Trash2 aria-hidden="true" /> Delete
              </Button>
            </TooltipTrigger>
            <TooltipContent>Only allowed while no users are on this plan</TooltipContent>
          </Tooltip>
        </CardFooter>
      )}
    </Card>
  );
};

export default PlanCard;
