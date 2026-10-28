"use client";

import { WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/customer/habitDisplay";
import { weekdayOrder } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface WeekdayPickerProps {
  // 0 = Sunday ... 6 = Saturday.
  value: number[];
  onChange: (days: number[]) => void;
  // "short" writes "Sa"; "long" writes "Sat".
  labels?: "short" | "long";
  className?: string;
}

// The seven days from the reader's first day (Saturday unless they chose
// another in Settings), each one a toggle.
const WeekdayPicker = ({ value, onChange, labels = "short", className }: WeekdayPickerProps) => {
  const { t, fmt } = useLocale();
  const toggle = (day: number) => onChange(value.includes(day) ? value.filter((each) => each !== day) : [...value, day]);
  return (
    <span role="group" aria-label={t("Days")} className={cn("flex gap-2", className)}>
      {weekdayOrder(fmt).map((day) => {
        const picked = value.includes(day);
        const word = t(WEEKDAY_SHORT[day]);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={picked}
            title={t(WEEKDAY_LONG[day])}
            onClick={() => toggle(day)}
            className={cn("flex items-center justify-center font-semibold transition-colors", labels === "short" ? "h-8 w-9 rounded-sm text-small" : "h-8.5 w-9.5 rounded-md text-small", picked ? "bg-emerald text-white" : "border border-line bg-surface text-ink-2 hover:border-line-strong")}
          >
            {labels === "short" ? word.slice(0, 2) : word}
          </button>
        );
      })}
    </span>
  );
};

export default WeekdayPicker;
