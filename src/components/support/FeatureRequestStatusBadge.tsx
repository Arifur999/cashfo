import { cn } from "@/lib/utils";
import type { FeatureRequestStatus } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const STYLES: Record<FeatureRequestStatus, string> = {
  SUBMITTED: "bg-neutral-200 text-neutral-600",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  PLANNED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  SHIPPED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
};

const LABELS: Record<FeatureRequestStatus, string> = {
  SUBMITTED: t("Submitted"),
  UNDER_REVIEW: t("Under Review"),
  PLANNED: t("Planned"),
  IN_PROGRESS: t("In Progress"),
  SHIPPED: t("Shipped"),
  DECLINED: t("Declined"),
};

export function FeatureRequestStatusBadge({ status }: { status: FeatureRequestStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
