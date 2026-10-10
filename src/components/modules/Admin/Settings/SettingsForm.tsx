"use client";

import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import type { IPlatformSettings } from "@/types/settings.types";
import GeneralSettingsCard from "./GeneralSettingsCard";
import MaintenanceSettingsCard from "./MaintenanceSettingsCard";
import ReferralSettingsCard from "./ReferralSettingsCard";
import { useSettingsForm } from "./useSettingsForm";

interface SettingsFormProps {
  initial: IPlatformSettings;
  canManage: boolean;
}

const SettingsForm = ({ initial, canManage }: SettingsFormProps) => {
  const { form, isPending } = useSettingsForm(initial);

  return (
    <AppForm onSubmit={form.handleSubmit} className="max-w-2xl space-y-6">
      <GeneralSettingsCard form={form} disabled={!canManage} />
      <MaintenanceSettingsCard form={form} disabled={!canManage} />
      <ReferralSettingsCard form={form} disabled={!canManage} />

      {canManage && (
        <div className="flex justify-end">
          {/* Nothing to save until something changed. */}
          <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting] as const}>
            {([isDirty, isSubmitting]) => (
              <AppSubmitButton isPending={isPending || isSubmitting} disabled={!isDirty} pendingLabel="Saving..." className="w-auto">
                Save Changes
              </AppSubmitButton>
            )}
          </form.Subscribe>
        </div>
      )}
    </AppForm>
  );
};

export default SettingsForm;
