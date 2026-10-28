"use client";

import { useForm } from "@tanstack/react-form";
import { rejectPayoutAction } from "@/app/(dashboardLayout)/admin/referrals/_action";
import FormDialog from "@/components/shared/dialog/FormDialog";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppForm from "@/components/shared/form/AppForm";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import type { IPayoutRow } from "@/types/referral.types";
import { referralReasonServerZodSchema } from "@/zod/referral.validation";
import { firstName } from "./payoutsDisplay";

// Mounted inside the dialog content, so each open starts empty.
const RejectForm = ({ payout, onDone }: { payout: IPayoutRow; onDone: () => void }) => {
  const { translate, locale } = useLocale();
  const { run, isPending } = useActionMutation({
    action: (values: { reason: string }) => rejectPayoutAction(payout.id, values),
    successMessage: "Request rejected",
    invalidateKeys: [queryKeys.referrals.all],
  });
  const form = useForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => {
      if (await run({ reason: value.reason.trim() })) onDone();
    },
  });
  return (
    <AppForm onSubmit={form.handleSubmit}>
      <p className="text-body leading-relaxed text-ink-2">
        {translate("{amount} goes back to {name}'s balance, and {name} sees your reason in the app and by email.", {
          amount: formatCurrency(payout.amount, undefined, 0, locale),
          name: firstName(payout.user.name),
        })}
      </p>
      <form.Field name="reason" validators={{ onChange: referralReasonServerZodSchema.shape.reason }}>
        {(field) => <AppTextareaField field={field} label="Reason" rows={3} placeholder="For example: the name on the account doesn't match" />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Reject request" pendingLabel="Rejecting..." variant="destructive" />
    </AppForm>
  );
};

interface RejectPayoutDialogProps {
  payout: IPayoutRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRejected?: () => void;
}

// Reject a waiting or approved request: the member sees the reason, and the
// money is no longer set aside.
const RejectPayoutDialog = ({ payout, open, onOpenChange, onRejected }: RejectPayoutDialogProps) => {
  const { translate } = useLocale();
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={translate("Reject {id}", { id: payout?.displayId ?? "" })} size="sm">
      {payout && (
        <RejectForm
          payout={payout}
          onDone={() => {
            onOpenChange(false);
            onRejected?.();
          }}
        />
      )}
    </FormDialog>
  );
};

export default RejectPayoutDialog;
