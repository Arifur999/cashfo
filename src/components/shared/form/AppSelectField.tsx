"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import FormFieldShell from "./FormFieldShell";

export interface SelectOption {
  value: string;
  label: React.ReactNode;
}

interface AppSelectFieldProps {
  field: AnyFieldApi;
  label: React.ReactNode;
  options: readonly SelectOption[];
  placeholder?: string;
  description?: React.ReactNode;
  disabled?: boolean;
}

// The same frame as a text field (InputFrame): white, the strong line, 44px,
// emerald with a mint ring while focused.
const FIELD_TRIGGER =
  "h-11 w-full rounded-md bg-surface px-4 text-body text-ink hover:bg-surface data-[size=default]:h-11 data-placeholder:text-ink-faint focus-visible:border-emerald focus-visible:ring-4 focus-visible:ring-mint-50";

const AppSelectField = ({ field, label, options, placeholder = "Select...", description, disabled }: AppSelectFieldProps) => {
  return (
    <FormFieldShell field={field} label={label} description={description}>
      {(control, hasError) => (
        <Select
          value={field.state.value ?? ""}
          onValueChange={(value) => field.handleChange(value)}
          disabled={disabled}
          name={field.name}
        >
          <SelectTrigger {...control} onBlur={field.handleBlur} className={cn(FIELD_TRIGGER, hasError ? "border-expense" : "border-line-strong")}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormFieldShell>
  );
};

export default AppSelectField;
