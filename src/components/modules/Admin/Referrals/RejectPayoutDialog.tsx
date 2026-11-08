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
import { cn } from "@/lib/utils";
import type { IPayoutRow } from "@/types/referral.types";
import { referralReasonServerZodSchema } from "@/zod/referral.validation";
import { firstName } from "./payoutsDisplay";

// The board's quick reasons; a tap fills the box, which can still be edited.
const QUICK_REASONS = ["Account name doesn't match", "A friend's payment didn't reach us", "Looks like self-referral", "Wrong account number"];

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
      <div className="flex flex-col gap-2">
        <p id="reject-why" className="text-small font-medium text-ink">
          {translate("Why are you rejecting it? The user sees this.")}
        </p>
        <form.Subscribe selector={(state) => state.values.reason}>
          {(reason) => (
            <div role="group" aria-labelledby="reject-why" className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((quick) => {
                const text = translate(quick);
                const on = reason.trim() === text;
                return (
                  <button
                    key={quick}
                    type="button"
                    aria-pressed={on}
                    onClick={() => form.setFieldValue("reason", text)}
                    className={cn("h-8 rounded-full border bg-surface px-3 text-[12.5px] font-semibold text-expense transition-colors", on ? "border-expense-fill bg-expense-soft" : "border-expense-line hover:bg-expense-soft")}
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          )}
        </form.Subscribe>
      </div>
      <form.Field name="reason" validators={{ onChange: referralReasonServerZodSchema.shape.reason }}>
        {(field) => <AppTextareaField field={field} label={<span className="sr-only">{translate("Reason")}</span>} rows={2} placeholder="Write a short reason" />}
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
