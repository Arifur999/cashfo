"use client";

import { CalendarDays } from "lucide-react";
import { useRef } from "react";
import { formDayLabel, getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import InputFrame, { type INPUT_HEIGHTS } from "./InputFrame";

interface DayInputProps {
  id?: string;
  // "YYYY-MM-DD", as a date input takes it; "" shows the placeholder.
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  size?: keyof typeof INPUT_HEIGHTS;
  // With the Field's error: the border turns red and the error is read out
  // with the field (its `${id}-error`).
  invalid?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  // The line that explains the day, read out with the field (a Field's
  // `${id}-hint`).
  "aria-describedby"?: string;
  // In place of the calendar (a reminder's bell).
  icon?: React.ReactNode;
  className?: string;
}

// A form's day field: the day in words, in the reader's language, beside a
// calendar icon, and a click opens the browser's own date picker. The date
// input underneath keeps the value, the limits and keyboard entry (it takes
// focus from the label and the Tab key), so it carries the field's name and
// description too.
const DayInput = ({ id, value, onChange, min, max, size = "md", invalid = false, placeholder = "", icon, className, ...props }: DayInputProps) => {
  const { t, fmt } = useLocale();
  const picker = useRef<HTMLInputElement>(null);
  const label = formDayLabel(value, getAppToday(), t("Today"), fmt);
  const describedBy = [invalid && id ? `${id}-error` : undefined, props["aria-describedby"]].filter(Boolean).join(" ") || undefined;

  function open() {
    try {
      picker.current?.showPicker();
    } catch {
      // An older browser without showPicker: the focused input still takes typing.
      picker.current?.focus();
    }
  }

  return (
    <InputFrame size={size} invalid={invalid} onClick={open} className={cn("relative cursor-pointer px-3", className)}>
      {icon ?? <CalendarDays className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />}
      <span className={cn("min-w-0 flex-1 truncate", !label && "text-ink-faint")}>{label || placeholder}</span>
      <input
        ref={picker}
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        aria-label={props["aria-label"]}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        className="sr-only"
      />
    </InputFrame>
  );
};

export default DayInput;
