"use client";

import { useQuery } from "@tanstack/react-query";
import { archivePlanAction, deletePlanAction, putPlanOnSaleAction } from "@/app/(dashboardLayout)/admin/plans/_action";
import LoadError from "@/components/modules/Admin/Payments/LoadError";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { queryKeys } from "@/lib/queryKeys";
import { planAnalyticsQuery, plansQuery } from "@/queries/plan.queries";
import type { ISubscriptionPlan } from "@/types/plan.types";
import { useHeld } from "../useHeld";
import PaidPeopleChart from "./PaidPeopleChart";
import PlanCard from "./PlanCard";
import PlanDrawer from "./PlanDrawer";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const PlansBoard = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const plansRead = useQuery(plansQuery());
  const analyticsRead = useQuery(planAnalyticsQuery());
  const { activeRow, openDialog, closeDialog, getDialogProps } = useRowDialogs<ISubscriptionPlan, "edit" | "archive" | "delete">();
  // Kept while a drawer or dialog closes, so it doesn't turn into "New plan"
  // or "Delete ?" on its way out.
  const plan = useHeld(activeRow);

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

  // An outage is never an empty board: it says the plans couldn't load.
  if (plansRead.isError && !plansRead.data) {
    return <LoadError title="Couldn't load plans" onRetry={() => void plansRead.refetch()} />;
  }

  const plans = plansRead.data?.data ?? [];
  const analytics = analyticsRead.data?.data;
  // Without the figures the cards show "—", not "0 people".
  const analyticsFailed = analyticsRead.isError && !analytics;
  const analyticsByPlanId = new Map(analytics?.perPlan.map((entry) => [entry.planId, entry]) ?? []);
  const peopleOn = (item: ISubscriptionPlan | null) => (item && analytics ? (analyticsByPlanId.get(item.id)?.totalUsers ?? 0) : undefined);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((item) => (
          <PlanCard
            key={item.id}
            plan={item}
            analytics={analyticsByPlanId.get(item.id)}
            figuresKnown={Boolean(analytics)}
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
      {analyticsFailed && <LoadError title="Couldn't load who is on each plan" onRetry={() => void analyticsRead.refetch()} />}

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
