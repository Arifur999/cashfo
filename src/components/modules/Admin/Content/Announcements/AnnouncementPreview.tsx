import { cn } from "@/lib/utils";
import type { AnnouncementType } from "@/types/announcement.types";
import { ANNOUNCEMENT_TYPE_META } from "./announcementOptions";

interface AnnouncementPreviewProps {
  type: AnnouncementType;
  title: string;
  body: string;
  className?: string;
}

// The banner as the app shows it: the kind's icon and colour, the title
// in bold and the message after it.
const AnnouncementPreview = ({ type, title, body, className }: AnnouncementPreviewProps) => {
  const { icon: Icon, banner } = ANNOUNCEMENT_TYPE_META[type];

  return (
    <div aria-label="Banner preview" className={cn("flex items-center gap-3 rounded-md border px-3 py-3", banner, className)}>
      <Icon className="size-4.5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 text-body leading-snug text-ink">
        <b className="font-semibold">{title || "The title"}</b>
        {(body || !title) && <span className="text-ink-2"> · {body || "The message people will read."}</span>}
      </p>
    </div>
  );
};

export default AnnouncementPreview;
