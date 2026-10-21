"use client";

import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { refundPaymentAction } from "@/app/(dashboardLayout)/admin/payments/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatAmount } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { firstZodError } from "@/lib/formValidators";
import { queryKeys } from "@/lib/queryKeys";
import { humanizeEnum } from "@/lib/statusBadge";
import { cn } from "@/lib/utils";
import type { IPaymentDetail } from "@/types/payment.types";
import { buildRefundFormZodSchema, type IRefundFormValues } from "@/zod/payment.validation";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type HowMuch = "all" | "part";

// The amount's own rules (a money amount above zero) and the reason's,
// without the ceiling: that one is checked here with a fixed message, since
// "Up to {amount}." under the field already says where it is.
const RULES = buildRefundFormZodSchema(Number.POSITIVE_INFINITY).shape;

// Mounted inside the dialog content, so each open starts at the full
// amount. All of it, or part of it with an amount, then the reason.
const RefundForm = ({ payment, onDone }: { payment: IPaymentDetail; onDone: () => void }) => {
  const maxAmount = Number(payment.amount);
  const [howMuch, setHowMuch] = useState<HowMuch>("all");
  const { translate } = useLocale();
  // The two choices are one radio group: Tab reaches the chosen one, the
  // arrow keys move between them.
  const choiceRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  const moveChoice = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    choose(options[next].value);
    choiceRefs.current[next]?.focus();
  };

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <p className="flex flex-col gap-1 text-body leading-relaxed text-ink-2">
        <span>
          <T
            values={{
              gateway: <b className="font-semibold text-ink">{translate(humanizeEnum(payment.gateway))}</b>,
              name: payment.platformUser?.name ?? translate("The person"),
              amount: <b className="font-semibold text-ink">{formatAmount(maxAmount, payment.currency)}</b>,
              date: formatDate(payment.paidAt ?? payment.createdAt, "d MMM"),
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
      <div role="radiogroup" aria-label={translate("How much")} className="grid gap-3 sm:grid-cols-2">
        {options.map((option, index) => {
          const on = howMuch === option.value;
          return (
            <button
              key={option.value}
              ref={(node) => {
                choiceRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => choose(option.value)}
              onKeyDown={(event) => moveChoice(event, index)}
              className={cn("flex items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors", on ? "border-emerald bg-mint-50" : "border-line hover:bg-hover")}
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
        <form.Field
          name="amount"
          validators={{
            onChange: ({ value }) => firstZodError(RULES.amount, value) ?? (Number(value) > maxAmount ? "More than this payment" : undefined),
          }}
        >
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
      <form.Field name="reason" validators={{ onChange: RULES.reason }}>
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
