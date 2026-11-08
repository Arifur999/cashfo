"use client";

import Input from "@/components/smartly/form/Input";
import { useAmountField } from "@/hooks/useAmountField";
import { currencySymbol } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AmountInputProps {
  id: string;
  value: string;
  // Gets the amount as typed, cleaned up (Bangla digits too, one point).
  onChange: (value: string) => void;
  currency: string;
  autoFocus?: boolean;
  invalid?: boolean;
  // The id of the line that explains the amount (what is available, what it
  // leaves), read out with the field.
  describedBy?: string;
  // "lg": the 48px box a form's second figure gets (New savings goal's
  // target, Move between goals), a size under the drawer's main amount;
  // "md": the 44px box beside a date (the Assets popups' Price).
  size?: "xl" | "lg" | "md";
}

// A drawer's amount box (design-v4): 56px with 8px corners, the currency
// sign in a 52px strip cell on the left and the figure large and bold beside
// it, grouped as it is typed ("16,50,000").
const AmountInput = ({ id, value, onChange, currency, autoFocus = false, invalid = false, describedBy, size = "xl" }: AmountInputProps) => {
  const { fmt } = useLocale();
  const field = useAmountField(value, onChange, currency);
  const lg = size === "lg";
  const md = size === "md";
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      size={md ? "md" : lg ? "lg" : "xl"}
      {...field}
      placeholder="0"
      autoFocus={autoFocus}
      invalid={invalid}
      {...(describedBy && { "aria-describedby": invalid ? `${id}-error ${describedBy}` : describedBy })}
      leading={<span className={cn("flex items-center justify-center border-r border-line bg-strip font-semibold text-ink-soft", md ? "h-11 w-10.5 text-[15px]" : lg ? "h-12 w-11 text-[17px]" : "h-14 w-13 text-[20px]")}>{currencySymbol(currency, fmt)}</span>}
      frameClassName={cn("gap-0 overflow-hidden pl-0", md ? "h-11 rounded-[10px]" : lg ? "h-12 rounded-sm" : "h-14 rounded-sm")}
      className={cn("font-bold tabular-nums", md ? "pl-3 text-[16px] font-semibold" : lg ? "pl-3 text-h3" : "pl-3.5 text-[24px]")}
    />
  );
};

export default AmountInput;
