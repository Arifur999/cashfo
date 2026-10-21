"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { RadioGroup } from "radix-ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ANNOUNCEMENT_TYPES, type AnnouncementType } from "@/types/announcement.types";
import { ANNOUNCEMENT_TYPE_META, ICON_TILE } from "./announcementOptions";

const isAnnouncementType = (value: string): value is AnnouncementType => (ANNOUNCEMENT_TYPES as readonly string[]).includes(value);

// The four kinds of banner as a row of cards, as the design's drawer opens.
// A radio group: one tab stop, the arrow keys move the choice.
const AnnouncementTypeField = ({ field }: { field: AnyFieldApi }) => {
  const value = field.state.value as AnnouncementType;
  const { translate } = useLocale();

  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(next) => {
        if (!isAnnouncementType(next)) return;
        field.handleChange(next);
        field.handleBlur();
      }}
      aria-label={translate("Type")}
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {ANNOUNCEMENT_TYPES.map((type) => {
        const { label, icon: Icon, tone } = ANNOUNCEMENT_TYPE_META[type];
        return (
          <RadioGroup.Item
            key={type}
            value={type}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border px-2 py-3 text-small font-semibold transition-colors",
              "border-line bg-surface text-ink-2 data-[state=checked]:border-emerald data-[state=checked]:bg-mint-50 data-[state=checked]:text-ink data-[state=unchecked]:hover:bg-hover",
            )}
          >
            <span className={cn("flex size-7 items-center justify-center rounded-full", ICON_TILE[tone])}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            {translate(label)}
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
};

export default AnnouncementTypeField;
