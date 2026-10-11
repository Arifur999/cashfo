"use client";

import { useForm } from "@tanstack/react-form";
import { createFeatureFlagAction } from "@/app/(dashboardLayout)/admin/system/feature-flags/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppChipsField from "@/components/shared/form/AppChipsField";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSliderField from "@/components/shared/form/AppSliderField";
import AppSwitchField from "@/components/shared/form/AppSwitchField";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import { featureFlagFormZodSchema, type IFeatureFlagFormValues } from "@/zod/featureFlag.validation";

const { shape } = featureFlagFormZodSchema;

// New flags start off, at 0%, for every plan -- nothing changes for users
// until someone turns them on.
const DEFAULT_VALUES: IFeatureFlagFormValues = {
  key: "",
  name: "",
  description: "",
  isEnabled: false,
  rolloutPercent: 0,
  targetPlanIds: [],
};

interface FeatureFlagFormProps {
  planOptions: { value: string; label: string }[];
  onDone: () => void;
}

// Mounted inside the dialog content, so each open starts empty.
const FeatureFlagForm = ({ planOptions, onDone }: FeatureFlagFormProps) => {
  const { run, isPending } = useActionMutation({
    action: createFeatureFlagAction,
    successMessage: (created) => `Created ${created.key}`,
    invalidateKeys: [queryKeys.featureFlags.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="name" validators={{ onChange: shape.name }}>
          {(field) => <AppField field={field} label="Name" placeholder="New dashboard" />}
        </form.Field>
        <form.Field name="key" validators={{ onChange: shape.key }}>
          {(field) => <AppField field={field} label="Key" placeholder="new_dashboard_ui" description="What the apps check. Can't be changed later." />}
        </form.Field>
      </div>
      <form.Field name="description" validators={{ onChange: shape.description }}>
        {(field) => <AppTextareaField field={field} label="Description" rows={2} description="Optional." />}
      </form.Field>
      <form.Field name="rolloutPercent" validators={{ onChange: shape.rolloutPercent }}>
        {(field) => <AppSliderField field={field} label="Rollout" step={5} formatValue={(value) => `${value}%`} />}
      </form.Field>
      <form.Field name="targetPlanIds">
        {(field) => <AppChipsField field={field} label="Limit to plans" options={planOptions} description="None selected means every plan." />}
      </form.Field>
      <form.Field name="isEnabled">
        {(field) => <AppSwitchField field={field} label="Enable now" description="Leave off to configure first and switch on later." />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Create flag" pendingLabel="Creating..." />
    </AppForm>
  );
};

export default FeatureFlagForm;
