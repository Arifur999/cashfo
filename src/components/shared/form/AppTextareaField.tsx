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
  // The language of what's typed ("bn" for a Bangla message), so a screen
  // reader says it right.
  lang?: string;
  className?: string;
  // e.g. Ctrl+Enter to submit a reply box.
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
}

const AppTextareaField = ({ field, label, placeholder, rows = 4, description, readOnly, lang, className, onKeyDown }: AppTextareaFieldProps) => {
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
          lang={lang}
          className={className}
        />
      )}
    </FormFieldShell>
  );
};

export default AppTextareaField;
