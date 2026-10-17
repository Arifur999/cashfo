"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { cn } from "@/lib/utils";
import FormFieldShell from "./FormFieldShell";
import type { SelectOption } from "./AppSelectField";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AppChipsFieldProps {
  field: AnyFieldApi;
  label: string;
  options: readonly SelectOption[];
  description?: React.ReactNode;
}

// Multi-select as a row of toggle chips (string[] value) -- applicable plans,
// workspace types, ... Each chip is a real button with aria-pressed; a
// chosen one goes mint with an emerald line, as the design draws them.
const AppChipsField = ({ field, label, options, description }: AppChipsFieldProps) => {
  const { translate } = useLocale();
  const selected: string[] = field.state.value ?? [];

  const toggle = (value: string) => {
    field.handleChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
    field.handleBlur();
  };

  return (
    <FormFieldShell field={field} label={label} description={description}>
      {(control) => (
        <div
          role="group"
          id={control.id}
          aria-labelledby={`${field.name}-label`}
          aria-describedby={control["aria-describedby"]}
          className="flex flex-wrap gap-2"
        >
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(option.value)}
                className={cn(
                  "h-8.5 rounded-full border px-3 text-small font-semibold transition-colors",
                  isSelected ? "border-emerald bg-mint-50 text-brand-ink" : "border-line-strong bg-surface text-ink-2 hover:bg-cream",
                )}
              >
                {typeof option.label === "string" ? translate(option.label) : option.label}
              </button>
            );
          })}
        </div>
      )}
    </FormFieldShell>
  );
};

export default AppChipsField;
