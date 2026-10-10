"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormFieldShell from "./FormFieldShell";
import type { SelectOption } from "./AppSelectField";

interface AppChipsFieldProps {
  field: AnyFieldApi;
  label: string;
  options: readonly SelectOption[];
  description?: React.ReactNode;
}

// Multi-select as a row of toggle chips (string[] value) -- applicable plans,
// workspace types, ... Each chip is a real button with aria-pressed.
const AppChipsField = ({ field, label, options, description }: AppChipsFieldProps) => {
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
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "outline"}
                aria-pressed={isSelected}
                onClick={() => toggle(option.value)}
              >
                {isSelected && <Check aria-hidden="true" />}
                {option.label}
              </Button>
            );
          })}
        </div>
      )}
    </FormFieldShell>
  );
};

export default AppChipsField;
