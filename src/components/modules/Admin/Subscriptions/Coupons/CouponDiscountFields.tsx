"use client";

import AppField from "@/components/shared/form/AppField";
import AppSelectField from "@/components/shared/form/AppSelectField";
import { firstZodError } from "@/lib/formValidators";
import { couponFormZodSchema as schema, getPercentageError } from "@/zod/coupon.validation";
import type { CouponFormApi } from "./useCouponForm";

const DISCOUNT_TYPE_OPTIONS = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "FIXED_AMOUNT", label: "Fixed amount (BDT)" },
];

const CouponDiscountFields = ({ form }: { form: CouponFormApi }) => {
  return (
    <div className="space-y-4">
      <form.Field name="code" validators={{ onChange: schema.shape.code }}>
        {(field) => <AppField field={field} label="Code" placeholder="WELCOME20" className="uppercase" />}
      </form.Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="discountType">
          {(field) => <AppSelectField field={field} label="Discount type" options={DISCOUNT_TYPE_OPTIONS} />}
        </form.Field>
        <form.Field
          name="discountValue"
          validators={{
            // Re-checked when the type changes: 150 is fine as BDT, not as %.
            onChangeListenTo: ["discountType"],
            onChange: ({ value, fieldApi }) =>
              firstZodError(schema.shape.discountValue, value) ?? getPercentageError(fieldApi.form.getFieldValue("discountType"), value),
          }}
        >
          {(field) => <AppField field={field} label="Value" type="number" />}
        </form.Field>
      </div>
    </div>
  );
};

export default CouponDiscountFields;
