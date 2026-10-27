"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import FormFieldShell from "./FormFieldShell";
import { useLocale } from "@/lib/i18n/LocaleProvider";

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

// The same frame as a text field (InputFrame): white, the field edge, 10px
// corners, 44px, the focus edge and halo while focused or open.
const FIELD_TRIGGER =
  "h-11 w-full rounded-field bg-surface px-3 text-body text-ink hover:bg-surface data-[size=default]:h-11 data-placeholder:text-ink-faint focus-visible:border-focus-ring focus-visible:ring-0 focus-visible:focus-halo data-[state=open]:border-focus-ring data-[state=open]:focus-halo";

const AppSelectField = ({ field, label, options, placeholder = "Select...", description, disabled }: AppSelectFieldProps) => {
  const { translate } = useLocale();
  return (
    <FormFieldShell field={field} label={label} description={description}>
      {(control, hasError) => (
        <Select
          value={field.state.value ?? ""}
          onValueChange={(value) => field.handleChange(value)}
          disabled={disabled}
          name={field.name}
        >
          <SelectTrigger {...control} onBlur={field.handleBlur} className={cn(FIELD_TRIGGER, hasError ? "border-expense" : "border-input")}>
            <SelectValue placeholder={translate(placeholder)} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {typeof option.label === "string" ? translate(option.label) : option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormFieldShell>
  );
};

export default AppSelectField;
