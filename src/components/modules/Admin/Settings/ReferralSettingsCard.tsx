"use client";

import AppField from "@/components/shared/form/AppField";
import SectionCard from "@/components/shared/SectionCard";
import { updateSettingsFormZodSchema as schema } from "@/zod/settings.validation";
import type { SettingsFormApi } from "./useSettingsForm";

const ReferralSettingsCard = ({ form, disabled }: { form: SettingsFormApi; disabled: boolean }) => {
  return (
    <SectionCard title="Referral Program">
      <form.Field name="referralRewardAmount" validators={{ onChange: schema.shape.referralRewardAmount }}>
        {(field) => (
          <AppField
            field={field}
            label="Reward Per Referral (BDT)"
            type="number"
            disabled={disabled}
            description="Credited to a user's Referral Program balance for each friend who signs up using their link."
          />
        )}
      </form.Field>
    </SectionCard>
  );
};

export default ReferralSettingsCard;
