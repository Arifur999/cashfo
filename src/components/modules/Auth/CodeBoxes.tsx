"use client";

import { Fragment, useEffect, useRef } from "react";
import { cleanTotpCode } from "@/lib/customer/securityDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const LENGTH = 6;

interface CodeBoxesProps {
  value: string;
  onChange: (value: string) => void;
  // All six filled: the form may send it at once.
  onComplete?: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
}

// The 6-digit code as AdminTwoFactor draws it: one box a digit, in two
// threes. Typing moves on, Backspace moves back, and a pasted or
// autofilled code ("123 456", Bangla digits too) fills every box.
const CodeBoxes = ({ value, onChange, onComplete, invalid = false, disabled = false, autoFocus = false, label = "6-digit code" }: CodeBoxesProps) => {
  const { t } = useLocale();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] ?? "");

  const focus = (index: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();

  // A wrong code is cleared to be typed again: from the first box.
  useEffect(() => {
    if (invalid && value === "" && !disabled) refs.current[0]?.focus();
  }, [invalid, value, disabled]);

  const write = (index: number, typed: string) => {
    const clean = cleanTotpCode(typed);
    if (!clean) return;
    // A paste or an autofill brings the whole code into one box.
    const next = clean.length > 1 ? clean.slice(0, LENGTH) : `${value.slice(0, index)}${clean}${value.slice(index + 1)}`.slice(0, LENGTH);
    onChange(next);
    focus(clean.length > 1 ? next.length : index + 1);
    if (next.length === LENGTH) onComplete?.(next);
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        onChange(`${value.slice(0, index)}${value.slice(index + 1)}`);
      } else if (index > 0) {
        onChange(`${value.slice(0, index - 1)}${value.slice(index)}`);
        focus(index - 1);
      }
    } else if (event.key === "ArrowLeft") {
      focus(index - 1);
    } else if (event.key === "ArrowRight") {
      focus(index + 1);
    }
  };

  return (
    <div role="group" aria-label={t(label)} className="flex gap-2 sm:gap-2.5">
      {digits.map((digit, index) => (
        <Fragment key={index}>
          {index === LENGTH / 2 && <span aria-hidden="true" className="w-1 shrink-0 sm:w-2" />}
          <input
            ref={(element) => {
              refs.current[index] = element;
            }}
            aria-label={t("Digit {n} of {total}", { n: index + 1, total: LENGTH })}
            aria-invalid={invalid || undefined}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            // Room for a whole pasted code; write() keeps one digit a box.
            maxLength={LENGTH + 2}
            value={digit}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            onChange={(event) => write(index, event.target.value.replace(digit, "") || event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event)}
            onFocus={(event) => event.target.select()}
            lang="en"
            className={cn(
              "h-15 w-full max-w-13.5 min-w-0 flex-1 rounded-field border bg-surface text-center text-[24px] font-bold text-ink tabular-nums outline-none transition-[border-color,box-shadow] disabled:opacity-60",
              invalid ? "border-expense focus:error-halo" : "border-input focus:border-focus-ring focus:focus-halo",
            )}
          />
        </Fragment>
      ))}
    </div>
  );
};

export default CodeBoxes;
