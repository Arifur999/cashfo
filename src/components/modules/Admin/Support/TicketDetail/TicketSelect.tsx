"use client";

import { useId } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface TicketSelectOption<TValue extends string> {
  value: TValue;
  label: string;
  // A colour dot before the words (status, priority).
  dot?: string;
  // The label is a name (an admin's), shown as it is.
  raw?: boolean;
}

interface TicketSelectProps<TValue extends string> {
  label: string;
  value: TValue;
  options: readonly TicketSelectOption<TValue>[];
  onValueChange: (value: TValue) => void;
  disabled?: boolean;
}

// One of the ticket's settings as the board draws it: a 12px label over a
// 38px field with the value's dot, applied as soon as it is picked.
const TicketSelect = <TValue extends string>({ label, value, options, onValueChange, disabled }: TicketSelectProps<TValue>) => {
  const id = useId();
  const { translate } = useLocale();
  const text = (option: TicketSelectOption<TValue>) => (option.raw ? option.label : translate(option.label));

  return (
    <div className="flex flex-col gap-1.25">
      <label htmlFor={id} className="text-caption font-semibold text-ink-muted">
        {translate(label)}
      </label>
      <Select value={value} onValueChange={(next) => onValueChange(next as TValue)} disabled={disabled}>
        <SelectTrigger
          id={id}
          className="h-9.5! w-full rounded-field border-input bg-surface px-2.5 text-[13.5px] leading-[normal] font-medium text-ink hover:bg-surface focus-visible:border-focus-ring focus-visible:ring-0 focus-visible:focus-halo pointer-coarse:h-11! dark:bg-surface"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                {option.dot && <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", option.dot)} />}
                {text(option)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TicketSelect;
