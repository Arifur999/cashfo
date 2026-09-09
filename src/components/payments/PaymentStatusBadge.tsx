import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const STYLES: Record<PaymentStatus, string> = {
  SUCCESS: "bg-green-100 text-green-700",
  PENDING: "bg-blue-100 text-blue-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-neutral-200 text-neutral-600",
};

const LABELS: Record<PaymentStatus, string> = {
  SUCCESS: t("Success"),
  PENDING: t("Pending"),
  FAILED: t("Failed"),
  REFUNDED: t("Refunded"),
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
