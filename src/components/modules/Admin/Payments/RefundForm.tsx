"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo } from "react";
import { refundPaymentAction } from "@/app/(dashboardLayout)/admin/payments/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCurrency } from "@/lib/currency";
import { queryKeys } from "@/lib/queryKeys";
import type { IPaymentDetail } from "@/types/payment.types";
import { buildRefundFormZodSchema, type IRefundFormValues } from "@/zod/payment.validation";

// Mounted inside the dialog content, so each open starts at the full amount.
const RefundForm = ({ payment, onDone }: { payment: IPaymentDetail; onDone: () => void }) => {
  const maxAmount = Number(payment.amount);
  const schema = useMemo(() => buildRefundFormZodSchema(maxAmount), [maxAmount]);

  const { run, isPending } = useActionMutation({
    action: (values: IRefundFormValues) => refundPaymentAction(payment.id, values),
    successMessage: "Payment refunded",
    invalidateKeys: [queryKeys.payments.all],
  });

  const form = useForm({
    defaultValues: { amount: String(maxAmount), reason: "" } satisfies IRefundFormValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <form.Field name="amount" validators={{ onChange: schema.shape.amount }}>
        {(field) => (
          <AppField
            field={field}
            label="Amount"
            type="number"
            description={`Up to ${formatCurrency(maxAmount, payment.currency)} -- less for a partial refund.`}
          />
        )}
      </form.Field>
      <form.Field name="reason" validators={{ onChange: schema.shape.reason }}>
        {(field) => <AppTextareaField field={field} label="Reason" rows={3} description="Recorded in the audit log." />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Confirm refund" pendingLabel="Refunding..." variant="destructive" />
    </AppForm>
  );
};

export default RefundForm;
