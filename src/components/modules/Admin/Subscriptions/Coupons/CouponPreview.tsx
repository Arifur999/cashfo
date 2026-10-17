import { discountedPrice, money } from "@/lib/subscriptions";
import type { DiscountType } from "@/types/coupon.types";
import type { ISubscriptionPlan } from "@/types/plan.types";

interface CouponPreviewProps {
  code: string;
  discountType: DiscountType;
  discountValue: string;
  // The plan ids it works on; none means every paid plan.
  applicablePlans: string[];
  plans: ISubscriptionPlan[];
}

// "With PUJA15: Monthly Pro ৳ 299 → ৳ 254.15": what each plan would cost,
// worked out as the admin types.
const CouponPreview = ({ code, discountType, discountValue, applicablePlans, plans }: CouponPreviewProps) => {
  const value = Number(discountValue);
  const rows = plans.filter((plan) => plan.billingCycle !== "FREE" && (applicablePlans.length === 0 || applicablePlans.includes(plan.id)));
  if (!Number.isFinite(value) || value <= 0 || rows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-mint-200 bg-mint-50 px-4 py-3" aria-live="polite">
      <span className="text-caption font-semibold text-emerald">With {code.trim().toUpperCase() || "this coupon"}</span>
      {rows.map((plan) => (
        <span key={plan.id} className="flex justify-between gap-3 text-body text-ink">
          <span>{plan.name}</span>
          <span>
            <s className="text-ink-muted">{money(plan.price, plan.currency)}</s> <b className="font-semibold">{money(discountedPrice(Number(plan.price), { discountType, discountValue }), plan.currency)}</b>
          </span>
        </span>
      ))}
    </div>
  );
};

export default CouponPreview;
