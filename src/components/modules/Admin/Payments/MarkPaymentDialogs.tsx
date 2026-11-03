"use client";

import { useForm } from "@tanstack/react-form";
import { markPaymentFailedAction, markPaymentPaidAction } from "@/app/(dashboardLayout)/admin/payments/_action";
import Callout from "@/components/shared/Callout";
import FormDialog from "@/components/shared/dialog/FormDialog";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatAmount } from "@/lib/currency";
import { formatDate, toDateTimeInputValue } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { shortPaymentId } from "@/lib/payments";
import { queryKeys } from "@/lib/queryKeys";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IPayment } from "@/types/payment.types";
import { markPaymentFailedServerZodSchema, markPaymentPaidFormZodSchema, type IMarkPaymentPaidFormValues } from "@/zod/payment.validation";

type DialogPayment = Pick<IPayment, "id" | "amount" | "currency" | "gateway" | "plan" | "platformUser" | "createdAt" | "expiresAt" | "gatewayReferenceId" | "payerAccount">;

const rules = markPaymentPaidFormZodSchema.shape;

// Mounted inside the dialog content, so each open starts afresh: with the
// TrxID and number the customer sent at checkout, for the admin to check.
const MarkPaidForm = ({ payment, onDone }: { payment: DialogPayment; onDone: () => void }) => {
  const { translate, locale } = useLocale();
  const gateway = translate(humanizeEnum(payment.gateway));
  const { run, isPending } = useActionMutation({
    action: (values: IMarkPaymentPaidFormValues) => markPaymentPaidAction(payment.id, values),
    successMessage: "Payment marked as paid",
    invalidateKeys: [queryKeys.payments.all, queryKeys.invoices.all],
  });
  const form = useForm({
    defaultValues: {
      gatewayReferenceId: payment.gatewayReferenceId ?? "",
      paidAt: toDateTimeInputValue(new Date()),
      payerAccount: payment.payerAccount ?? "",
      note: "",
    } satisfies IMarkPaymentPaidFormValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) onDone();
    },
  });
  const name = payment.platformUser?.name ?? translate("The person");

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <p className="text-body leading-relaxed text-ink-2">
        {translate("{name} chose {gateway} for {plan}: {amount}. Mark it paid once the money is in.", {
          name,
          gateway,
          plan: payment.plan.name,
          amount: formatAmount(payment.amount, payment.currency, locale),
        })}
        {payment.expiresAt && <> {translate("The checkout lapses on {date}.", { date: formatDate(payment.expiresAt, "d MMM, h:mm aaa", "—", locale) })}</>}
      </p>
      <form.Field name="gatewayReferenceId" validators={{ onChange: rules.gatewayReferenceId }}>
        {(field) => <AppField field={field} label={translate("{gateway} transaction ID", { gateway })} autoComplete="off" className="font-mono tracking-[0.04em]" />}
      </form.Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.Field name="paidAt" validators={{ onChange: rules.paidAt }}>
          {(field) => <AppField field={field} label="Paid on" type="datetime-local" />}
        </form.Field>
        <form.Field name="payerAccount" validators={{ onChange: rules.payerAccount }}>
          {(field) => <AppField field={field} label="Paid from" placeholder="Number or account" description="Optional" inputMode="tel" />}
        </form.Field>
      </div>
      <form.Field name="note" validators={{ onChange: rules.note }}>
        {(field) => <AppTextareaField field={field} label="Note for the audit log" rows={2} placeholder="Optional" />}
      </form.Field>
      <Callout variant="info">{translate("The plan starts now, with an invoice. {name} gets a receipt by email and in the app.", { name })}</Callout>
      <FormDialogFooter isPending={isPending} submitLabel="Mark as paid" pendingLabel="Saving..." />
    </AppForm>
  );
};

const MarkFailedForm = ({ payment, onDone }: { payment: DialogPayment; onDone: () => void }) => {
  const { translate } = useLocale();
  const { run, isPending } = useActionMutation({
    action: (values: { reason: string }) => markPaymentFailedAction(payment.id, values),
    successMessage: "Payment marked as failed",
    invalidateKeys: [queryKeys.payments.all],
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
        {translate("{name} is told the payment didn't go through, with your reason. Their plan doesn't change.", { name: payment.platformUser?.name ?? translate("The person") })}
      </p>
      <form.Field name="reason" validators={{ onChange: markPaymentFailedServerZodSchema.shape.reason }}>
        {(field) => <AppTextareaField field={field} label="Reason" rows={3} placeholder="For example: no money arrived with this transaction ID" />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Mark as failed" pendingLabel="Saving..." variant="destructive" />
    </AppForm>
  );
};

interface MarkPaymentDialogProps {
  // Kept by the caller after the dialog closes, so its title stays put while
  // it animates away.
  payment: DialogPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// A waiting checkout, confirmed by hand: no gateway is connected yet, so
// finance checks the money arrived and records it.
export const MarkPaymentPaidDialog = ({ payment, open, onOpenChange }: MarkPaymentDialogProps) => {
  const { translate } = useLocale();
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={translate("Mark {id} as paid", { id: payment ? shortPaymentId(payment.id) : "" })} size="md">
      {payment && <MarkPaidForm payment={payment} onDone={() => onOpenChange(false)} />}
    </FormDialog>
  );
};

export const MarkPaymentFailedDialog = ({ payment, open, onOpenChange }: MarkPaymentDialogProps) => {
  const { translate } = useLocale();
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={translate("Mark {id} as failed", { id: payment ? shortPaymentId(payment.id) : "" })} size="sm">
      {payment && <MarkFailedForm payment={payment} onDone={() => onOpenChange(false)} />}
    </FormDialog>
  );
};
