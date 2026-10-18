"use client";

import { useLayoutEffect, useRef } from "react";
import { groupAmountInput, normalizeMoneyInput } from "@/lib/customer/money";

// Where the caret goes in the grouped text so that `digits` digits (and the
// point) stand before it.
const caretAfter = (display: string, digits: number) => {
  let at = 0;
  for (let seen = 0; at < display.length && seen < digits; at++) {
    if (display[at] !== ",") seen++;
  }
  return at;
};

// A money input that groups its digits while it is typed in ("16,50,000"),
// as every board draws an amount, and keeps the caret among the same digits
// when the commas move. The state stays plain ("1650000"); spread the result
// onto the <input> (or the Input component).
export function useAmountField(value: string, onChange: (raw: string) => void, currency: string) {
  const ref = useRef<HTMLInputElement>(null);
  // How many digits (and the point) stood before the caret at the last
  // keystroke; null when the value was set from outside (a quick pick).
  const caret = useRef<number | null>(null);
  const display = groupAmountInput(value, currency);

  useLayoutEffect(() => {
    const input = ref.current;
    const before = caret.current;
    caret.current = null;
    if (!input || before === null || document.activeElement !== input) return;
    const at = caretAfter(display, before);
    input.setSelectionRange(at, at);
  }, [display]);

  return {
    ref,
    value: display,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const typed = input.value;
      const before = normalizeMoneyInput(typed.slice(0, input.selectionStart ?? typed.length)).length;
      const next = normalizeMoneyInput(typed);
      if (next === value) {
        // A key that changes nothing ("a"): React puts the old text back
        // and the caret would jump to the end, so set it again after that.
        requestAnimationFrame(() => {
          const at = caretAfter(display, before);
          input.setSelectionRange(at, at);
        });
        return;
      }
      caret.current = before;
      onChange(next);
    },
  };
}
