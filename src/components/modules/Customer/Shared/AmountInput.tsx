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
  // target, Move between goals), a size under the drawer's main amount.
  // "md": the Savings boards' 52px box (Withdraw, Move money), 10px corners.
  // "sm": the 44px box beside a date (the Assets popups' Price).
  // "field": a plain 44px field among others (Balance's account and transfer
  // forms), the currency named in its label instead.
  size?: "xl" | "lg" | "md" | "sm" | "field";
  placeholder?: string;
}

// A drawer's amount box (design-v4): 56px with 8px corners, the currency
// sign in a 52px strip cell on the left and the figure large and bold beside
// it, grouped as it is typed ("16,50,000").
const AmountInput = ({ id, value, onChange, currency, autoFocus = false, invalid = false, describedBy, size = "xl", placeholder = "0" }: AmountInputProps) => {
  const { fmt } = useLocale();
  const field = useAmountField(value, onChange, currency);
  const describe = describedBy && { "aria-describedby": invalid ? `${id}-error ${describedBy}` : describedBy };
  if (size === "field") {
    return <Input id={id} type="text" inputMode="decimal" size="md" {...field} placeholder={placeholder} autoFocus={autoFocus} invalid={invalid} {...describe} className="tabular-nums" />;
  }
  const box = {
    xl: { strip: "h-14 w-13 text-[20px]", frame: "h-14 rounded-sm", figure: "pl-3.5 text-[24px]" },
    lg: { strip: "h-12 w-11 text-[17px]", frame: "h-12 rounded-sm", figure: "pl-3 text-h3" },
    md: { strip: "h-13 w-12 text-[19px]", frame: "h-13 rounded-field", figure: "pl-3.5 text-[22px]" },
    sm: { strip: "h-11 w-10.5 text-[15px]", frame: "h-11 rounded-[10px]", figure: "pl-3 text-[16px] font-semibold" },
  }[size];
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      size={size === "xl" ? "xl" : size === "sm" ? "md" : "lg"}
      {...field}
      placeholder={placeholder}
      autoFocus={autoFocus}
      invalid={invalid}
      {...describe}
      leading={<span className={cn("flex items-center justify-center border-r border-line bg-strip font-semibold text-ink-soft", box.strip)}>{currencySymbol(currency, fmt)}</span>}
      frameClassName={cn("gap-0 overflow-hidden pl-0", box.frame)}
      className={cn("font-bold tabular-nums", box.figure)}
    />
  );
};

export default AmountInput;
