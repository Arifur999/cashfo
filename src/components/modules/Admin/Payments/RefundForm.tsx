"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { refundPaymentAction } from "@/app/(dashboardLayout)/admin/payments/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatAmount } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { queryKeys } from "@/lib/queryKeys";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IPaymentDetail } from "@/types/payment.types";
import { buildRefundFormZodSchema, type IRefundFormValues } from "@/zod/payment.validation";
import ChoiceCard, { ChoiceCardGroup } from "@/components/smartly/ChoiceCard";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type HowMuch = "all" | "part";

// Mounted inside the dialog content, so each open starts at the full
// amount. All of it, or part of it with an amount, then the reason.
const RefundForm = ({ payment, onDone }: { payment: IPaymentDetail; onDone: () => void }) => {
  const maxAmount = Number(payment.amount);
  const [howMuch, setHowMuch] = useState<HowMuch>("all");
  const { translate, locale } = useLocale();
  // A money amount above zero and no more than was paid ("More than this
  // payment"; "Up to {amount}." under the field says where that is), and
  // the reason.
  const rules = buildRefundFormZodSchema(maxAmount).shape;

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
    { value: "all", title: "All of it", sub: formatAmount(maxAmount, payment.currency) },
    { value: "part", title: "Part of it", sub: "Type an amount" },
  ];

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <p className="flex flex-col gap-1 text-body leading-relaxed text-ink-2">
        <span>
          <T
            values={{
              gateway: <b className="font-semibold text-ink">{translate(humanizeEnum(payment.gateway))}</b>,
              name: payment.platformUser?.name ?? translate("The person"),
              amount: <b className="font-semibold text-ink">{formatAmount(maxAmount, payment.currency)}</b>,
              date: formatDate(payment.paidAt ?? payment.createdAt, "d MMM", "—", locale),
            }}
          >
            {"The money goes back through {gateway} to the account that paid. {name} paid {amount} on {date}."}
          </T>
        </span>
        {/* What to look the payment up by on the gateway's side. */}
        {payment.gatewayReferenceId && (
          <span>
            <T
              values={{
                gateway: translate(humanizeEnum(payment.gateway)),
                ref: <code className="font-mono text-small text-ink select-all">{payment.gatewayReferenceId}</code>,
              }}
            >
              {"{gateway} reference: {ref}"}
            </T>
          </span>
        )}
      </p>
      {/* One radio group: Tab reaches the chosen card, the arrow keys, Home
          and End move between them. */}
      <ChoiceCardGroup aria-label={translate("How much")} className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <ChoiceCard key={option.value} checked={howMuch === option.value} onSelect={() => choose(option.value)} title={<T>{option.title}</T>} sub={<T>{option.sub}</T>} />
        ))}
      </ChoiceCardGroup>
      {howMuch === "part" && (
        <form.Field name="amount" validators={{ onChange: rules.amount }}>
          {(field) => (
            <AppField
              field={field}
              label="Amount"
              inputMode="decimal"
              prepend={<span className="text-body text-ink-muted">৳</span>}
              description={translate("Up to {amount}.", { amount: formatAmount(maxAmount, payment.currency) })}
            />
          )}
        </form.Field>
      )}
      <form.Field name="reason" validators={{ onChange: rules.reason }}>
        {(field) => <AppTextareaField field={field} label="Reason" rows={2} placeholder="Why the money is going back" />}
      </form.Field>
      <p className="rounded-md border border-line bg-strip px-4 py-3 text-small leading-relaxed text-ink-2">
        <T>The refund and the reason go into the audit log. Nothing is sent to the gateway from here: send the money back there, then record it.</T>
      </p>
      <form.Subscribe selector={(state) => state.values.amount}>
        {(amount) => (
          <FormDialogFooter
            isPending={isPending}
            submitLabel={translate("Refund {amount}", { amount: formatAmount(Number(amount) || 0, payment.currency) })}
            pendingLabel="Refunding..."
            variant="destructive"
          />
        )}
      </form.Subscribe>
    </AppForm>
  );
};

export default RefundForm;
