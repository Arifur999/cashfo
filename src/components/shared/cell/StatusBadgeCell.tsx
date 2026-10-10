import { Badge } from "@/components/ui/badge";
import { BADGE_TONE_CLASSES, getStatusTone, humanizeEnum, type BadgeTone } from "@/lib/statusBadge";
import { cn } from "@/lib/utils";

interface StatusBadgeCellProps {
  status: string;
  // Overrides for the rare value that needs a different colour or wording.
  tone?: BadgeTone;
  label?: string;
  className?: string;
}

// Every enum badge in the panel. Colour comes from lib/statusBadge.ts, so a
// new status is a one-line change there, not a new component.
const StatusBadgeCell = ({ status, tone, label, className }: StatusBadgeCellProps) => {
  return (
    <Badge className={cn("border-transparent", BADGE_TONE_CLASSES[tone ?? getStatusTone(status)], className)}>
      {label ?? humanizeEnum(status)}
    </Badge>
  );
};

export default StatusBadgeCell;
