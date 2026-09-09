import { cn } from "@/lib/utils";
import type { CampaignStatus } from "@/lib/api";

const STYLES: Record<CampaignStatus, string> = {
  DRAFT: "bg-neutral-200 text-neutral-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  SENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[status])}>
      {status}
    </span>
  );
}
