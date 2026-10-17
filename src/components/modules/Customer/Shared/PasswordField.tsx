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
}

// A password box with a show/hide eye, hidden to start with.
export function PasswordField({ value, onChange, size = "lg", invalid, mono = false, onCopy, frameClassName, className, ...props }: PasswordFieldProps) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
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
        <span className="flex items-center">
          <button type="button" onClick={() => setVisible((v) => !v)} aria-label={t(visible ? "Hide password" : "Show password")} aria-pressed={visible} className={button}>
            {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
          {onCopy && (
            <button type="button" onClick={onCopy} aria-label={t("Copy password")} className={button}>
              <Copy className="size-4" aria-hidden="true" />
            </button>
          )}
        </span>
      }
    />
  );
}
