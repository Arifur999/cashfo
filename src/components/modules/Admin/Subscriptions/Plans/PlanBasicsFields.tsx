"use client";

import AppField from "@/components/shared/form/AppField";
import AppSelectField from "@/components/shared/form/AppSelectField";
import { enumOptions, humanizeEnum } from "@/lib/statusBadge";
import { BILLING_CYCLES, type ISubscriptionPlan } from "@/types/plan.types";
import { planFormZodSchema as schema } from "@/zod/plan.validation";
import type { PlanFormApi } from "./usePlanForm";

const BILLING_CYCLE_OPTIONS = enumOptions(BILLING_CYCLES);

interface PlanBasicsFieldsProps {
  form: PlanFormApi;
  // An existing plan's billing stays what it is; only a new plan picks it.
  plan?: ISubscriptionPlan;
}

// Name and trial on one row, price and billing on the next, as the design
// lays the drawer out.
const PlanBasicsFields = ({ form, plan }: PlanBasicsFieldsProps) => {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
        <form.Field name="name" validators={{ onChange: schema.shape.name }}>
          {(field) => <AppField field={field} label="Name" placeholder="Monthly Pro" />}
        </form.Field>
        <form.Field name="trialDays" validators={{ onChange: schema.shape.trialDays }}>
          {(field) => <AppField field={field} label="Free trial" inputMode="numeric" append={<span className="text-small text-ink-muted">days</span>} />}
        </form.Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
        <form.Field name="price" validators={{ onChange: schema.shape.price }}>
          {(field) => <AppField field={field} label="Price" inputMode="decimal" prepend={<span className="text-body text-ink-muted">৳</span>} />}
        </form.Field>
        {plan ? (
          <div className="flex flex-col gap-2">
            <span className="text-small font-semibold text-ink-2">Billing</span>
            <span className="flex h-11 items-center rounded-md border border-line bg-cream px-4 text-body text-ink-muted">{humanizeEnum(plan.billingCycle)}</span>
          </div>
        ) : (
          <form.Field name="billingCycle">{(field) => <AppSelectField field={field} label="Billing" options={BILLING_CYCLE_OPTIONS} />}</form.Field>
        )}
      </div>
    </>
  );
};

export default PlanBasicsFields;
