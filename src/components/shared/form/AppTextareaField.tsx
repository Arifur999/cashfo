"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import FormFieldShell from "./FormFieldShell";

interface AppTextareaFieldProps {
  field: AnyFieldApi;
  label: string;
  placeholder?: string;
  rows?: number;
  description?: React.ReactNode;
  readOnly?: boolean;
  className?: string;
}

const AppTextareaField = ({ field, label, placeholder, rows = 4, description, readOnly, className }: AppTextareaFieldProps) => {
  return (
    <FormFieldShell field={field} label={label} description={description}>
      {(control, hasError) => (
        <Textarea
          {...control}
          name={field.name}
          rows={rows}
          value={field.state.value ?? ""}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={cn(hasError && "border-destructive focus-visible:ring-destructive/20", className)}
        />
      )}
    </FormFieldShell>
  );
};

export default AppTextareaField;
