import { cn } from "@/lib/utils";
import type { OwnerStatus } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const STYLES: Record<OwnerStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  DELETED: "bg-neutral-200 text-neutral-600",
};

const LABELS: Record<OwnerStatus, string> = {
  ACTIVE: t("Active"),
  SUSPENDED: t("Suspended"),
  DELETED: t("Deleted"),
};

export function StatusBadge({ status }: { status: OwnerStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
