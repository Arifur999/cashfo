"use client";

import { CalendarDays } from "lucide-react";
import { useRef } from "react";
import { cleanDayText, dayText, parseDayText } from "@/lib/customer/dayText";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface DayTextFieldProps {
  id: string;
  // What the box holds, as typed ("28/10/2026").
  text: string;
  onTextChange: (text: string) => void;
  invalid?: boolean;
  describedBy?: string;
}

// The transaction popup's Date (design: TxnDrawer): the day typed as
// DD/MM/YYYY, with a calendar button at the end that opens the browser's
// own picker and writes its pick into the box.
export function DayTextField({ id, text, onTextChange, invalid = false, describedBy }: DayTextFieldProps) {
  const { t } = useLocale();
  const picker = useRef<HTMLInputElement>(null);

  function openPicker() {
    try {
      picker.current?.showPicker();
    } catch {
      // An older browser without showPicker: the box still takes typing.
      document.getElementById(id)?.focus();
    }
  }

  return (
    <div
      className={cn(
        "relative flex h-12 items-center rounded-field border bg-surface transition-[border-color,box-shadow] focus-within:border-focus-ring focus-within:focus-halo",
        invalid ? "border-expense-fill" : "border-input",
      )}
    >
      <input
        id={id}
        type="text"
        inputMode="numeric"
        maxLength={10}
        autoComplete="off"
        placeholder="DD/MM/YYYY"
        value={text}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onTextChange(cleanDayText(event.target.value))}
        className="h-full min-w-0 flex-1 rounded-field bg-transparent px-3 text-body text-ink tabular-nums outline-none placeholder:text-ink-faint max-md:text-body-lg"
      />
      <button type="button" onClick={openPicker} aria-label={t("Open calendar")} title={t("Open calendar")} className="mr-0.75 flex size-10 shrink-0 items-center justify-center rounded-sm text-ink-soft hover:bg-surface-sunken">
        <CalendarDays className="size-4.25" aria-hidden="true" />
      </button>
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={parseDayText(text)}
        onChange={(event) => event.target.value && onTextChange(dayText(event.target.value))}
        className="pointer-events-none absolute right-0.75 bottom-0.75 size-10 opacity-0"
      />
    </div>
  );
}
