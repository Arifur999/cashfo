import { AlertTriangle, Info, Megaphone, Wrench, type LucideIcon } from "lucide-react";
import { BADGE_TONE_CLASSES, getStatusTone } from "@/lib/statusBadge";
import { cn } from "@/lib/utils";
import type { AnnouncementType } from "@/types/announcement.types";

const TYPE_ICONS: Record<AnnouncementType, LucideIcon> = {
  INFO: Info,
  WARNING: AlertTriangle,
  PROMOTION: Megaphone,
  MAINTENANCE: Wrench,
};

interface AnnouncementPreviewProps {
  type: AnnouncementType;
  title: string;
  body: string;
}

// Roughly how the banner reads in the app, so the admin sees the tone and
// length of the message while writing it.
const AnnouncementPreview = ({ type, title, body }: AnnouncementPreviewProps) => {
  const Icon = TYPE_ICONS[type];

  return (
    <div aria-label="Banner preview" className={cn("flex gap-3 rounded-xl px-4 py-3", BADGE_TONE_CLASSES[getStatusTone(type)])}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-0.5 text-sm">
        <p className="font-semibold break-words">{title || "Announcement title"}</p>
        <p className="break-words whitespace-pre-wrap opacity-90">{body || "The message users will see."}</p>
      </div>
    </div>
  );
};

export default AnnouncementPreview;
