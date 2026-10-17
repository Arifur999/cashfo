"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import AppSwitchField from "@/components/shared/form/AppSwitchField";
import FormFieldShell from "@/components/shared/form/FormFieldShell";
import Input from "@/components/smartly/form/Input";
import { Checkbox } from "@/components/ui/checkbox";
import { planFormZodSchema } from "@/zod/plan.validation";
import { PLAN_FEATURE_TOGGLES, PLAN_NUMERIC_LIMITS } from "./planFeatures";
import type { PlanFormApi } from "./usePlanForm";
import T from "@/components/shared/T";

const limitsSchema = planFormZodSchema.shape.featureLimits.shape;

// -1 is the API's "no limit".
const NO_LIMIT = "-1";

// One count with its "No limit" box: ticking it stores -1 and greys the
// number out, as the design draws the limits row.
const LimitField = ({ field, label }: { field: AnyFieldApi; label: string }) => {
  const unlimited = field.state.value === NO_LIMIT;
  const checkboxId = `${field.name}-no-limit`;

  return (
    <FormFieldShell field={field} label={label}>
      {(control, hasError) => (
        <div className="flex flex-col gap-2">
          <Input
            {...control}
            name={field.name}
            size="sm"
            inputMode="numeric"
            invalid={hasError}
            value={unlimited ? "" : (field.state.value ?? "")}
            placeholder={unlimited ? "—" : undefined}
            disabled={unlimited}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            frameClassName={unlimited ? "bg-surface-sunken" : undefined}
          />
          <label htmlFor={checkboxId} className="flex cursor-pointer items-center gap-2 text-small text-ink-2">
            <Checkbox
              id={checkboxId}
              checked={unlimited}
              onCheckedChange={(checked) => field.handleChange(checked === true ? NO_LIMIT : "0")}
              className="rounded-[4px] border-line-strong data-checked:border-emerald data-checked:bg-emerald"
            />
            <T>No limit</T>
          </label>
        </div>
      )}
    </FormFieldShell>
  );
};

// The three counts, then what is included, as the design's drawer draws
// them.
const PlanLimitsFields = ({ form }: { form: PlanFormApi }) => {
  return (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-body font-semibold text-ink"><T>Limits</T></legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {PLAN_NUMERIC_LIMITS.map(({ key, label }) => (
            <form.Field key={key} name={`featureLimits.${key}` as const} validators={{ onChange: limitsSchema[key] }}>
              {(field) => <LimitField field={field} label={label} />}
            </form.Field>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-body font-semibold text-ink"><T>What&apos;s included</T></legend>
        {PLAN_FEATURE_TOGGLES.map(({ key, label, hint }) => (
          <form.Field key={key} name={`featureLimits.${key}` as const}>
            {(field) => <AppSwitchField field={field} label={label} description={hint} />}
          </form.Field>
        ))}
      </fieldset>
    </>
  );
};

export default PlanLimitsFields;
