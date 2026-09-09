import { cn } from "@/lib/utils";
import type { PlatformUserStatus } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const STYLES: Record<PlatformUserStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  BANNED: "bg-red-100 text-red-700",
  PENDING_DELETION: "bg-neutral-200 text-neutral-600",
};

const LABELS: Record<PlatformUserStatus, string> = {
  ACTIVE: t("Active"),
  SUSPENDED: t("Suspended"),
  BANNED: t("Banned"),
  PENDING_DELETION: t("Pending Deletion"),
};

export function StatusBadge({ status }: { status: PlatformUserStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
