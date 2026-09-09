import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  WAITING_ON_USER: "bg-purple-100 text-purple-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-neutral-200 text-neutral-600",
};

const LABELS: Record<TicketStatus, string> = {
  OPEN: t("Open"),
  IN_PROGRESS: t("In Progress"),
  WAITING_ON_USER: t("Waiting on User"),
  RESOLVED: t("Resolved"),
  CLOSED: t("Closed"),
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
