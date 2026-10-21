"use client";

import { useForm } from "@tanstack/react-form";
import { changeOwnerPlanAction } from "@/app/(dashboardLayout)/admin/users/_action";
import Callout from "@/components/shared/Callout";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import T from "@/components/shared/T";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import type { IOwnerRef } from "@/types/owner.types";
import type { ISubscriptionPlan } from "@/types/plan.types";
import { REASON_MIN_LENGTH } from "@/zod/common.validation";
import { changeOwnerPlanFormZodSchema, type IChangeOwnerPlanFormValues } from "@/zod/owner.validation";

// What the plan list needs of each plan: an archived one (isActive false)
// is retired and isn't offered.
export type PlanChoice = Pick<ISubscriptionPlan, "id" | "name" | "isActive">;

interface ChangeOwnerPlanFormProps {
  owner: IOwnerRef;
  plans: PlanChoice[];
  onDone: () => void;
}

const defaultValues: IChangeOwnerPlanFormValues = { newPlanId: "", reason: "" };

// Mounted inside the dialog content, so each open starts fresh.
const ChangeOwnerPlanForm = ({ owner, plans, onDone }: ChangeOwnerPlanFormProps) => {
  const { translate, locale } = useLocale();
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

  // Active plans only, and not the current one, so "no change" can't be
  // submitted. Plan names are data: a node, so the select doesn't translate
  // them (every chip shows "Business", never ব্যবসা).
  const options = plans.filter((plan) => plan.isActive && plan.id !== owner.planId).map((plan) => ({ value: plan.id, label: <>{plan.name}</> }));
  // Nothing to pick: the plans didn't load (the list is empty then), or no
  // other plan is active. Said up front, not after a submit.
  const nothingToPick = options.length === 0;

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <p className="text-small text-ink-muted">
        <T values={{ plan: <span className="font-semibold text-ink">{owner.planName ?? <T>None</T>}</span> }}>{"Current plan: {plan}"}</T>
      </p>
      {nothingToPick && (
        <Callout variant="warning" role="status">
          {plans.length === 0 ? "Couldn't load the plans. Reload the page and try again." : "There's no other active plan to move them to."}
        </Callout>
      )}
      <form.Field name="newPlanId" validators={{ onChange: changeOwnerPlanFormZodSchema.shape.newPlanId }}>
        {(field) => <AppSelectField field={field} label="New plan" options={options} placeholder="Select a plan..." disabled={nothingToPick} />}
      </form.Field>
      {/* The same rule, words and hint as Suspend's reason. */}
      <form.Field name="reason" validators={{ onChange: changeOwnerPlanFormZodSchema.shape.reason }}>
        {(field) => (
          <AppTextareaField
            field={field}
            label="Reason"
            rows={3}
            placeholder="Explain why"
            description={translate("At least {count} characters. It goes into the audit log, and only admins can see it.", { count: formatCount(REASON_MIN_LENGTH, locale) })}
          />
        )}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Change plan" pendingLabel="Changing..." disabled={nothingToPick} />
    </AppForm>
  );
};

export default ChangeOwnerPlanForm;
