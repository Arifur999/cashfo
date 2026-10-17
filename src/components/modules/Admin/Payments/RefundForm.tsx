"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { refundPaymentAction } from "@/app/(dashboardLayout)/admin/payments/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { queryKeys } from "@/lib/queryKeys";
import { humanizeEnum } from "@/lib/statusBadge";
import { cn } from "@/lib/utils";
import type { IPaymentDetail } from "@/types/payment.types";
import { buildRefundFormZodSchema, type IRefundFormValues } from "@/zod/payment.validation";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type HowMuch = "all" | "part";

// Mounted inside the dialog content, so each open starts at the full
// amount. All of it, or part of it with an amount, then the reason.
const RefundForm = ({ payment, onDone }: { payment: IPaymentDetail; onDone: () => void }) => {
  const maxAmount = Number(payment.amount);
  const schema = useMemo(() => buildRefundFormZodSchema(maxAmount), [maxAmount]);
  const [howMuch, setHowMuch] = useState<HowMuch>("all");
  const { translate } = useLocale();

  const { run, isPending } = useActionMutation({
    action: (values: IRefundFormValues) => refundPaymentAction(payment.id, values),
    successMessage: "Payment refunded",
    invalidateKeys: [queryKeys.payments.all],
    refreshRoute: true,
  });

  const form = useForm({
    defaultValues: { amount: String(maxAmount), reason: "" } satisfies IRefundFormValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  const choose = (next: HowMuch) => {
    setHowMuch(next);
    if (next === "all") form.setFieldValue("amount", String(maxAmount));
  };

  const options: { value: HowMuch; title: string; sub: string }[] = [
    { value: "all", title: "All of it", sub: formatCurrency(maxAmount, payment.currency) },
    { value: "part", title: "Part of it", sub: "Type an amount" },
  ];

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <p className="text-body leading-relaxed text-ink-2">
        <T
          values={{
            gateway: <b className="font-semibold text-ink">{translate(humanizeEnum(payment.gateway))}</b>,
            name: payment.platformUser?.name ?? translate("The person"),
            amount: <b className="font-semibold text-ink">{formatCurrency(maxAmount, payment.currency, 0)}</b>,
            date: formatDate(payment.paidAt ?? payment.createdAt, "d MMM"),
          }}
        >
          {"The money goes back through {gateway} to the account that paid. {name} paid {amount} on {date}."}
        </T>
      </p>
      <div role="radiogroup" aria-label={translate("How much")} className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const on = howMuch === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(option.value)}
              className={cn("flex items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors", on ? "border-emerald bg-mint-50" : "border-line hover:bg-cream")}
            >
              <span className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-full border-2", on ? "border-emerald" : "border-line-strong")} aria-hidden="true">
                {on && <span className="size-2 rounded-full bg-emerald" />}
              </span>
              <span className="flex flex-col">
                <b className="text-body font-semibold text-ink">
                  <T>{option.title}</T>
                </b>
                <span className="text-small text-ink-2">
                  <T>{option.sub}</T>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {howMuch === "part" && (
        <form.Field name="amount" validators={{ onChange: schema.shape.amount }}>
          {(field) => (
            <AppField
              field={field}
              label="Amount"
              inputMode="decimal"
              prepend={<span className="text-body text-ink-muted">৳</span>}
              description={translate("Up to {amount}.", { amount: formatCurrency(maxAmount, payment.currency) })}
            />
          )}
        </form.Field>
      )}
      <form.Field name="reason" validators={{ onChange: schema.shape.reason }}>
        {(field) => <AppTextareaField field={field} label="Reason" rows={2} placeholder="Why the money is going back" />}
      </form.Field>
      <p className="rounded-md border border-line bg-cream px-4 py-3 text-small leading-relaxed text-ink-2">
        <T>The refund and the reason go into the audit log. Nothing is sent to the gateway from here: send the money back there, then record it.</T>
      </p>
      <form.Subscribe selector={(state) => state.values.amount}>
        {(amount) => (
          <FormDialogFooter
            isPending={isPending}
            submitLabel={translate("Refund {amount}", { amount: formatCurrency(Number(amount) || 0, payment.currency, Number.isInteger(Number(amount)) ? 0 : 2) })}
            pendingLabel="Refunding..."
            variant="destructive"
          />
        )}
      </form.Subscribe>
    </AppForm>
  );
};

export default RefundForm;
