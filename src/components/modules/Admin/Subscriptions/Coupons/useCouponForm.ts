"use client";

import { useForm } from "@tanstack/react-form";
import { createCouponAction, updateCouponAction } from "@/app/(dashboardLayout)/admin/coupons/_action";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { ICoupon } from "@/types/coupon.types";
import type { ICouponFormValues } from "@/zod/coupon.validation";

// Create when `coupon` is undefined, edit otherwise.
export const useCouponForm = (coupon: ICoupon | undefined, defaultValues: ICouponFormValues, onDone: () => void) => {
  const { run, isPending } = useActionMutation({
    action: (values: ICouponFormValues) => (coupon ? updateCouponAction(coupon.id, values) : createCouponAction(values)),
    successMessage: coupon ? "Coupon updated" : "Coupon created",
    invalidateKeys: [queryKeys.coupons.all],
  });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  return { form, isPending };
};

export type CouponFormApi = ReturnType<typeof useCouponForm>["form"];
