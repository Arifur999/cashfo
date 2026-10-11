"use client";

import AppField from "@/components/shared/form/AppField";
import { firstZodError } from "@/lib/formValidators";
import { couponFormZodSchema as schema, getValidityError } from "@/zod/coupon.validation";
import type { CouponFormApi } from "./useCouponForm";

const CouponValidityFields = ({ form }: { form: CouponFormApi }) => {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="validFrom" validators={{ onChange: schema.shape.validFrom }}>
          {(field) => <AppField field={field} label="Valid from" type="date" />}
        </form.Field>
        <form.Field
          name="validUntil"
          validators={{
            onChangeListenTo: ["validFrom"],
            onChange: ({ value, fieldApi }) =>
              firstZodError(schema.shape.validUntil, value) ?? getValidityError(fieldApi.form.getFieldValue("validFrom"), value),
          }}
        >
          {(field) => <AppField field={field} label="Valid until" type="date" description="Inclusive, through the end of that day." />}
        </form.Field>
      </div>
      <form.Field name="maxRedemptions" validators={{ onChange: schema.shape.maxRedemptions }}>
        {(field) => <AppField field={field} label="Max redemptions" type="number" description="Leave blank for unlimited." />}
      </form.Field>
    </div>
  );
};

export default CouponValidityFields;
