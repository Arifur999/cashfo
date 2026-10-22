"use client";

import { X } from "lucide-react";
import Banner from "@/components/smartly/Banner";
import { cn } from "@/lib/utils";
import type { AnnouncementType } from "@/types/announcement.types";
import { ANNOUNCEMENT_TYPE_META, bannerTone } from "./announcementOptions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AnnouncementPreviewProps {
  type: AnnouncementType;
  title: string;
  body: string;
  // Which of the two is Bangla (the app falls back to the English for a
  // part with no Bangla), for the typeface and screen readers.
  titleLang?: "bn";
  bodyLang?: "bn";
  className?: string;
}

// The banner as the app shows it (Customer/Layout/AnnouncementBanner.tsx):
// the kind's icon and colour, the title on its own line over the message,
// and the close button each banner carries (drawn, not working, here).
const AnnouncementPreview = ({ type, title, body, titleLang, bodyLang, className }: AnnouncementPreviewProps) => {
  const { translate } = useLocale();
  const { icon: Icon } = ANNOUNCEMENT_TYPE_META[type];

  return (
    // A figure, not the Banner's live status: it changes with every keystroke.
    <Banner tone={bannerTone(type)} inline icon={<Icon />} role="figure" aria-label={translate("Banner preview")} className={className}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 wrap-break-word">
          <p lang={titleLang} className={cn("font-semibold", titleLang && "font-bn")}>
            {title || translate("The title")}
          </p>
          <p lang={bodyLang} className={cn("mt-0.5 font-normal whitespace-pre-line opacity-90", bodyLang && "font-bn")}>
            {body || translate("The message people will read.")}
          </p>
        </div>
        <X className="mt-0.5 size-4 shrink-0 opacity-70" aria-hidden="true" />
      </div>
    </Banner>
  );
};

export default AnnouncementPreview;
