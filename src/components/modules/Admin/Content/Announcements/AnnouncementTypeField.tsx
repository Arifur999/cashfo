"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { RadioGroup } from "radix-ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ANNOUNCEMENT_TYPES, type AnnouncementType } from "@/types/announcement.types";
import { ANNOUNCEMENT_TYPE_META } from "./announcementOptions";

const isAnnouncementType = (value: string): value is AnnouncementType => (ANNOUNCEMENT_TYPES as readonly string[]).includes(value);

// The four kinds of banner as a row of cards, as the board's drawer opens:
// each one's icon in its colour over the word; the chosen card mint.
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
        const { label, icon: Icon, iconTone } = ANNOUNCEMENT_TYPE_META[type];
        return (
          <RadioGroup.Item
            key={type}
            value={type}
            className={cn(
              "group flex flex-col items-center gap-1.25 rounded-field border px-1.5 py-2.5 text-[12.5px] leading-[normal] font-semibold transition-colors",
              "border-line bg-surface text-ink-2 data-[state=checked]:border-[1.5px] data-[state=checked]:border-emerald data-[state=checked]:bg-mint-50 data-[state=checked]:text-emerald data-[state=unchecked]:hover:bg-hover",
            )}
          >
            <Icon className={cn("size-4.5", iconTone, "group-data-[state=checked]:text-emerald")} aria-hidden="true" />
            {translate(label)}
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
};

export default AnnouncementTypeField;
