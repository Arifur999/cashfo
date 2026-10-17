"use client";

import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppChipsField from "@/components/shared/form/AppChipsField";
import AppForm from "@/components/shared/form/AppForm";
import AppSwitchField from "@/components/shared/form/AppSwitchField";
import type { ICoupon } from "@/types/coupon.types";
import type { ISubscriptionPlan } from "@/types/plan.types";
import type { ICouponFormValues } from "@/zod/coupon.validation";
import CouponDiscountFields from "./CouponDiscountFields";
import CouponPreview from "./CouponPreview";
import CouponValidityFields from "./CouponValidityFields";
import { useCouponForm } from "./useCouponForm";

interface CouponFormProps {
  // Omit to create a coupon.
  coupon?: ICoupon;
  defaultValues: ICouponFormValues;
  plans: ISubscriptionPlan[];
  onDone: () => void;
}

// The design's coupon drawer: code, discount, the plans it works on, when
// it runs, how many uses, and what each plan would cost with it.
const CouponForm = ({ coupon, defaultValues, plans, onDone }: CouponFormProps) => {
  const { form, isPending } = useCouponForm(coupon, defaultValues, onDone);
  // A coupon on the free plan takes money off nothing.
  const paidPlans = plans.filter((plan) => plan.billingCycle !== "FREE");

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-1 flex-col">
      <CouponDiscountFields form={form} />
      <form.Field name="applicablePlans">
        {(field) => (
          <AppChipsField
            field={field}
            label="Works on"
            options={paidPlans.map((plan) => ({ value: plan.id, label: plan.name }))}
            description="Pick none and it works on every plan."
          />
        )}
      </form.Field>
      <CouponValidityFields form={form} />
      <form.Subscribe selector={(state) => [state.values.code, state.values.discountType, state.values.discountValue, state.values.applicablePlans] as const}>
        {([code, discountType, discountValue, applicablePlans]) => (
          <CouponPreview code={code} discountType={discountType} discountValue={discountValue} applicablePlans={applicablePlans} plans={paidPlans} />
        )}
      </form.Subscribe>
      {coupon && (
        <form.Field name="isActive">
          {(field) => <AppSwitchField field={field} label="On" description="Turn off to stop it working without deleting it." />}
        </form.Field>
      )}
      <FormDialogFooter pinned isPending={isPending} submitLabel={coupon ? "Save changes" : "Create coupon"} pendingLabel="Saving..." />
    </AppForm>
  );
};

export default CouponForm;
