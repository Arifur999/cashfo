import { cn } from "@/lib/utils";
import type { TicketPriority } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const STYLES: Record<TicketPriority, string> = {
  LOW: "bg-neutral-200 text-neutral-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const LABELS: Record<TicketPriority, string> = {
  LOW: t("Low"),
  MEDIUM: t("Medium"),
  HIGH: t("High"),
  URGENT: t("Urgent"),
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[priority])}>
      {LABELS[priority]}
    </span>
  );
}
