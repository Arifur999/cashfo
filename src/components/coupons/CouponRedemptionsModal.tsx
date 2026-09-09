"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { getCouponRedemptionsAction } from "@/app/admin/(dashboard)/coupons/_actions";
import type { CouponRedemption } from "@/lib/api";
import { t } from "@/lib/i18n/t";

interface CouponRedemptionsModalProps {
  open: boolean;
  onClose: () => void;
  couponId: string | null;
  couponCode: string;
}

export function CouponRedemptionsModal({ open, onClose, couponId, couponCode }: CouponRedemptionsModalProps) {
  const [redemptions, setRedemptions] = useState<CouponRedemption[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !couponId) return;
    setIsLoading(true);
    setRedemptions(null);
    getCouponRedemptionsAction(couponId)
      .then(setRedemptions)
      .finally(() => setIsLoading(false));
  }, [open, couponId]);

  return (
    <Modal open={open} onClose={onClose} title={`${t("Redemptions")} — ${couponCode}`}>
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {!isLoading && redemptions && redemptions.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-400">{t("No redemptions yet.")}</p>
      )}
      {!isLoading && redemptions && redemptions.length > 0 && (
        <ul className="max-h-80 space-y-3 overflow-y-auto">
          {redemptions.map((r) => (
            <li key={r.id} className="rounded-xl border border-neutral-100 p-3 text-sm">
              <p className="font-medium text-neutral-900">{r.platformUser?.name ?? t("Unknown user")}</p>
              <p className="text-xs text-neutral-500">{r.platformUser?.email}</p>
              <p className="mt-1 text-xs text-neutral-400">
                {t("Plan")}: {r.plan.name} &middot; {new Date(r.redeemedAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
