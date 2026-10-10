"use client";

import AppField from "@/components/shared/form/AppField";
import AppSelectField from "@/components/shared/form/AppSelectField";
import { enumOptions } from "@/lib/statusBadge";
import { BILLING_CYCLES } from "@/types/plan.types";
import { planFormZodSchema as schema, slugify } from "@/zod/plan.validation";
import type { PlanFormApi } from "./usePlanForm";

const BILLING_CYCLE_OPTIONS = enumOptions(BILLING_CYCLES);

interface PlanBasicsFieldsProps {
  form: PlanFormApi;
  // New plans derive the slug from the name until the slug is edited by hand;
  // an existing plan's slug never changes on its own.
  autoSlug: boolean;
}

const PlanBasicsFields = ({ form, autoSlug }: PlanBasicsFieldsProps) => {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field
          name="name"
          validators={{ onChange: schema.shape.name }}
          listeners={{
            onChange: ({ value }) => {
              if (autoSlug && !form.getFieldMeta("slug")?.isDirty) {
                // dontUpdateMeta keeps the slug "pristine", so it keeps
                // following the name until the admin edits it directly.
                form.setFieldValue("slug", slugify(value), { dontUpdateMeta: true });
              }
            },
          }}
        >
          {(field) => <AppField field={field} label="Name" placeholder="Monthly Pro" />}
        </form.Field>
        <form.Field name="slug" validators={{ onChange: schema.shape.slug }}>
          {(field) => <AppField field={field} label="Slug" placeholder="monthly-pro" />}
        </form.Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <form.Field name="billingCycle">
          {(field) => <AppSelectField field={field} label="Billing cycle" options={BILLING_CYCLE_OPTIONS} />}
        </form.Field>
        <form.Field name="price" validators={{ onChange: schema.shape.price }}>
          {(field) => <AppField field={field} label="Price (BDT)" type="number" />}
        </form.Field>
        <form.Field name="trialDays" validators={{ onChange: schema.shape.trialDays }}>
          {(field) => <AppField field={field} label="Trial days" type="number" />}
        </form.Field>
      </div>
    </div>
  );
};

export default PlanBasicsFields;
