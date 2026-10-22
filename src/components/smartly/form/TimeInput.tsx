"use client";

import { Clock, X } from "lucide-react";
import { useRef } from "react";
import { timeLabel } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import InputFrame, { type INPUT_HEIGHTS } from "./InputFrame";

interface TimeInputProps {
  id?: string;
  // "HH:MM", or null for no time.
  value: string | null;
  onChange: (value: string | null) => void;
  size?: keyof typeof INPUT_HEIGHTS;
  placeholder?: string;
  className?: string;
}

// A form's time field, the twin of DayInput: "12:30 pm" beside a clock, a
// click opens the browser's own time picker, and a set time can be cleared.
const TimeInput = ({ id, value, onChange, size = "md", placeholder = "", className }: TimeInputProps) => {
  const { t, locale } = useLocale();
  const picker = useRef<HTMLInputElement>(null);

  function open() {
    try {
      picker.current?.showPicker();
    } catch {
      picker.current?.focus();
    }
  }

  return (
    <InputFrame size={size} onClick={open} className={cn("relative cursor-pointer px-3", className)}>
      <Clock className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <span className={cn("min-w-0 flex-1 truncate tabular-nums", !value && "text-ink-faint")}>{value ? timeLabel(value, t, locale) : placeholder}</span>
      {value && (
        <button
          type="button"
          aria-label={t("Clear the time")}
          onClick={(event) => {
            event.stopPropagation();
            onChange(null);
          }}
          className="flex size-6 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
      <input ref={picker} id={id} type="time" value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} className="sr-only" />
    </InputFrame>
  );
};

export default TimeInput;
