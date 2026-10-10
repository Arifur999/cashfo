"use client";

import { useQuery } from "@tanstack/react-query";
import { archivePlanAction, deletePlanAction } from "@/app/(dashboardLayout)/admin/plans/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { queryKeys } from "@/lib/queryKeys";
import { planAnalyticsQuery, plansQuery } from "@/queries/plan.queries";
import type { ISubscriptionPlan } from "@/types/plan.types";
import PlanCard from "./PlanCard";
import PlanForm from "./PlanForm";
import PlansUsageCard from "./PlansUsageCard";

const PlansBoard = ({ canManage }: { canManage: boolean }) => {
  const { data: plansResponse } = useQuery(plansQuery());
  const { data: analyticsResponse } = useQuery(planAnalyticsQuery());
  const { activeRow: plan, openDialog, closeDialog, getDialogProps } = useRowDialogs<ISubscriptionPlan, "edit" | "archive" | "delete">();

  const archive = useActionMutation({
    action: archivePlanAction,
    successMessage: "Plan archived",
    invalidateKeys: [queryKeys.plans.all],
  });
  const remove = useActionMutation({
    action: deletePlanAction,
    successMessage: "Plan deleted",
    invalidateKeys: [queryKeys.plans.all],
  });

  const plans = plansResponse?.data ?? [];
  const analyticsByPlanId = new Map(analyticsResponse?.data.perPlan.map((entry) => [entry.planId, entry]) ?? []);

  return (
    <div className="space-y-6">
      {analyticsResponse && <PlansUsageCard analytics={analyticsResponse.data} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((item) => (
          <PlanCard
            key={item.id}
            plan={item}
            analytics={analyticsByPlanId.get(item.id)}
            canManage={canManage}
            onEdit={() => openDialog("edit", item)}
            onArchive={() => openDialog("archive", item)}
            onDelete={() => openDialog("delete", item)}
          />
        ))}
      </div>

      <FormDialog title="Edit plan" description={plan?.name} size="lg" {...getDialogProps("edit")}>
        {plan && <PlanForm plan={plan} onDone={closeDialog} />}
      </FormDialog>

      <ConfirmDialog
        {...getDialogProps("archive")}
        title="Archive plan"
        description={`"${plan?.name}" stops being offered to new subscribers. Existing subscribers keep it.`}
        confirmLabel="Archive"
        pendingLabel="Archiving..."
        isPending={archive.isPending}
        onConfirm={async () => {
          if (plan && (await archive.run(plan.id))) closeDialog();
        }}
      />

      <ConfirmDialog
        {...getDialogProps("delete")}
        title="Delete plan"
        description={`Permanently delete "${plan?.name}"? This can't be undone, and is only allowed while no users are on it.`}
        variant="destructive"
        confirmLabel="Delete"
        pendingLabel="Deleting..."
        isPending={remove.isPending}
        onConfirm={async () => {
          if (plan && (await remove.run(plan.id))) closeDialog();
        }}
      />
    </div>
  );
};

export default PlansBoard;
