"use client";

import { discountedPrice, money } from "@/lib/subscriptions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { DiscountType } from "@/types/coupon.types";
import type { ISubscriptionPlan } from "@/types/plan.types";
import T from "@/components/shared/T";

interface CouponPreviewProps {
  code: string;
  discountType: DiscountType;
  discountValue: string;
  // The plan ids it works on; none means every paid plan.
  applicablePlans: string[];
  plans: ISubscriptionPlan[];
}

// "With PUJA15: Monthly Pro ৳ 299 → ৳ 254.15": what each plan would cost,
// worked out as the admin types. Not a live region: it would read every
// price out again on each letter typed into the code.
const CouponPreview = ({ code, discountType, discountValue, applicablePlans, plans }: CouponPreviewProps) => {
  const { locale } = useLocale();
  const value = Number(discountValue);
  const rows = plans.filter((plan) => plan.billingCycle !== "FREE" && (applicablePlans.length === 0 || applicablePlans.includes(plan.id)));
  if (!Number.isFinite(value) || value <= 0 || rows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-mint-200 bg-mint-50 px-4 py-3">
      <span className="text-caption font-semibold text-emerald">
        <T values={{ code: code.trim().toUpperCase() || <T>this coupon</T> }}>{"With {code}"}</T>
      </span>
      {rows.map((plan) => (
        <span key={plan.id} className="flex justify-between gap-3 text-body text-ink">
          <span>{plan.name}</span>
          <span>
            <s className="text-ink-muted">{money(plan.price, plan.currency, locale)}</s> <b className="font-semibold">{money(discountedPrice(Number(plan.price), { discountType, discountValue }), plan.currency, locale)}</b>
          </span>
        </span>
      ))}
    </div>
  );
};

export default CouponPreview;
