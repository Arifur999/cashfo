"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ANNOUNCEMENT_TYPES, type AnnouncementType } from "@/types/announcement.types";
import { ANNOUNCEMENT_TYPE_META } from "./announcementOptions";

// The four kinds of banner as a row of cards, as the design's drawer opens.
const AnnouncementTypeField = ({ field }: { field: AnyFieldApi }) => {
  const value = field.state.value as AnnouncementType;
  const { translate } = useLocale();

  return (
    <div role="radiogroup" aria-label={translate("Type")} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ANNOUNCEMENT_TYPES.map((type) => {
        const { label, icon: Icon, chip } = ANNOUNCEMENT_TYPE_META[type];
        const on = value === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              field.handleChange(type);
              field.handleBlur();
            }}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border px-2 py-3 text-small font-semibold transition-colors",
              on ? "border-emerald bg-mint-50 text-ink" : "border-line bg-surface text-ink-2 hover:bg-cream",
            )}
          >
            <span className={cn("flex size-7 items-center justify-center rounded-full", chip)}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            {translate(label)}
          </button>
        );
      })}
    </div>
  );
};

export default AnnouncementTypeField;
