import { cn } from "@/lib/utils";
import type { FlagStatus } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const STYLES: Record<FlagStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  REVIEWING: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  FALSE_POSITIVE: "bg-neutral-200 text-neutral-600",
};

const LABELS: Record<FlagStatus, string> = {
  OPEN: t("Open"),
  REVIEWING: t("Reviewing"),
  RESOLVED: t("Resolved"),
  FALSE_POSITIVE: t("False Positive"),
};

export function FlagStatusBadge({ status }: { status: FlagStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
