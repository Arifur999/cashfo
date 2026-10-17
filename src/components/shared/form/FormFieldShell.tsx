"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { CircleAlert } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
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

// Report an error once the person has left the field, or tried to submit --
// not on the first keystroke, which would flag "Enter a valid email" while
// they are still typing it. Validation itself runs on every change, so the
// error clears the moment the value is fixed.
export const getFieldError = (field: AnyFieldApi): string | null => {
  const { isBlurred, errors } = field.state.meta;
  const shouldShow = isBlurred || field.form.state.submissionAttempts > 0;
  return shouldShow && errors.length > 0 ? getErrorMessage(errors[0]) : null;
};

export interface FieldControlProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
}

interface FormFieldShellProps {
  field: AnyFieldApi;
  label: React.ReactNode;
  // Something on the label's row, at the right ("Forgot password?").
  aside?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  // Receives the a11y props the control must spread, plus the error flag.
  children: (control: FieldControlProps, hasError: boolean) => React.ReactNode;
}

// The label / description / error wiring every App*Field shares, so each
// field component only renders its control. Drawn as the design's Field:
// the 13px semibold label, the hint under the control, the red error with
// its icon that says how to fix the value.
const FormFieldShell = ({ field, label, aside, description, className, children }: FormFieldShellProps) => {
  const { translate } = useLocale();
  const error = getFieldError(field);
  const errorId = `${field.name}-error`;
  const descriptionId = `${field.name}-description`;

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <label id={`${field.name}-label`} htmlFor={field.name} className="text-small font-semibold text-ink-2 select-none">
          {typeof label === "string" ? translate(label) : label}
        </label>
        {aside}
      </div>
      {children(
        {
          id: field.name,
          "aria-invalid": error !== null,
          "aria-describedby": error ? errorId : description ? descriptionId : undefined,
        },
        error !== null,
      )}
      {description && !error && (
        <div id={descriptionId} className="text-caption font-normal text-ink-muted">
          {typeof description === "string" ? translate(description) : description}
        </div>
      )}
      {error && (
        <p role="alert" id={errorId} className="flex items-center gap-2 text-caption text-expense">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {/* Validation messages are English keys like every other string. */}
          {translate(error)}
        </p>
      )}
    </div>
  );
};

export default FormFieldShell;
