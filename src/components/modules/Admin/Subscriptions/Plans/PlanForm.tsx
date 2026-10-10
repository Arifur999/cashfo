"use client";

import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppForm from "@/components/shared/form/AppForm";
import AppSwitchField from "@/components/shared/form/AppSwitchField";
import type { ISubscriptionPlan } from "@/types/plan.types";
import PlanBasicsFields from "./PlanBasicsFields";
import PlanLimitsFields from "./PlanLimitsFields";
import { usePlanForm } from "./usePlanForm";

interface PlanFormProps {
  // Omit to create a plan.
  plan?: ISubscriptionPlan;
  onDone: () => void;
}

// Rendered inside the dialog content (unmounted on close), so each open
// starts from fresh default values.
const PlanForm = ({ plan, onDone }: PlanFormProps) => {
  const { form, isPending } = usePlanForm(plan, onDone);

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <PlanBasicsFields form={form} autoSlug={!plan} />
      <PlanLimitsFields form={form} />
      {plan && (
        <form.Field name="isActive">
          {(field) => <AppSwitchField field={field} label="Active" description="Turning this off archives the plan." />}
        </form.Field>
      )}
      <FormDialogFooter isPending={isPending} submitLabel={plan ? "Save changes" : "Create plan"} pendingLabel="Saving..." />
    </AppForm>
  );
};

export default PlanForm;
