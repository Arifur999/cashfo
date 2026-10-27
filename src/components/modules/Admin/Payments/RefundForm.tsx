"use client";

import { useForm } from "@tanstack/react-form";
import { Info } from "lucide-react";
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

// Whether the refund takes the plan away: a full refund of the plan they
// are on, for a period that hasn't ended, drops them to Free (the API's
// rule); anything else leaves the plan as it is.
const planAfterRefund = (payment: IPaymentDetail, full: boolean): string => {
  const current = payment.subscription;
  const periodOpen = !payment.periodEnd || new Date(payment.periodEnd).getTime() > Date.now();
  if (full && payment.userId && current && current.planId === payment.planId && current.status !== "CANCELLED" && current.status !== "EXPIRED" && periodOpen) {
    return "{name} goes back to the Free plan now, because this payment paid for {plan}.";
  }
  return current ? "{name} stays on {current}." : "";
};

// Mounted inside the dialog content, so each open starts at the full
// amount. All of it, or part of it with an amount, then the reason.
const RefundForm = ({ payment, onDone }: { payment: IPaymentDetail; onDone: () => void }) => {
  const maxAmount = Number(payment.amount);
  const [howMuch, setHowMuch] = useState<HowMuch>("all");
  const { translate, locale } = useLocale();
  const firstName = (payment.platformUser?.name ?? "").split(/\s+/)[0] || translate("The person");
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
    { value: "all", title: "All of it", sub: formatAmount(maxAmount, payment.currency, locale) },
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
              amount: <b className="font-semibold text-ink">{formatAmount(maxAmount, payment.currency, locale)}</b>,
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
              description={translate("Up to {amount}.", { amount: formatAmount(maxAmount, payment.currency, locale) })}
            />
          )}
        </form.Field>
      )}
      <form.Field name="reason" validators={{ onChange: rules.reason }}>
        {(field) => <AppTextareaField field={field} label="Reason" rows={2} placeholder="Why the money is going back" />}
      </form.Field>
      {/* What happens to their plan (a full refund of the period they are
          in takes it away, as the API does), then where the money goes. */}
      <form.Subscribe selector={(state) => state.values.amount}>
        {(amount) => (
          <p className="flex gap-2.5 rounded-[14px] border border-line bg-strip px-3.5 py-3 text-small leading-normal text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>
              {translate(planAfterRefund(payment, Number(amount) >= maxAmount), { name: firstName, plan: payment.plan.name, current: payment.subscription?.planName ?? "" })}{" "}
              <T>The refund and the reason go into the audit log. Nothing is sent to the gateway from here: send the money back there, then record it.</T>
            </span>
          </p>
        )}
      </form.Subscribe>
      <form.Subscribe selector={(state) => state.values.amount}>
        {(amount) => (
          <FormDialogFooter
            isPending={isPending}
            submitLabel={translate("Refund {amount}", { amount: formatAmount(Number(amount) || 0, payment.currency, locale) })}
            pendingLabel="Refunding..."
            variant="destructive"
          />
        )}
      </form.Subscribe>
    </AppForm>
  );
};

export default RefundForm;
