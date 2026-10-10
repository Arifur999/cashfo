"use client";

import { useForm } from "@tanstack/react-form";
import { createPlanAction, updatePlanAction } from "@/app/(dashboardLayout)/admin/plans/_action";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { ISubscriptionPlan } from "@/types/plan.types";
import type { IPlanFormValues } from "@/zod/plan.validation";
import { EMPTY_PLAN_FORM_VALUES, toPlanFormValues } from "./planForm.defaults";

// Create when `plan` is undefined, edit otherwise. A hook so the field
// sections can share the form's type without spelling out its generics.
export const usePlanForm = (plan: ISubscriptionPlan | undefined, onDone: () => void) => {
  const { run, isPending } = useActionMutation({
    action: (values: IPlanFormValues) => (plan ? updatePlanAction(plan.id, values) : createPlanAction(values)),
    successMessage: plan ? "Plan updated" : "Plan created",
    invalidateKeys: [queryKeys.plans.all],
  });

  const form = useForm({
    defaultValues: plan ? toPlanFormValues(plan) : EMPTY_PLAN_FORM_VALUES,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  return { form, isPending };
};

export type PlanFormApi = ReturnType<typeof usePlanForm>["form"];
