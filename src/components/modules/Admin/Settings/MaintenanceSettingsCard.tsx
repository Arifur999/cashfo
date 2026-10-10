"use client";

import AppSwitchField from "@/components/shared/form/AppSwitchField";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import SectionCard from "@/components/shared/SectionCard";
import type { SettingsFormApi } from "./useSettingsForm";

const MaintenanceSettingsCard = ({ form, disabled }: { form: SettingsFormApi; disabled: boolean }) => {
  return (
    <SectionCard title="Maintenance Mode">
      <div className="space-y-4">
        <form.Field name="maintenanceMode">
          {(field) => (
            <AppSwitchField
              field={field}
              label="Enable maintenance mode"
              description="The end-user app shows the message below instead of normal access."
              disabled={disabled}
            />
          )}
        </form.Field>
        {/* Only relevant while maintenance mode is on. */}
        <form.Subscribe selector={(state) => state.values.maintenanceMode}>
          {(isEnabled) =>
            isEnabled && (
              <form.Field name="maintenanceMessage">
                {(field) => <AppTextareaField field={field} label="Maintenance Message" rows={3} readOnly={disabled} />}
              </form.Field>
            )
          }
        </form.Subscribe>
      </div>
    </SectionCard>
  );
};

export default MaintenanceSettingsCard;
