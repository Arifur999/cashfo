"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SelectOption } from "./AppSelectField";

interface SelectControlProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  // A visible label above the select; table cells pass ariaLabel instead.
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
}

// A select that applies its change immediately (ticket status, a row's
// status, ...), as opposed to AppSelectField, which is bound to a form.
const SelectControl = ({ value, onValueChange, options, label, ariaLabel, disabled, size = "default", className }: SelectControlProps) => {
  const id = useId();

  return (
    <div className="space-y-1.5">
      {label && (
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} size={size} aria-label={label ? undefined : ariaLabel} className={cn("w-full", className)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SelectControl;
