import { cn } from "@/lib/utils";
import type { BackupRecordStatus } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const STYLES: Record<BackupRecordStatus, string> = {
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

const LABELS: Record<BackupRecordStatus, string> = {
  IN_PROGRESS: t("In Progress"),
  SUCCESS: t("Success"),
  FAILED: t("Failed"),
};

export function BackupStatusBadge({ status }: { status: BackupRecordStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
