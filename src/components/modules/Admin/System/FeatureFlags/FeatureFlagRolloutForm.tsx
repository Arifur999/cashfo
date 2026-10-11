"use client";

import { useForm } from "@tanstack/react-form";
import { updateFeatureFlagAction } from "@/app/(dashboardLayout)/admin/system/feature-flags/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppChipsField from "@/components/shared/form/AppChipsField";
import AppForm from "@/components/shared/form/AppForm";
import AppSliderField from "@/components/shared/form/AppSliderField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IFeatureFlag } from "@/types/featureFlag.types";
import { featureFlagRolloutFormZodSchema, type IFeatureFlagRolloutFormValues } from "@/zod/featureFlag.validation";

interface FeatureFlagRolloutFormProps {
  flag: IFeatureFlag;
  planOptions: { value: string; label: string }[];
  onDone: () => void;
}

// Who gets an enabled flag: a share of users, optionally limited to plans.
const FeatureFlagRolloutForm = ({ flag, planOptions, onDone }: FeatureFlagRolloutFormProps) => {
  const { run, isPending } = useActionMutation({
    action: (values: IFeatureFlagRolloutFormValues) => updateFeatureFlagAction(flag.id, values),
    successMessage: (updated) => `${updated.name}: rollout saved`,
    invalidateKeys: [queryKeys.featureFlags.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: { rolloutPercent: flag.rolloutPercent, targetPlanIds: flag.targetPlanIds } satisfies IFeatureFlagRolloutFormValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <form.Field name="rolloutPercent" validators={{ onChange: featureFlagRolloutFormZodSchema.shape.rolloutPercent }}>
        {(field) => (
          <AppSliderField
            field={field}
            label="Rollout"
            step={5}
            formatValue={(value) => `${value}%`}
            description="The same users stay in as you raise it, so it's safe to ramp up gradually."
          />
        )}
      </form.Field>
      <form.Field name="targetPlanIds">
        {(field) => <AppChipsField field={field} label="Limit to plans" options={planOptions} description="None selected means every plan." />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Save rollout" pendingLabel="Saving..." />
    </AppForm>
  );
};

export default FeatureFlagRolloutForm;
