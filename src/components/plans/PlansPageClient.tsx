"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { PlanAnalytics, SubscriptionPlan } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { archivePlanAction, createPlanAction, deletePlanAction, updatePlanAction } from "@/app/admin/(dashboard)/plans/_actions";
import { PlanCard } from "./PlanCard";
import { PlanFormModal, type PlanFormValues } from "./PlanFormModal";
import { PlansUsageChart } from "./PlansUsageChart";

interface PlansPageClientProps {
  plans: SubscriptionPlan[];
  analytics: PlanAnalytics | null;
  canManage: boolean;
}

export function PlansPageClient({ plans, analytics, canManage }: PlansPageClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditingPlan(null);
    setIsModalOpen(true);
  }

  function openEdit(plan: SubscriptionPlan) {
    setEditingPlan(plan);
    setIsModalOpen(true);
  }

  function handleSubmit(values: PlanFormValues) {
    startTransition(async () => {
      const result = editingPlan
        ? await updatePlanAction(editingPlan.id, values)
        : await createPlanAction(values);

      if (result.success) {
        toast.success(editingPlan ? t("Plan updated") : t("Plan created"));
        setIsModalOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Something went wrong"));
      }
    });
  }

  function handleArchive(plan: SubscriptionPlan) {
    startTransition(async () => {
      const result = await archivePlanAction(plan.id);
      if (result.success) {
        toast.success(t("Plan archived"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to archive plan"));
      }
    });
  }

  function handleDelete(plan: SubscriptionPlan) {
    if (!window.confirm(t(`Permanently delete "${plan.name}"? This cannot be undone.`))) {
      return;
    }
    startTransition(async () => {
      const result = await deletePlanAction(plan.id);
      if (result.success) {
        toast.success(t("Plan deleted"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete plan"));
      }
    });
  }

  const analyticsByPlanId = new Map(analytics?.perPlan.map((p) => [p.planId, p]) ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("Subscription Plans")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("Manage pricing, feature limits, and availability.")}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> {t("Create Plan")}
          </button>
        )}
      </div>

      {analytics && <PlansUsageChart analytics={analytics} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            analytics={analyticsByPlanId.get(plan.id)}
            canManage={canManage}
            onEdit={() => openEdit(plan)}
            onArchive={() => handleArchive(plan)}
            onDelete={() => handleDelete(plan)}
          />
        ))}
      </div>

      <PlanFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingPlan={editingPlan}
        isSubmitting={isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
