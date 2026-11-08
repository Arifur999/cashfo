"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { RadioGroup } from "radix-ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ANNOUNCEMENT_TYPES, type AnnouncementType } from "@/types/announcement.types";
import { ANNOUNCEMENT_TYPE_META } from "./announcementOptions";

const isAnnouncementType = (value: string): value is AnnouncementType => (ANNOUNCEMENT_TYPES as readonly string[]).includes(value);

// The four kinds as the v16 board's row of pills: each one's icon in its
// colour beside the word; the chosen one edged in emerald on mint.
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
              "flex h-10.5 items-center justify-center gap-1.75 rounded-xl border px-2 text-[13px] leading-[normal] font-semibold transition-colors pointer-coarse:h-11",
              "border-line bg-surface text-ink-2 data-[state=checked]:border-[1.5px] data-[state=checked]:border-emerald data-[state=checked]:bg-emerald-soft data-[state=checked]:text-brand-ink data-[state=unchecked]:hover:bg-hover",
            )}
          >
            <Icon className={cn("size-4 shrink-0", iconTone)} aria-hidden="true" />
            {translate(label)}
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
};

export default AnnouncementTypeField;
