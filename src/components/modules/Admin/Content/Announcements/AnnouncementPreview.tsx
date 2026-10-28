"use client";

import { X } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { AnnouncementType } from "@/types/announcement.types";
import { ANNOUNCEMENT_TYPE_META } from "./announcementOptions";

interface AnnouncementPreviewProps {
  type: AnnouncementType;
  title: string;
  body: string;
  // Which of the two is Bangla (the app falls back to the English for a
  // part with no Bangla), for the typeface and screen readers.
  titleLang?: "bn";
  bodyLang?: "bn";
  // "md" is the live banner on the page, "sm" the drawer's preview.
  size?: "md" | "sm";
  className?: string;
}

// "Title." in bold, then the message.
const withStop = (title: string) => (/[.!?।]$/.test(title.trim()) ? title.trim() : `${title.trim()}.`);

// A banner as the board draws it in the app: the kind's icon and colours,
// the title in bold running into the message, and the close button each
// banner carries (drawn, not working, here).
const AnnouncementPreview = ({ type, title, body, titleLang, bodyLang, size = "md", className }: AnnouncementPreviewProps) => {
  const { translate } = useLocale();
  const { icon: Icon, banner, bannerIcon } = ANNOUNCEMENT_TYPE_META[type];
  const small = size === "sm";

  return (
    // A figure, not a live status: it changes with every keystroke.
    <div
      role="figure"
      aria-label={translate("Banner preview")}
      className={cn("flex items-center border", small ? "gap-2.5 rounded-[14px] px-3 py-2.5 text-[13.5px] leading-[normal]" : "gap-3 rounded-field px-4 py-3 text-body", banner, className)}
    >
      <Icon className={cn("shrink-0", small ? "size-4.25" : "size-4.5", bannerIcon)} aria-hidden="true" />
      <p className="min-w-0 flex-1 wrap-break-word">
        <b lang={titleLang} className={cn("font-bold", titleLang && "font-bn")}>
          {withStop(title || translate("The title"))}
        </b>{" "}
        <span lang={bodyLang} className={cn("whitespace-pre-line", bodyLang && "font-bn")}>
          {body || translate("The message people will read.")}
        </span>
      </p>
      <X className={cn("shrink-0", small ? "size-3.75" : "size-4", bannerIcon)} aria-hidden="true" />
    </div>
  );
};

export default AnnouncementPreview;
