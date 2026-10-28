"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface SelectControlProps<TValue extends string> {
  value: TValue;
  onValueChange: (value: TValue) => void;
  // Typed by value, so an enum's option list hands back that enum.
  options: readonly { value: TValue; label: string }[];
  // A visible label above the select; table cells pass ariaLabel instead.
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
}

// A select that applies its change immediately (ticket status, a row's
// status, ...), as opposed to AppSelectField, which is bound to a form.
const SelectControl = <TValue extends string>({
  value,
  onValueChange,
  options,
  label,
  ariaLabel,
  disabled,
  size = "default",
  className,
}: SelectControlProps<TValue>) => {
  const id = useId();
  const { translate } = useLocale();

  return (
    <div className="space-y-1.5">
      {label && (
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {translate(label)}
        </Label>
      )}
      {/* Radix only ever reports one of the option values given above. */}
      <Select value={value} onValueChange={(next) => onValueChange(next as TValue)} disabled={disabled}>
        <SelectTrigger id={id} size={size} aria-label={label || !ariaLabel ? undefined : translate(ariaLabel)} className={cn("w-full rounded-field bg-surface text-ink hover:bg-surface focus-visible:border-focus-ring focus-visible:ring-0 focus-visible:focus-halo dark:bg-surface dark:hover:bg-surface", size === "default" && "data-[size=default]:h-9.5", className)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {translate(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SelectControl;
