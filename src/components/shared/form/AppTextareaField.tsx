"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import Textarea from "@/components/smartly/form/Textarea";
import FormFieldShell from "./FormFieldShell";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AppTextareaFieldProps {
  field: AnyFieldApi;
  label: React.ReactNode;
  placeholder?: string;
  rows?: number;
  description?: React.ReactNode;
  readOnly?: boolean;
  className?: string;
  // e.g. Ctrl+Enter to submit a reply box.
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
}

const AppTextareaField = ({ field, label, placeholder, rows = 4, description, readOnly, className, onKeyDown }: AppTextareaFieldProps) => {
  const { translate } = useLocale();
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
          placeholder={placeholder && translate(placeholder)}
          readOnly={readOnly}
          className={className}
        />
      )}
    </FormFieldShell>
  );
};

export default AppTextareaField;
