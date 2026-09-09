import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/api";

// Same severity -> color mapping as the Prompt 8 Suspicious Activity flag
// cards (there used as a left border, here as a badge fill) for consistency.
const STYLES: Record<Severity, string> = {
  LOW: "bg-neutral-100 text-neutral-600",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[severity])}>
      {severity}
    </span>
  );
}
