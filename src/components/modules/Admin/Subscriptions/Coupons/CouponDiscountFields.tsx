"use client";

import AppField from "@/components/shared/form/AppField";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { firstZodError } from "@/lib/formValidators";
import { randomCouponCode } from "@/lib/subscriptions";
import type { DiscountType } from "@/types/coupon.types";
import { couponFormZodSchema as schema, getPercentageError } from "@/zod/coupon.validation";
import type { CouponFormApi } from "./useCouponForm";
import T from "@/components/shared/T";

const DISCOUNT_TYPE_OPTIONS: { value: DiscountType; label: string }[] = [
  { value: "PERCENTAGE", label: "Percent" },
  { value: "FIXED_AMOUNT", label: "Fixed amount" },
];

// The code, with a link that makes one up, then the discount: a percent /
// fixed switch beside the number, as the design's drawer draws them.
const CouponDiscountFields = ({ form }: { form: CouponFormApi }) => {
  return (
    <>
      <form.Field name="code" validators={{ onChange: schema.shape.code }}>
        {(field) => (
          <AppField
            field={field}
            label="Code"
            placeholder="PUJA15"
            className="font-mono font-bold tracking-wider uppercase"
            autoComplete="off"
            description="Letters and numbers, no spaces. People type it at checkout."
            aside={
              <button type="button" className="text-small font-semibold text-emerald hover:underline" onClick={() => field.handleChange(randomCouponCode())}>
                <T>Make one up</T>
              </button>
            }
          />
        )}
      </form.Field>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-end">
        <form.Field name="discountType">
          {(field) => (
            <div className="flex flex-col gap-2">
              <span className="text-small font-semibold text-ink-2"><T>Discount</T></span>
              <SegmentedControl
                label="Discount type"
                variant="tabs"
                size="lg"
                stretch
                options={DISCOUNT_TYPE_OPTIONS}
                value={field.state.value as DiscountType}
                onChange={(value) => field.handleChange(value)}
              />
            </div>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.discountType}>
          {(discountType) => (
            <form.Field
              name="discountValue"
              validators={{
                // Re-checked when the type changes: 150 is fine as taka, not as %.
                onChangeListenTo: ["discountType"],
                onChange: ({ value, fieldApi }) =>
                  firstZodError(schema.shape.discountValue, value) ?? getPercentageError(fieldApi.form.getFieldValue("discountType"), value),
              }}
            >
              {(field) => (
                <AppField
                  field={field}
                  label={<span className="sr-only"><T>{discountType === "PERCENTAGE" ? "Percent off" : "Taka off"}</T></span>}
                  inputMode="decimal"
                  prepend={discountType === "FIXED_AMOUNT" ? <span className="text-body text-ink-muted">৳</span> : undefined}
                  append={discountType === "PERCENTAGE" ? <span className="text-body text-ink-muted">%</span> : undefined}
                />
              )}
            </form.Field>
          )}
        </form.Subscribe>
      </div>
    </>
  );
};

export default CouponDiscountFields;
