"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { CouponFormInput } from "@/app/admin/(dashboard)/coupons/_actions";
import type { Coupon, DiscountType, SubscriptionPlanOption } from "@/lib/api";
import { t } from "@/lib/i18n/t";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface CouponFormModalProps {
  open: boolean;
  onClose: () => void;
  plans: SubscriptionPlanOption[];
  editingCoupon: Coupon | null;
  isSubmitting: boolean;
  onSubmit: (values: CouponFormInput) => void;
}

export function CouponFormModal({ open, onClose, plans, editingCoupon, isSubmitting, onSubmit }: CouponFormModalProps) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState(10);
  const [maxRedemptions, setMaxRedemptions] = useState<string>("");
  const [validFrom, setValidFrom] = useState(toDateInputValue(new Date()));
  const [validUntil, setValidUntil] = useState(toDateInputValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  const [applicablePlans, setApplicablePlans] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (editingCoupon) {
      setCode(editingCoupon.code);
      setDiscountType(editingCoupon.discountType);
      setDiscountValue(Number(editingCoupon.discountValue));
      setMaxRedemptions(editingCoupon.maxRedemptions !== null ? String(editingCoupon.maxRedemptions) : "");
      setValidFrom(toDateInputValue(new Date(editingCoupon.validFrom)));
      setValidUntil(toDateInputValue(new Date(editingCoupon.validUntil)));
      setApplicablePlans(editingCoupon.applicablePlans);
      setIsActive(editingCoupon.isActive);
    } else {
      setCode("");
      setDiscountType("PERCENTAGE");
      setDiscountValue(10);
      setMaxRedemptions("");
      setValidFrom(toDateInputValue(new Date()));
      setValidUntil(toDateInputValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
      setApplicablePlans([]);
      setIsActive(true);
    }
  }, [open, editingCoupon]);

  function togglePlan(planId: string) {
    setApplicablePlans((prev) => (prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]));
  }

  const isValid = code.trim().length > 0 && discountValue > 0 && validUntil > validFrom;

  return (
    <Modal open={open} onClose={onClose} title={editingCoupon ? t("Edit Coupon") : t("Create Coupon")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Code")}</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="WELCOME20"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm uppercase outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Discount Type")}</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
            >
              <option value="PERCENTAGE">{t("Percentage")}</option>
              <option value="FIXED_AMOUNT">{t("Fixed Amount (BDT)")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Value")}</label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Valid From")}</label>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Valid Until")}</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Max Redemptions")} <span className="text-neutral-400">({t("optional, blank = unlimited")})</span>
          </label>
          <input
            type="number"
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-700">
            {t("Applicable Plans")} <span className="text-neutral-400">({t("none selected = all plans")})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => togglePlan(plan.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  applicablePlans.includes(plan.id)
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                    : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                }`}
              >
                {plan.name}
              </button>
            ))}
          </div>
        </div>

        {editingCoupon && (
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-brand-primary focus:ring-brand-primary/20"
            />
            {t("Active (unchecking disables this coupon)")}
          </label>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isSubmitting}
          onClick={() =>
            onSubmit({
              code,
              discountType,
              discountValue,
              maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
              validFrom: new Date(validFrom).toISOString(),
              validUntil: new Date(validUntil).toISOString(),
              applicablePlans,
              isActive: editingCoupon ? isActive : undefined,
            })
          }
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingCoupon ? t("Save Changes") : t("Create Coupon")}
        </button>
      </div>
    </Modal>
  );
}
