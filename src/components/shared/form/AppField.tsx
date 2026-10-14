"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import Input from "@/components/smartly/form/Input";
import type { INPUT_HEIGHTS } from "@/components/smartly/form/InputFrame";
import FormFieldShell from "./FormFieldShell";

export type FieldSize = keyof typeof INPUT_HEIGHTS;

type AppFieldProps = {
  field: AnyFieldApi;
  label: React.ReactNode;
  type?: "text" | "email" | "password" | "number" | "date" | "time" | "datetime-local" | "tel";
  placeholder?: string;
  // Inside the frame, after the text -- this is how the password reveal
  // toggle is done.
  append?: React.ReactNode;
  // Inside the frame, before the text (an icon, a currency sign).
  prepend?: React.ReactNode;
  aside?: React.ReactNode;
  description?: React.ReactNode;
  autoComplete?: string;
  inputMode?: React.ComponentProps<"input">["inputMode"];
  // The design's control heights: 38 / 44 / 48 / 52.
  size?: FieldSize;
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
  aside,
  description,
  autoComplete,
  inputMode,
  size = "md",
  className,
  disabled,
}: AppFieldProps) => {
  return (
    <FormFieldShell field={field} label={label} aside={aside} description={description}>
      {(control, hasError) => (
        <Input
          {...control}
          name={field.name}
          type={type}
          size={size}
          invalid={hasError}
          leading={prepend}
          trailing={append}
          value={field.state.value ?? ""}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          disabled={disabled}
          className={className}
        />
      )}
    </FormFieldShell>
  );
};

export default AppField;
