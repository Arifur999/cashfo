"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import FormFieldShell from "./FormFieldShell";

type AppFieldProps = {
  field: AnyFieldApi;
  label: string;
  type?: "text" | "email" | "password" | "number" | "date" | "time" | "datetime-local";
  placeholder?: string;
  // Absolutely positioned inside the input (adds the matching padding) --
  // this is how the password reveal toggle is done.
  append?: React.ReactNode;
  prepend?: React.ReactNode;
  description?: React.ReactNode;
  autoComplete?: string;
  className?: string;
  disabled?: boolean;
};

// Single-line inputs. Selects, textareas, switches and chip groups have their
// own App*Field components built on the same FormFieldShell.
const AppField = ({
  field,
  label,
  type = "text",
  placeholder,
  append,
  prepend,
  description,
  autoComplete,
  className,
  disabled,
}: AppFieldProps) => {
  return (
    <FormFieldShell field={field} label={label} description={description}>
      {(control, hasError) => (
        <div className="relative">
          {prepend && (
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">{prepend}</span>
          )}
          <Input
            {...control}
            name={field.name}
            type={type}
            value={field.state.value ?? ""}
            onBlur={field.handleBlur}
            onChange={(event) => field.handleChange(event.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            disabled={disabled}
            className={cn(
              prepend && "pl-10",
              append && "pr-10",
              hasError && "border-destructive focus-visible:ring-destructive/20",
              className,
            )}
          />
          {append && <span className="absolute top-1/2 right-2 -translate-y-1/2">{append}</span>}
        </div>
      )}
    </FormFieldShell>
  );
};

export default AppField;
