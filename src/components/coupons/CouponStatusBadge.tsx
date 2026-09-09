import { cn } from "@/lib/utils";
import type { CouponStatus } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const STYLES: Record<CouponStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRED: "bg-neutral-200 text-neutral-600",
  DISABLED: "bg-red-100 text-red-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
};

const LABELS: Record<CouponStatus, string> = {
  ACTIVE: t("Active"),
  EXPIRED: t("Expired"),
  DISABLED: t("Disabled"),
  SCHEDULED: t("Scheduled"),
};

export function CouponStatusBadge({ status }: { status: CouponStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
