"use client";

import AppField from "@/components/shared/form/AppField";
import SectionCard from "@/components/shared/SectionCard";
import { updateSettingsFormZodSchema as schema } from "@/zod/settings.validation";
import type { SettingsFormApi } from "./useSettingsForm";

const GeneralSettingsCard = ({ form, disabled }: { form: SettingsFormApi; disabled: boolean }) => {
  return (
    <SectionCard title="General">
      <div className="space-y-4">
        <form.Field name="platformName" validators={{ onChange: schema.shape.platformName }}>
          {(field) => <AppField field={field} label="Platform Name" disabled={disabled} />}
        </form.Field>
        <form.Field name="supportEmail" validators={{ onChange: schema.shape.supportEmail }}>
          {(field) => <AppField field={field} label="Support Email" type="email" disabled={disabled} />}
        </form.Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="defaultCurrency" validators={{ onChange: schema.shape.defaultCurrency }}>
            {(field) => <AppField field={field} label="Default Currency" placeholder="BDT" disabled={disabled} />}
          </form.Field>
          <form.Field name="defaultTimezone" validators={{ onChange: schema.shape.defaultTimezone }}>
            {(field) => <AppField field={field} label="Default Timezone" placeholder="Asia/Dhaka" disabled={disabled} />}
          </form.Field>
        </div>
      </div>
    </SectionCard>
  );
};

export default GeneralSettingsCard;
