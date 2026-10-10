"use client";

import AppField from "@/components/shared/form/AppField";
import AppSwitchField from "@/components/shared/form/AppSwitchField";
import { planFormZodSchema } from "@/zod/plan.validation";
import { PLAN_FEATURE_TOGGLES, PLAN_NUMERIC_LIMITS } from "./planFeatures";
import type { PlanFormApi } from "./usePlanForm";

const limitsSchema = planFormZodSchema.shape.featureLimits.shape;

const PlanLimitsFields = ({ form }: { form: PlanFormApi }) => {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-2 text-sm font-medium text-foreground">Feature limits</legend>
      <div className="grid gap-4 sm:grid-cols-3">
        {PLAN_NUMERIC_LIMITS.map(({ key, label, hint }) => (
          <form.Field key={key} name={`featureLimits.${key}` as const} validators={{ onChange: limitsSchema[key] }}>
            {(field) => <AppField field={field} label={label} type="number" description={hint} />}
          </form.Field>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PLAN_FEATURE_TOGGLES.map(({ key, label }) => (
          <form.Field key={key} name={`featureLimits.${key}` as const}>
            {(field) => <AppSwitchField field={field} label={label} />}
          </form.Field>
        ))}
      </div>
    </fieldset>
  );
};

export default PlanLimitsFields;
