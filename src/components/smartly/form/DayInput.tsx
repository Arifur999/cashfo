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
  invalid?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
}

// A form's day field: the day in words beside a calendar icon, and a click
// opens the browser's own date picker. The date input underneath keeps the
// value, the limits and keyboard entry (it takes focus from the label and
// the Tab key).
const DayInput = ({ id, value, onChange, min, max, size = "md", invalid = false, placeholder = "", className, ...props }: DayInputProps) => {
  const { t } = useLocale();
  const picker = useRef<HTMLInputElement>(null);
  const label = formDayLabel(value, getAppToday(), t("Today"));

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
      <CalendarDays className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <span className={cn("min-w-0 flex-1 truncate", !label && "text-ink-faint")}>{label || placeholder}</span>
      <input ref={picker} id={id} type="date" value={value} min={min} max={max} aria-label={props["aria-label"]} aria-invalid={invalid || undefined} onChange={(event) => event.target.value && onChange(event.target.value)} className="sr-only" />
    </InputFrame>
  );
};

export default DayInput;
