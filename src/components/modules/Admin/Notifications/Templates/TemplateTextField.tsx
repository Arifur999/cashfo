"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import FormFieldShell from "@/components/shared/form/FormFieldShell";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";

export type TextControl = HTMLInputElement | HTMLTextAreaElement;

interface TemplateTextFieldProps {
  field: AnyFieldApi;
  label: string;
  // A message (a textarea) rather than a subject line.
  multiline?: boolean;
  rows?: number;
  // The Bangla fields say so, for the typeface and screen readers.
  lang?: "bn";
  // Roles that can only read still select and copy the text.
  readOnly: boolean;
  // Where a tapped variable goes: the control last focused, and its caret.
  onFocusControl: (control: TextControl) => void;
  // Under the control: the SMS length, for an SMS template.
  hint?: React.ReactNode;
}

// One of a template's four texts, on the form's own field frame. The
// shared fields can't take a language, a read-only subject or the focus
// the variable chips need, so this one builds on the same shell.
const TemplateTextField = ({ field, label, multiline = false, rows = 5, lang, readOnly, onFocusControl, hint }: TemplateTextFieldProps) => (
  <FormFieldShell field={field} label={label} description={hint}>
    {(control, hasError) =>
      multiline ? (
        <Textarea
          {...control}
          name={field.name}
          rows={rows}
          lang={lang}
          invalid={hasError}
          readOnly={readOnly}
          value={field.state.value ?? ""}
          onFocus={(event) => onFocusControl(event.currentTarget)}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          className={lang === "bn" ? "font-bn" : undefined}
        />
      ) : (
        <Input
          {...control}
          name={field.name}
          size="sm"
          lang={lang}
          invalid={hasError}
          readOnly={readOnly}
          value={field.state.value ?? ""}
          onFocus={(event) => onFocusControl(event.currentTarget)}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          className={lang === "bn" ? "font-bn" : undefined}
        />
      )
    }
  </FormFieldShell>
);

export default TemplateTextField;
