import { cn } from "@/lib/utils";
import type { NotificationLogStatus } from "@/lib/api";

const STYLES: Record<NotificationLogStatus, string> = {
  QUEUED: "bg-blue-100 text-blue-700",
  SENT: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export function NotificationLogStatusBadge({ status }: { status: NotificationLogStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[status])}>
      {status}
    </span>
  );
}
