"use client";

import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createCouponAction,
  deleteCouponAction,
  updateCouponAction,
  type CouponFormInput,
} from "@/app/admin/(dashboard)/coupons/_actions";
import type { Coupon, SubscriptionPlanOption } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { CouponFormModal } from "./CouponFormModal";
import { CouponRedemptionsModal } from "./CouponRedemptionsModal";
import { CouponStatusBadge } from "./CouponStatusBadge";

interface CouponsPageClientProps {
  coupons: Coupon[];
  plans: SubscriptionPlanOption[];
  canManage: boolean;
}

export function CouponsPageClient({ coupons, plans, canManage }: CouponsPageClientProps) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [redemptionsCoupon, setRedemptionsCoupon] = useState<Coupon | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditingCoupon(null);
    setIsFormOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditingCoupon(coupon);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingCoupon(null);
  }

  function handleSubmit(values: CouponFormInput) {
    startTransition(async () => {
      const result = editingCoupon
        ? await updateCouponAction(editingCoupon.id, values)
        : await createCouponAction(values);
      if (result.success) {
        toast.success(editingCoupon ? t("Coupon updated") : t("Coupon created"));
        closeForm();
        router.refresh();
      } else {
        toast.error(result.message ?? (editingCoupon ? t("Failed to update coupon") : t("Failed to create coupon")));
      }
    });
  }

  function handleDelete(coupon: Coupon) {
    if (!window.confirm(t(`Permanently delete "${coupon.code}"? This cannot be undone.`))) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCouponAction(coupon.id);
      if (result.success) {
        toast.success(t("Coupon deleted"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete coupon"));
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("Coupons")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("Discount codes for subscription plans.")}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> {t("Create Coupon")}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Code")}</th>
              <th className="px-4 py-3 font-medium">{t("Discount")}</th>
              <th className="px-4 py-3 font-medium">{t("Valid Until")}</th>
              <th className="px-4 py-3 font-medium">{t("Redeemed")}</th>
              <th className="px-4 py-3 font-medium">{t("Status")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-mono font-medium text-neutral-900">{coupon.code}</td>
                <td className="px-4 py-3 text-neutral-500">
                  {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : `${coupon.discountValue} BDT`}
                </td>
                <td className="px-4 py-3 text-neutral-500">{new Date(coupon.validUntil).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-neutral-500">
                  {coupon.timesRedeemed} / {coupon.maxRedemptions ?? "∞"}
                </td>
                <td className="px-4 py-3">
                  <CouponStatusBadge status={coupon.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setRedemptionsCoupon(coupon)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
                    >
                      <Eye className="h-3.5 w-3.5" /> {t("View redemptions")}
                    </button>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(coupon)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
                        >
                          <Pencil className="h-3.5 w-3.5" /> {t("Edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(coupon)}
                          title={t("Only allowed if this coupon has never been redeemed")}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-brand-danger hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t("Delete")}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                  {t("No coupons yet.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CouponFormModal
        open={isFormOpen}
        onClose={closeForm}
        plans={plans}
        editingCoupon={editingCoupon}
        isSubmitting={isPending}
        onSubmit={handleSubmit}
      />
      <CouponRedemptionsModal
        open={redemptionsCoupon !== null}
        onClose={() => setRedemptionsCoupon(null)}
        couponId={redemptionsCoupon?.id ?? null}
        couponCode={redemptionsCoupon?.code ?? ""}
      />
    </div>
  );
}
