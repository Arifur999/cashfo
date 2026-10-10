"use client";

import { useForm } from "@tanstack/react-form";
import { changeOwnerPlanAction } from "@/app/(dashboardLayout)/admin/users/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IOwnerRef } from "@/types/owner.types";
import type { IPlanOption } from "@/types/plan.types";
import { changeOwnerPlanFormZodSchema, type IChangeOwnerPlanFormValues } from "@/zod/owner.validation";

interface ChangeOwnerPlanFormProps {
  owner: IOwnerRef;
  plans: IPlanOption[];
  onDone: () => void;
}

const defaultValues: IChangeOwnerPlanFormValues = { newPlanId: "", reason: "" };

// Mounted inside the dialog content, so each open starts fresh.
const ChangeOwnerPlanForm = ({ owner, plans, onDone }: ChangeOwnerPlanFormProps) => {
  const { run, isPending } = useActionMutation({
    action: (values: IChangeOwnerPlanFormValues) => changeOwnerPlanAction(owner.userId, values),
    successMessage: "Plan changed",
    invalidateKeys: [queryKeys.owners.all],
  });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  // The current plan isn't offered, so "no change" can't be submitted.
  const options = plans.filter((plan) => plan.id !== owner.planId).map((plan) => ({ value: plan.id, label: plan.name }));

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <p className="text-sm text-muted-foreground">
        Current plan: <span className="font-medium text-foreground">{owner.planName ?? "None"}</span>
      </p>
      <form.Field name="newPlanId" validators={{ onChange: changeOwnerPlanFormZodSchema.shape.newPlanId }}>
        {(field) => <AppSelectField field={field} label="New plan" options={options} placeholder="Select a plan..." />}
      </form.Field>
      <form.Field name="reason" validators={{ onChange: changeOwnerPlanFormZodSchema.shape.reason }}>
        {(field) => <AppTextareaField field={field} label="Reason" rows={3} description="Recorded in the audit log." />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Change plan" pendingLabel="Changing..." />
    </AppForm>
  );
};

export default ChangeOwnerPlanForm;
