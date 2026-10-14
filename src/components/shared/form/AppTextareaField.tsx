"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import Textarea from "@/components/smartly/form/Textarea";
import FormFieldShell from "./FormFieldShell";

interface AppTextareaFieldProps {
  field: AnyFieldApi;
  label: string;
  placeholder?: string;
  rows?: number;
  description?: React.ReactNode;
  readOnly?: boolean;
  className?: string;
  // e.g. Ctrl+Enter to submit a reply box.
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
}

const AppTextareaField = ({ field, label, placeholder, rows = 4, description, readOnly, className, onKeyDown }: AppTextareaFieldProps) => {
  return (
    <FormFieldShell field={field} label={label} description={description}>
      {(control, hasError) => (
        <Textarea
          {...control}
          name={field.name}
          rows={rows}
          invalid={hasError}
          value={field.state.value ?? ""}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          readOnly={readOnly}
          className={className}
        />
      )}
    </FormFieldShell>
  );
};

export default AppTextareaField;
