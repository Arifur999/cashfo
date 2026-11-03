"use client";

import { useForm } from "@tanstack/react-form";
import { useId } from "react";
import { updateSettingsAction } from "@/app/(dashboardLayout)/admin/settings/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IPaymentAccounts } from "@/types/settings.types";
import { paymentAccountsFormZodSchema as schema, type IPaymentAccountsFormValues } from "@/zod/settings.validation";

const EMPTY: IPaymentAccounts = { bkash: "", nagad: "", rocket: "", bank: { bankName: "", branch: "", accountName: "", accountNumber: "", routingNumber: "" } };

const toFormValues = ({ bkash, nagad, rocket, bank }: IPaymentAccounts): IPaymentAccountsFormValues => ({ bkash, nagad, rocket, ...bank });

const toPayload = ({ bkash, nagad, rocket, ...bank }: IPaymentAccountsFormValues): IPaymentAccounts => ({ bkash, nagad, rocket, bank });

// "Payment accounts": where a customer sends the money for a plan
// (Checkout › Send money yourself). An empty number, or a bank without its
// name, account name and number, isn't offered; with none set the
// checkout shows the billing instructions instead. Only a super admin
// changes them; every save goes to the audit log.
const PaymentAccountsCard = ({ accounts, canManage }: { accounts: IPaymentAccounts | undefined; canManage: boolean }) => {
  const titleId = useId();
  const initial = toFormValues(accounts ?? EMPTY);
  const { run, isPending } = useActionMutation({
    action: updateSettingsAction,
    successMessage: "Payment accounts saved",
    invalidateKeys: [queryKeys.settings.all],
    refreshRoute: false,
  });
  const form = useForm({
    defaultValues: initial,
    onSubmit: async ({ value, formApi }) => {
      if (await run({ billingPaymentAccounts: toPayload(value) })) formApi.reset(value, { keepDefaultValues: true });
    },
  });
  const disabled = !canManage;
  const field = (name: keyof IPaymentAccountsFormValues, label: string, description?: string, inputMode?: "numeric" | "tel") => (
    <form.Field name={name} validators={{ onChange: schema.shape[name] }}>
      {(api) => <AppField field={api} label={label} inputMode={inputMode} disabled={disabled} description={description} />}
    </form.Field>
  );

  return (
    <Card asChild padding="none" className="overflow-hidden">
      <section aria-labelledby={titleId}>
        <div className="flex flex-col gap-0.75 px-5 pt-4 pb-1">
          <h2 id={titleId} className="text-title text-ink">
            <T>Payment accounts</T>
          </h2>
          <p className="text-small leading-normal text-ink-soft">
            <T>Where customers send the money for a plan. Leave a number empty to hide that way at checkout.</T>
          </p>
        </div>
        <AppForm onSubmit={form.handleSubmit} className="space-y-0">
          <div className="grid gap-4 px-5 pt-3 pb-4 sm:grid-cols-3">
            {field("bkash", "bKash number", "Personal account, for Send Money", "tel")}
            {field("nagad", "Nagad number", undefined, "tel")}
            {field("rocket", "Rocket number", "With its last digit, if it has 12", "tel")}
          </div>
          <div className="grid gap-4 border-t border-divider px-5 pt-4 pb-5 sm:grid-cols-2">
            {field("bankName", "Bank")}
            {field("branch", "Branch")}
            {field("accountName", "Account name")}
            {field("accountNumber", "Account number", undefined, "numeric")}
            {field("routingNumber", "Routing number", "9 digits, for BEFTN", "numeric")}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-strip px-5 py-3">
            <span className="text-small text-ink-muted">
              <T>{canManage ? "Every save goes to the audit log." : "Only a super admin can change these."}</T>
            </span>
            {canManage && (
              <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting] as const}>
                {([isDirty, isSubmitting]) => (
                  <span className="ml-auto flex gap-2">
                    <Button variant="secondary" size="md" disabled={!isDirty || isSubmitting} onClick={() => form.reset()}>
                      <T>Discard</T>
                    </Button>
                    <AppSubmitButton isPending={isPending || isSubmitting} disabled={!isDirty} pendingLabel="Saving..." variant="action" size="md" className="w-auto">
                      <T>Save accounts</T>
                    </AppSubmitButton>
                  </span>
                )}
              </form.Subscribe>
            )}
          </div>
        </AppForm>
      </section>
    </Card>
  );
};

export default PaymentAccountsCard;
