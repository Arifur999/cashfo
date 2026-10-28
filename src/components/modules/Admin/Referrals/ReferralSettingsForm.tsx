"use client";

import { type AnyFieldApi, useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Info, ShieldCheck } from "lucide-react";
import { updateReferralSettingsAction } from "@/app/(dashboardLayout)/admin/referrals/_action";
import LoadError from "@/components/modules/Admin/Payments/LoadError";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import FormFieldShell from "@/components/shared/form/FormFieldShell";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ChoiceCard, { ChoiceCardGroup } from "@/components/smartly/ChoiceCard";
import Input from "@/components/smartly/form/Input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCurrency } from "@/lib/currency";
import { METHOD_BRANDS } from "@/lib/customer/referralDisplay";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { plansQuery } from "@/queries/plan.queries";
import { referralSettingsQuery } from "@/queries/referral.queries";
import { PAYOUT_METHOD_TYPES, type IReferralSettings } from "@/types/referral.types";
import { getFeeError, referralSettingsFormZodSchema, type IReferralSettingsFormValues } from "@/zod/referral.validation";
import { referralExample } from "./payoutsDisplay";

const rules = referralSettingsFormZodSchema.shape;

const toFormValues = (settings: IReferralSettings): IReferralSettingsFormValues => ({
  programLive: settings.programLive,
  whoCanEarn: settings.whoCanEarn,
  commissionPct: String(settings.commissionPct),
  friendDiscountPct: String(settings.friendDiscountPct),
  holdDays: String(settings.holdDays),
  minWithdrawal: String(settings.minWithdrawal),
  withdrawalFee: String(settings.withdrawalFee),
  payWithinDays: String(settings.payWithinDays),
  payoutMethods: settings.payoutMethods,
  blockSelf: settings.blockSelf,
  cancelOnRefund: settings.cancelOnRefund,
  flagSameNumber: settings.flagSameNumber,
  maxPerMonth: settings.maxPerMonth === null ? "" : String(settings.maxPerMonth),
});

const CARD = "flex flex-col gap-4 p-5";
const CHECKBOX = "size-4.5 rounded-[5px] border-line-strong data-checked:border-emerald data-checked:bg-emerald";

// A number with its unit in a grey cell beside it: "20 | %", "৳ | 500".
const UnitInput = ({
  field,
  label,
  unit,
  unitFirst = false,
  hint,
  disabled,
}: {
  field: AnyFieldApi;
  label: string;
  unit: string;
  unitFirst?: boolean;
  hint: string;
  disabled: boolean;
}) => {
  const { translate } = useLocale();
  const cell = <span className={cn("flex h-full items-center bg-strip px-2.5 text-small text-ink-soft", unitFirst ? "border-r border-line" : "border-l border-line")}>{translate(unit)}</span>;
  return (
    <FormFieldShell field={field} label={<span className="text-[13.5px]">{translate(label)}</span>} description={hint}>
      {(control, hasError) => (
        <Input
          {...control}
          name={field.name}
          size="sm"
          inputMode="numeric"
          invalid={hasError}
          disabled={disabled}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          leading={unitFirst ? cell : undefined}
          trailing={unitFirst ? undefined : cell}
          frameClassName={cn("h-10.5 items-stretch overflow-hidden rounded-sm px-0 [&>span]:items-stretch", unitFirst ? "pr-2.5" : "pl-2.5 pr-0")}
          className="text-[15px] font-semibold tabular-nums"
        />
      )}
    </FormFieldShell>
  );
};

