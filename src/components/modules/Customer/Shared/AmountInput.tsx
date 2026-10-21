"use client";

import Input from "@/components/smartly/form/Input";
import { useAmountField } from "@/hooks/useAmountField";
import { currencySymbol } from "@/lib/customer/currency";

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
}

// A drawer's amount box: the currency sign in a sand cell on the left and
// the figure large beside it, grouped as it is typed ("16,50,000"). 58px
// tall: the boards draw it 56px inside its border.
const AmountInput = ({ id, value, onChange, currency, autoFocus = false, invalid = false, describedBy }: AmountInputProps) => {
  const field = useAmountField(value, onChange, currency);
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      size="xl"
      {...field}
      placeholder="0"
      autoFocus={autoFocus}
      invalid={invalid}
      {...(describedBy && { "aria-describedby": invalid ? `${id}-error ${describedBy}` : describedBy })}
      leading={<span className="flex h-14 w-13 items-center justify-center border-r border-line bg-strip text-h2 font-semibold text-ink-2">{currencySymbol(currency)}</span>}
      frameClassName="h-14.5 gap-0 overflow-hidden pl-0"
      className="pl-4 text-h2 tabular-nums"
    />
  );
};

export default AmountInput;
