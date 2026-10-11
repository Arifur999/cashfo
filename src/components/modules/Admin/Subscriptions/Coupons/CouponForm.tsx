"use client";

import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppChipsField from "@/components/shared/form/AppChipsField";
import AppForm from "@/components/shared/form/AppForm";
import AppSwitchField from "@/components/shared/form/AppSwitchField";
import type { ICoupon } from "@/types/coupon.types";
import type { IPlanOption } from "@/types/plan.types";
import type { ICouponFormValues } from "@/zod/coupon.validation";
import CouponDiscountFields from "./CouponDiscountFields";
import CouponValidityFields from "./CouponValidityFields";
import { useCouponForm } from "./useCouponForm";

interface CouponFormProps {
  // Omit to create a coupon.
  coupon?: ICoupon;
  defaultValues: ICouponFormValues;
  plans: IPlanOption[];
  onDone: () => void;
}

const CouponForm = ({ coupon, defaultValues, plans, onDone }: CouponFormProps) => {
  const { form, isPending } = useCouponForm(coupon, defaultValues, onDone);

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <CouponDiscountFields form={form} />
      <CouponValidityFields form={form} />
      <form.Field name="applicablePlans">
        {(field) => (
          <AppChipsField
            field={field}
            label="Applicable plans"
            options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
            description="None selected = every plan."
          />
        )}
      </form.Field>
      {coupon && (
        <form.Field name="isActive">
          {(field) => <AppSwitchField field={field} label="Active" description="Turning this off disables the coupon." />}
        </form.Field>
      )}
      <FormDialogFooter isPending={isPending} submitLabel={coupon ? "Save changes" : "Create coupon"} pendingLabel="Saving..." />
    </AppForm>
  );
};

export default CouponForm;
