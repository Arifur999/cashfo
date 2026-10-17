"use client";

import Callout from "@/components/shared/Callout";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppForm from "@/components/shared/form/AppForm";
import AppSwitchField from "@/components/shared/form/AppSwitchField";
import { formatNumber } from "@/lib/number";
import { money } from "@/lib/subscriptions";
import type { ISubscriptionPlan } from "@/types/plan.types";
import PlanBasicsFields from "./PlanBasicsFields";
import PlanLimitsFields from "./PlanLimitsFields";
import { usePlanForm } from "./usePlanForm";

interface PlanFormProps {
  // Omit to create a plan.
  plan?: ISubscriptionPlan;
  // How many people are on it now, for the note about a price change.
  people?: number;
  onDone: () => void;
}

// Rendered inside the drawer (unmounted on close), so each open starts from
// fresh default values.
const PlanForm = ({ plan, people = 0, onDone }: PlanFormProps) => {
  const { form, isPending } = usePlanForm(plan, onDone);

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-1 flex-col">
      <PlanBasicsFields form={form} plan={plan} />
      {plan && plan.billingCycle !== "FREE" && (
        <Callout variant="info">
          A new price applies from each person&apos;s next payment. The {formatNumber(people)} {people === 1 ? "person" : "people"} on it now keep{" "}
          {money(plan.price, plan.currency)} until they renew.
        </Callout>
      )}
      <PlanLimitsFields form={form} />
      <form.Field name="isActive">
        {(field) => <AppSwitchField field={field} label="On sale to new buyers" description="Turn off to hide it without moving anyone off it" />}
      </form.Field>
      <FormDialogFooter pinned isPending={isPending} submitLabel={plan ? "Save changes" : "Create plan"} pendingLabel="Saving..." />
    </AppForm>
  );
};

export default PlanForm;
