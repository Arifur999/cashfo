"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
};

// Only report an error once the field has been touched -- validating an
// untouched empty form would paint it red before anyone typed.
export const getFieldError = (field: AnyFieldApi): string | null =>
  field.state.meta.isTouched && field.state.meta.errors.length > 0 ? getErrorMessage(field.state.meta.errors[0]) : null;

export interface FieldControlProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
}

interface FormFieldShellProps {
  field: AnyFieldApi;
  label: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  // Receives the a11y props the control must spread, plus the error flag.
  children: (control: FieldControlProps, hasError: boolean) => React.ReactNode;
}

// The label / description / error wiring every App*Field shares, so each
// field component only renders its control.
const FormFieldShell = ({ field, label, description, className, children }: FormFieldShellProps) => {
  const error = getFieldError(field);
  const errorId = `${field.name}-error`;
  const descriptionId = `${field.name}-description`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label id={`${field.name}-label`} htmlFor={field.name}>
        {label}
      </Label>
      {children(
        {
          id: field.name,
          "aria-invalid": error !== null,
          "aria-describedby": error ? errorId : description ? descriptionId : undefined,
        },
        error !== null,
      )}
      {description && !error && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p role="alert" id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormFieldShell;
