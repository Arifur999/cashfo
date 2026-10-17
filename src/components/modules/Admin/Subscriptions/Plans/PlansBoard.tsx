"use client";

import { useQuery } from "@tanstack/react-query";
import { archivePlanAction, deletePlanAction, putPlanOnSaleAction } from "@/app/(dashboardLayout)/admin/plans/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { queryKeys } from "@/lib/queryKeys";
import { planAnalyticsQuery, plansQuery } from "@/queries/plan.queries";
import type { ISubscriptionPlan } from "@/types/plan.types";
import PaidPeopleChart from "./PaidPeopleChart";
import PlanCard from "./PlanCard";
import PlanDrawer from "./PlanDrawer";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const PlansBoard = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const { data: plansResponse } = useQuery(plansQuery());
  const { data: analyticsResponse } = useQuery(planAnalyticsQuery());
  const { activeRow: plan, openDialog, closeDialog, getDialogProps } = useRowDialogs<ISubscriptionPlan, "edit" | "archive" | "delete">();

  const archive = useActionMutation({
    action: archivePlanAction,
    successMessage: "Plan taken off sale",
    invalidateKeys: [queryKeys.plans.all],
  });
  const putOnSale = useActionMutation({
    action: putPlanOnSaleAction,
    successMessage: "Plan back on sale",
    invalidateKeys: [queryKeys.plans.all],
  });
  const remove = useActionMutation({
    action: deletePlanAction,
    successMessage: "Plan deleted",
    invalidateKeys: [queryKeys.plans.all],
  });

  const plans = plansResponse?.data ?? [];
  const analytics = analyticsResponse?.data;
  const analyticsByPlanId = new Map(analytics?.perPlan.map((entry) => [entry.planId, entry]) ?? []);
  const peopleOn = (item: ISubscriptionPlan | null) => (item ? (analyticsByPlanId.get(item.id)?.totalUsers ?? 0) : 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((item) => (
          <PlanCard
            key={item.id}
            plan={item}
            analytics={analyticsByPlanId.get(item.id)}
            totalUsers={analytics?.summary.totalUsers ?? 0}
            canManage={canManage}
            onEdit={() => openDialog("edit", item)}
            onArchive={() => openDialog("archive", item)}
            onPutOnSale={() => void putOnSale.run(item.id)}
            onDelete={() => openDialog("delete", item)}
          />
        ))}
      </div>

      {analytics && <PaidPeopleChart analytics={analytics} />}

      <PlanDrawer plan={plan} people={peopleOn(plan)} {...getDialogProps("edit")} />

      <ConfirmDialog
        {...getDialogProps("archive")}
        title={translate("Take {name} off sale?", { name: plan?.name ?? "" })}
        description="New buyers stop seeing it. Everyone already on it keeps it, and you can put it back on sale any time."
        confirmLabel="Take off sale"
        pendingLabel="Saving..."
        isPending={archive.isPending}
        onConfirm={async () => {
          if (plan && (await archive.run(plan.id))) closeDialog();
        }}
      />

      <ConfirmDialog
        {...getDialogProps("delete")}
        title={translate("Delete {name}?", { name: plan?.name ?? "" })}
        description="This can't be undone, and only works while nobody is on the plan and no payment or coupon refers to it. Taking it off sale is usually enough."
        variant="destructive"
        confirmLabel="Delete plan"
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
