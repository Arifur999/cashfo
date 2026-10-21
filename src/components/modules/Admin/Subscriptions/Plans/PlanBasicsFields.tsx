"use client";

import AppField from "@/components/shared/form/AppField";
import AppSelectField from "@/components/shared/form/AppSelectField";
import { firstZodError } from "@/lib/formValidators";
import { enumOptions, humanizeEnum } from "@/lib/statusBadge";
import { money } from "@/lib/subscriptions";
import { BILLING_CYCLES, type ISubscriptionPlan } from "@/types/plan.types";
import { planFormZodSchema as schema, slugify } from "@/zod/plan.validation";
import type { PlanFormApi } from "./usePlanForm";
import T from "@/components/shared/T";

const BILLING_CYCLE_OPTIONS = enumOptions(BILLING_CYCLES);

const checkName = ({ value }: { value: string }) => firstZodError(schema.shape.name, value);

// A new plan's slug is made from its name, so the name must keep at least
// one English letter or number ("মাসিক প্রো" alone would leave nothing).
const checkNewName = ({ value }: { value: string }) => checkName({ value }) ?? (slugify(value) ? undefined : "Use at least one English letter or number");

// What a plan can't change, shown in the read-only band where its field
// would be.
const ReadOnlyField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    <span className="text-small font-semibold text-ink-2">
      <T>{label}</T>
    </span>
    <span className="flex h-11 items-center rounded-md border border-line bg-strip px-4 text-body text-ink-muted">{children}</span>
  </div>
);

interface PlanBasicsFieldsProps {
  form: PlanFormApi;
  // An existing plan's billing stays what it is; only a new plan picks it.
  // The free plan's price and trial stay too: it is free, with no trial.
  plan?: ISubscriptionPlan;
}

// Name and trial on one row, price and billing on the next, as the design
// lays the drawer out.
const PlanBasicsFields = ({ form, plan }: PlanBasicsFieldsProps) => {
  const free = plan?.billingCycle === "FREE";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
        <form.Field name="name" validators={{ onChange: plan ? checkName : checkNewName }}>
          {(field) => <AppField field={field} label="Name" placeholder="Monthly Pro" />}
        </form.Field>
        {free ? (
          <ReadOnlyField label="Free trial">
            <T>No trial needed</T>
          </ReadOnlyField>
        ) : (
          <form.Field name="trialDays" validators={{ onChange: schema.shape.trialDays }}>
            {(field) => <AppField field={field} label="Free trial" inputMode="numeric" append={<span className="text-small text-ink-muted"><T>days</T></span>} />}
          </form.Field>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
        {free ? (
          <ReadOnlyField label="Price">{money(plan.price, plan.currency)}</ReadOnlyField>
        ) : (
          <form.Field name="price" validators={{ onChange: schema.shape.price }}>
            {(field) => <AppField field={field} label="Price" inputMode="decimal" prepend={<span className="text-body text-ink-muted">৳</span>} />}
          </form.Field>
        )}
        {plan ? (
          <ReadOnlyField label="Billing">
            <T>{humanizeEnum(plan.billingCycle)}</T>
          </ReadOnlyField>
        ) : (
          <form.Field name="billingCycle">{(field) => <AppSelectField field={field} label="Billing" options={BILLING_CYCLE_OPTIONS} />}</form.Field>
        )}
      </div>
    </>
  );
};

export default PlanBasicsFields;
