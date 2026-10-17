"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowRight, Gift } from "lucide-react";
import { useState } from "react";
import { updateSettingsAction } from "@/app/(dashboardLayout)/admin/settings/_action";
import FormDialog from "@/components/shared/dialog/FormDialog";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCurrency } from "@/lib/currency";
import { queryKeys } from "@/lib/queryKeys";
import { type IReferralRewardFormValues, referralRewardFormZodSchema as schema } from "@/zod/settings.validation";
import SettingsSideCard, { SIDE_CARD_LINK } from "./SettingsSideCard";

const RewardForm = ({ amount, onDone }: { amount: number; onDone: () => void }) => {
  const { run, isPending } = useActionMutation({
    action: updateSettingsAction,
    successMessage: (updated) => `Referrers now earn ${formatCurrency(updated.referralRewardAmount, undefined, 0)}`,
    invalidateKeys: [queryKeys.settings.all],
    refreshRoute: false,
  });
  const form = useForm({
    defaultValues: { referralRewardAmount: String(amount) } satisfies IReferralRewardFormValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) onDone();
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <form.Field name="referralRewardAmount" validators={{ onChange: schema.shape.referralRewardAmount }}>
        {(field) => (
          <AppField
            field={field}
            label="Reward per friend"
            prepend="৳"
            inputMode="decimal"
            description="Credited to a person's referral balance for each friend who signs up with their link. New sign-ups get the new amount."
          />
        )}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Save reward" pendingLabel="Saving..." />
    </AppForm>
  );
};

// What a referral earns today. The design's commission rules (a share of a
// friend's first payment, a discount for the friend) are a NEW item, so this
// is the flat reward the platform pays now, changed in a small dialog.
const ReferralRulesCard = ({ amount, canManage }: { amount: number; canManage: boolean }) => {
  const [open, setOpen] = useState(false);

  return (
    <SettingsSideCard
      icon={Gift}
      tone="mint"
      title="Referral rules"
      action={
        canManage && (
          <FormDialog
            open={open}
            onOpenChange={setOpen}
            title="Referral reward"
            size="sm"
            trigger={
              <button type="button" className={SIDE_CARD_LINK}>
                Change the reward <ArrowRight aria-hidden="true" className="size-3.5" />
              </button>
            }
          >
            <RewardForm amount={amount} onDone={() => setOpen(false)} />
          </FormDialog>
        )
      }
    >
      Referrers earn <b className="font-semibold text-ink">{formatCurrency(amount, undefined, 0)}</b> for each friend who signs up with their link.
    </SettingsSideCard>
  );
};

export default ReferralRulesCard;