// The worked example under the earning rules, from the dearest paid plan.
const Example = ({ friendDiscountPct, commissionPct, holdDays }: { friendDiscountPct: string; commissionPct: string; holdDays: string }) => {
  const { translate, locale } = useLocale();
  const plans = useQuery(plansQuery()).data?.data ?? [];
  const plan = [...plans].filter((p) => p.isActive && p.billingCycle !== "FREE").sort((a, b) => Number(b.price) - Number(a.price))[0];
  if (!plan) return null;
  const discount = Number(friendDiscountPct) || 0;
  const rate = Number(commissionPct) || 0;
  const example = referralExample(Number(plan.price), discount, rate);
  const money = (value: number) => formatCurrency(value, undefined, value % 1 ? 2 : 0, locale);
  const pct = (value: number) => formatCount(value, locale);
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-mint-200 bg-emerald-soft p-3.5 text-small text-forest tabular-nums">
      <span className="text-caption font-bold tracking-[0.04em] text-brand-ink uppercase">{translate("With these numbers")}</span>
      <span className="flex justify-between gap-3">
        <span>{translate("Friend picks {plan}", { plan: plan.name })}</span>
        <b>{money(example.price)}</b>
      </span>
      <span className="flex justify-between gap-3">
        <span>{translate("Friend pays ({percent}% off)", { percent: pct(discount) })}</span>
        <b>{money(example.friendPays)}</b>
      </span>
      <span className="flex justify-between gap-3">
        <span>{translate("Referrer earns ({percent}%), {days} days later", { percent: pct(rate), days: formatCount(Number(holdDays) || 0, locale) })}</span>
        <b className="text-emerald">{money(example.commission)}</b>
      </span>
      <span className="flex justify-between gap-3 border-t border-mint-200 pt-2">
        <span>{translate("You keep")}</span>
        <b>{money(example.youKeep)}</b>
      </span>
    </div>
  );
};

