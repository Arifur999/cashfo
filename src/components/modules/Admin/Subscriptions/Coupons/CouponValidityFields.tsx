"use client";

import AppField from "@/components/shared/form/AppField";
import T from "@/components/shared/T";
import { Checkbox } from "@/components/ui/checkbox";
import { firstZodError } from "@/lib/formValidators";
import { couponFormZodSchema as schema, getValidityError } from "@/zod/coupon.validation";
import type { CouponFormApi } from "./useCouponForm";

// When the coupon runs, how many times it may be used, and whether each
// person may use it only once.
const CouponValidityFields = ({ form }: { form: CouponFormApi }) => {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.Field name="validFrom" validators={{ onChange: schema.shape.validFrom }}>
          {(field) => <AppField field={field} label="Starts" type="date" />}
        </form.Field>
        <form.Field
          name="validUntil"
          validators={{
            onChangeListenTo: ["validFrom"],
            onChange: ({ value, fieldApi }) =>
              firstZodError(schema.shape.validUntil, value) ?? getValidityError(fieldApi.form.getFieldValue("validFrom"), value),
          }}
        >
          {(field) => <AppField field={field} label="Ends" type="date" />}
        </form.Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.Field name="maxRedemptions" validators={{ onChange: schema.shape.maxRedemptions }}>
          {(field) => <AppField field={field} label="Most uses" inputMode="numeric" placeholder="No limit" />}
        </form.Field>
        {/* Beside the box, level with it, as the board draws it. */}
        <form.Field name="oncePerPerson">
          {(field) => (
            <label className="flex h-11 cursor-pointer items-center gap-2.5 self-start text-body text-ink-2 sm:mt-7">
              <Checkbox
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked === true)}
                className="size-4.5 rounded-[5px] border-line-strong data-checked:border-emerald data-checked:bg-emerald"
              />
              <T>Once per person</T>
            </label>
          )}
        </form.Field>
      </div>
    </>
  );
};

export default CouponValidityFields;
