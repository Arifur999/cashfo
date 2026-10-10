"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
};

// Single-line inputs only. Textareas, selects and checkbox groups are
// hand-rolled in the modal with <Label htmlFor={field.name}> + field.handleChange.
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
  // Only show an error once the field has been touched -- validating an
  // untouched empty form would paint it red before anyone typed.
  const firstError =
    field.state.meta.isTouched && field.state.meta.errors.length > 0 ? getErrorMessage(field.state.meta.errors[0]) : null;
  const hasError = firstError !== null;
  const errorId = `${field.name}-error`;
  const descriptionId = `${field.name}-description`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <div className="relative">
        {prepend && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">{prepend}</span>
        )}
        <Input
          id={field.name}
          name={field.name}
          type={type}
          value={field.state.value ?? ""}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : description ? descriptionId : undefined}
          className={cn(
            prepend && "pl-10",
            append && "pr-10",
            hasError && "border-destructive focus-visible:ring-destructive/20",
            className,
          )}
        />
        {append && <span className="absolute top-1/2 right-2 -translate-y-1/2">{append}</span>}
      </div>
      {description && !hasError && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {hasError && (
        <p role="alert" id={errorId} className="text-sm text-destructive">
          {firstError}
        </p>
      )}
    </div>
  );
};

export default AppField;