const SettingsFormBody = ({ settings, canManage }: { settings: IReferralSettings; canManage: boolean }) => {
  const { translate, locale } = useLocale();
  const disabled = !canManage;
  const { run, isPending } = useActionMutation({
    action: (values: IReferralSettingsFormValues) => updateReferralSettingsAction(values),
    successMessage: "Referral settings saved",
    invalidateKeys: [queryKeys.referralSettings],
  });
  const form = useForm({
    defaultValues: toFormValues(settings),
    onSubmit: async ({ value }) => {
      if (await run(value)) form.reset(value);
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-col gap-4.5 space-y-0">
      <div className="grid items-start gap-4.5 lg:grid-cols-2">
        <Card asChild padding="none" className={CARD}>
          <section aria-labelledby="rs-earn">
            <div className="flex items-center justify-between gap-3">
              <h2 id="rs-earn" className="text-title text-ink">
                {translate("Earning rules")}
              </h2>
              <form.Field name="programLive">
                {(field) => (
                  <label className={cn("flex items-center gap-2.5 text-small font-semibold", field.state.value ? "text-emerald" : "text-ink-muted")}>
                    {translate(field.state.value ? "Program is live" : "Program is paused")}
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                      disabled={disabled}
                      aria-label={translate("Referral Program on")}
                      className="data-checked:bg-emerald data-unchecked:bg-line-strong"
                    />
                  </label>
                )}
              </form.Field>
            </div>
            <form.Field name="whoCanEarn">
              {(field) => (
                <fieldset className="flex flex-col gap-2" disabled={disabled}>
                  <legend className="mb-2 text-body font-medium text-ink">{translate("Who can earn")}</legend>
                  <ChoiceCardGroup aria-label={translate("Who can earn")} className="flex flex-col gap-2">
                    <ChoiceCard
                      checked={field.state.value === "PAID_PLAN"}
                      onSelect={() => !disabled && field.handleChange("PAID_PLAN")}
                      title={<span className="text-body font-semibold">{translate("Only users with an active paid plan")}</span>}
                      sub={<span className="text-[12.5px] text-ink-muted">{translate("Free users see what they could earn and a See plans button.")}</span>}
                    />
                    <ChoiceCard
                      checked={field.state.value === "EVERYONE"}
                      onSelect={() => !disabled && field.handleChange("EVERYONE")}
                      title={<span className="text-body font-semibold">{translate("Every user")}</span>}
                      sub={<span className="text-[12.5px] text-ink-muted">{translate("Anyone with an account can share and earn.")}</span>}
                    />
                  </ChoiceCardGroup>
                </fieldset>
              )}
            </form.Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <form.Field name="commissionPct" validators={{ onChange: rules.commissionPct }}>
                {(field) => <UnitInput field={field} label="Commission" unit="%" hint="Of the friend’s first payment" disabled={disabled} />}
              </form.Field>
              <form.Field name="friendDiscountPct" validators={{ onChange: rules.friendDiscountPct }}>
                {(field) => <UnitInput field={field} label="Friend’s discount" unit="%" hint="Off their first payment" disabled={disabled} />}
              </form.Field>
              <form.Field name="holdDays" validators={{ onChange: rules.holdDays }}>
                {(field) => <UnitInput field={field} label="Hold period" unit="days" hint="Refund window before it’s ready" disabled={disabled} />}
              </form.Field>
            </div>
            <form.Subscribe selector={(state) => [state.values.friendDiscountPct, state.values.commissionPct, state.values.holdDays] as const}>
              {([friendDiscountPct, commissionPct, holdDays]) => <Example friendDiscountPct={friendDiscountPct} commissionPct={commissionPct} holdDays={holdDays} />}
            </form.Subscribe>
          </section>
        </Card>

        <div className="flex flex-col gap-4.5">
          <Card asChild padding="none" className={cn(CARD, "gap-3.5")}>
            <section aria-labelledby="rs-withdraw">
              <h2 id="rs-withdraw" className="text-title text-ink">
                {translate("Withdrawals")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <form.Field name="minWithdrawal" validators={{ onChange: rules.minWithdrawal }}>
                  {(field) => <UnitInput field={field} label="Minimum" unit="৳" unitFirst hint="Smallest withdrawal" disabled={disabled} />}
                </form.Field>
                <form.Field
                  name="withdrawalFee"
                  validators={{
                    onChangeListenTo: ["minWithdrawal"],
                    onChange: ({ value, fieldApi }) => {
                      const base = rules.withdrawalFee.safeParse(value);
                      if (!base.success) return base.error.issues[0]?.message;
                      return getFeeError(value, fieldApi.form.getFieldValue("minWithdrawal"));
                    },
                  }}
                >
                  {(field) => (
                    <UnitInput field={field} label="Fee" unit="৳" unitFirst hint={Number(field.state.value) > 0 ? "Taken off what is sent" : "We pay the transfer cost"} disabled={disabled} />
                  )}
                </form.Field>
                <form.Field name="payWithinDays" validators={{ onChange: rules.payWithinDays }}>
                  {(field) => <UnitInput field={field} label="Pay within" unit="days" hint="Working days (Sun to Thu)" disabled={disabled} />}
                </form.Field>
              </div>
              <form.Field name="payoutMethods" validators={{ onChange: rules.payoutMethods }}>
                {(field) => (
                  <fieldset className="flex flex-col gap-2" disabled={disabled}>
                    <legend className="mb-2 text-[13.5px] font-medium text-ink">{translate("Where users can receive money")}</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {PAYOUT_METHOD_TYPES.map((type) => {
                        const on = field.state.value.includes(type);
                        return (
                          <label
                            key={type}
                            className={cn(
                              "flex h-10.5 cursor-pointer items-center gap-2 rounded-[8px] border px-2.5 text-small font-semibold text-ink",
                              on ? "border-mint-200 bg-emerald-soft" : "border-line bg-surface",
                            )}
                          >
                            <Checkbox
                              checked={on}
                              disabled={disabled}
                              onCheckedChange={(checked) =>
                                field.handleChange(checked === true ? PAYOUT_METHOD_TYPES.filter((t) => t === type || field.state.value.includes(t)) : field.state.value.filter((t: string) => t !== type))
                              }
                              className="size-4 rounded-[4px] border-line-strong data-checked:border-emerald data-checked:bg-emerald"
                            />
                            {METHOD_BRANDS[type].name}
                          </label>
                        );
                      })}
                    </div>
                    {field.state.meta.errors.length > 0 && <p className="text-caption text-expense">{translate(String((field.state.meta.errors[0] as { message?: string })?.message ?? field.state.meta.errors[0]))}</p>}
                  </fieldset>
                )}
              </form.Field>
              <span className="flex items-center gap-2 text-small text-ink-2">
                <ShieldCheck className="size-3.75 shrink-0 text-emerald" aria-hidden="true" />
                {translate("Every withdrawal needs a one-time code. This can't be turned off.")}
              </span>
            </section>
          </Card>

          <Card asChild padding="none" className={cn(CARD, "gap-3")}>
            <section aria-labelledby="rs-fraud">
              <h2 id="rs-fraud" className="text-title text-ink">
                {translate("Fraud protection")}
              </h2>
              {(
                [
                  ["blockSelf", "Block sign-ups that use the referrer’s own phone, email or device"],
                  ["cancelOnRefund", "Cancel the commission when the friend is refunded"],
                  ["flagSameNumber", "Flag a withdrawal when a friend paid from the referrer’s number"],
                ] as const
              ).map(([name, text]) => (
                <form.Field key={name} name={name}>
                  {(field) => (
                    <label className="flex cursor-pointer gap-2.5 text-[13.5px] leading-[1.45] text-ink-2">
                      <Checkbox checked={field.state.value} disabled={disabled} onCheckedChange={(checked) => field.handleChange(checked === true)} className={cn(CHECKBOX, "mt-px")} />
                      <span>{translate(text)}</span>
                    </label>
                  )}
                </form.Field>
              ))}
              <form.Field name="maxPerMonth" validators={{ onChange: rules.maxPerMonth }}>
                {(field) => (
                  <FormFieldShell field={field} label={<span className="sr-only">{translate("Monthly referral limit")}</span>}>
                    {(control, hasError) => (
                      <div className="-mt-1.5 flex items-center gap-2.5 text-[13.5px] text-ink-2">
                        <span className="grow">{translate("Most new referrals one person can make in a month")}</span>
                        <Input
                          {...control}
                          name={field.name}
                          size="sm"
                          inputMode="numeric"
                          invalid={hasError}
                          disabled={disabled}
                          placeholder={translate("No limit")}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          frameClassName="w-24 shrink-0"
                          className="text-right font-semibold tabular-nums"
                        />
                      </div>
                    )}
                  </FormFieldShell>
                )}
              </form.Field>
            </section>
          </Card>
        </div>
      </div>

      <Card padding="none" className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
        <span className="flex grow items-start gap-3 text-[13.5px] text-ink-soft">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="flex flex-col gap-0.5">
            {translate("New numbers apply to purchases made after you save. Money people have already earned keeps its old rate.")}
            {settings.lastChange && (
              <span className="text-caption text-ink-muted">
                {translate(settings.lastChange.by ? "Last changed by {name} on {date}" : "Last changed on {date}", {
                  name: settings.lastChange.by ?? "",
                  date: formatDate(settings.lastChange.at, "d MMM yyyy", "—", locale),
                })}
              </span>
            )}
            {!canManage && <span className="text-caption text-ink-muted">{translate("Only super and finance admins can change these.")}</span>}
          </span>
        </span>
        {canManage && (
          <form.Subscribe selector={(state) => state.isDirty}>
            {(dirty) => (
              <span className="flex shrink-0 gap-2.5">
                <Button type="button" variant="secondary" size="md" disabled={!dirty || isPending} onClick={() => form.reset()}>
                  {translate("Discard")}
                </Button>
                <AppSubmitButton isPending={isPending} pendingLabel={translate("Saving...")} variant="action" size="md" className="w-auto" disabled={!dirty}>
                  {translate("Save changes")}
                </AppSubmitButton>
              </span>
            )}
          </form.Subscribe>
        )}
      </Card>
    </AppForm>
  );
};

// Admin > Referrals & Payouts > Settings: the earning rules, the
// withdrawals and the fraud checks, read by every admin and changed by super
// and finance admins.
const ReferralSettingsForm = ({ canManage }: { canManage: boolean }) => {
  const query = useQuery(referralSettingsQuery());
  const settings = query.data?.data;
  if (!settings) return query.isError ? <LoadError title="Couldn't load the referral settings" onRetry={() => void query.refetch()} /> : null;
  // Keyed by the saved values, so a save (or someone else's) starts the
  // form from what is stored.
  return <SettingsFormBody key={JSON.stringify(settings)} settings={settings} canManage={canManage} />;
};

export default ReferralSettingsForm;
