"use client";

import { Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import Input from "@/components/smartly/form/Input";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface PasswordFieldProps extends Omit<React.ComponentProps<"input">, "size" | "type" | "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md" | "lg" | "xl";
  invalid?: boolean;
  // Show the text in a monospace face, as a generated password reads best.
  mono?: boolean;
  // Copies the current text; shown only when given.
  onCopy?: () => void;
  frameClassName?: string;
  // Shown as text to start with; the eye still hides it.
  defaultVisible?: boolean;
  // Shown or hidden by the caller instead (a password Generate just filled
  // reads in the open); onVisibleChange hears the eye.
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  // False when one Show link elsewhere shows every field at once (Change password).
  eye?: boolean;
}

// A password box with a show/hide eye, hidden to start with unless the
// caller says otherwise.
export function PasswordField({ value, onChange, size = "lg", invalid, mono = false, onCopy, frameClassName, className, defaultVisible = false, visible: shown, onVisibleChange, eye = true, ...props }: PasswordFieldProps) {
  const { t } = useLocale();
  const [shownHere, setShownHere] = useState(defaultVisible);
  const visible = shown ?? shownHere;
  const toggle = () => {
    setShownHere(!visible);
    onVisibleChange?.(!visible);
  };
  const button = "flex size-8 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink";

  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      size={size}
      invalid={invalid}
      className={cn(mono && visible && "font-mono tracking-wider", className)}
      frameClassName={frameClassName}
      trailing={
        !eye && !onCopy ? undefined : (
        <span className="flex items-center">
          {eye && (
          <button type="button" onClick={toggle} aria-label={t(visible ? "Hide password" : "Show password")} aria-pressed={visible} className={button}>
            {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
          )}
          {onCopy && (
            <button type="button" onClick={onCopy} aria-label={t("Copy password")} className={button}>
              <Copy className="size-4" aria-hidden="true" />
            </button>
          )}
        </span>
        )
      }
    />
  );
}
