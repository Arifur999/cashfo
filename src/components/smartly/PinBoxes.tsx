"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PinBoxesProps {
  value: string;
  onChange: (value: string) => void;
  // Submit on Enter.
  onSubmit?: () => void;
  // The PIN is 4 to 6 digits; the boxes grow past four as more is typed.
  maxLength?: number;
  label: string;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

// A row of digit boxes over one real input, so the PIN types like a PIN
// and reads like one: dots for the digits entered, the next box lit.
const PinBoxes = ({ value, onChange, onSubmit, maxLength = 6, label, autoFocus, disabled, invalid, className }: PinBoxesProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const count = Math.min(maxLength, Math.max(4, value.length + 1));

  return (
    <div role="group" aria-label={label} className={cn("relative flex justify-center gap-3 py-2", className)} onClick={() => inputRef.current?.focus()}>
      {Array.from({ length: count }, (_, index) => {
        const filled = index < value.length;
        const active = focused && index === value.length;
        return (
          <span
            key={index}
            aria-hidden="true"
            className={cn(
              "flex h-15 w-13 items-center justify-center rounded-md border bg-surface text-h1 text-ink transition-[border-color,box-shadow]",
              invalid ? "border-expense" : active ? "border-emerald shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]" : "border-line-strong",
            )}
          >
            {filled ? "•" : ""}
          </span>
        );
      })}
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, maxLength))}
        onKeyDown={(event) => {
          if (event.key === "Enter" && onSubmit) {
            event.preventDefault();
            onSubmit();
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={maxLength}
        aria-label={label}
        aria-invalid={invalid || undefined}
        autoFocus={autoFocus}
        disabled={disabled}
        className="absolute inset-0 cursor-default opacity-0"
      />
    </div>
  );
};

export default PinBoxes;
