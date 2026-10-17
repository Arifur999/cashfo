"use client";

import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { BADGE_TONE_CLASSES, getStatusTone, humanizeEnum, type BadgeTone } from "@/lib/statusBadge";
import { cn } from "@/lib/utils";
import { asStatus } from "@/lib/i18n/message";

interface StatusBadgeCellProps {
  status: string;
  // Overrides for the rare value that needs a different colour or wording.
  tone?: BadgeTone;
  label?: string;
  // The design's status chip carries a dot before the word.
  dot?: boolean;
  className?: string;
}

// Every enum badge in the panel. Colour comes from lib/statusBadge.ts, so a
// new status is a one-line change there, not a new component.
const StatusBadgeCell = ({ status, tone, label, dot = false, className }: StatusBadgeCellProps) => {
  const { translate } = useLocale();
  return (
    <Badge className={cn("gap-1 rounded-full border-transparent px-2 text-caption font-semibold", BADGE_TONE_CLASSES[tone ?? getStatusTone(status)], className)}>
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {translate(asStatus(label ?? humanizeEnum(status)))}
    </Badge>
  );
};

export default StatusBadgeCell;
