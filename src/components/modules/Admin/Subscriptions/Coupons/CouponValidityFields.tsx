"use client";

import AppField from "@/components/shared/form/AppField";
import { firstZodError } from "@/lib/formValidators";
import { couponFormZodSchema as schema, getValidityError } from "@/zod/coupon.validation";
import type { CouponFormApi } from "./useCouponForm";

// When the coupon runs, and how many times it may be used.
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
          {(field) => <AppField field={field} label="Ends" type="date" description="Through the end of that day." />}
        </form.Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.Field name="maxRedemptions" validators={{ onChange: schema.shape.maxRedemptions }}>
          {(field) => <AppField field={field} label="Most uses" inputMode="numeric" placeholder="No limit" description="Blank means no limit." />}
        </form.Field>
      </div>
    </>
  );
};

export default CouponValidityFields;
