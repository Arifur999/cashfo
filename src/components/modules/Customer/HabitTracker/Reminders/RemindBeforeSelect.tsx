"use client";

import NativeSelect from "@/components/smartly/form/NativeSelect";
import { MINUTES_BEFORE_CHOICES, minutesBeforeLabel } from "@/lib/customer/reminderDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface RemindBeforeSelectProps {
  id?: string;
  // Minutes before the to-do's due time (0 = at the time); null = no reminder.
  value: number | null;
  onChange: (value: number | null) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

const OFF = "off";

// A to-do's "Remind me": Off, At the time, or 5-60 minutes before its due
// time. Shown only while the task has a time; sent as `remindBefore`.
export function RemindBeforeSelect({ id, value, onChange, size = "md", disabled, className }: RemindBeforeSelectProps) {
  const { t, fmt } = useLocale();
  const choices: number[] = value === null || (MINUTES_BEFORE_CHOICES as readonly number[]).includes(value) ? [...MINUTES_BEFORE_CHOICES] : [...MINUTES_BEFORE_CHOICES, value].sort((a, b) => a - b);
  return (
    <NativeSelect
      id={id}
      size={size}
      aria-label={id ? undefined : t("Remind me")}
      value={value === null ? OFF : String(value)}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value === OFF ? null : Number(event.target.value))}
      frameClassName={className}
    >
      <option value={OFF}>{t("Off@@reminder")}</option>
      {choices.map((minutes) => (
        <option key={minutes} value={minutes}>
          {minutesBeforeLabel(minutes, t, fmt)}
        </option>
      ))}
    </NativeSelect>
  );
}
