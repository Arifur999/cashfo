"use client";

import Input from "@/components/smartly/form/Input";
import { useAmountField } from "@/hooks/useAmountField";
import { currencySymbol } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const LOOKS = {
  // New goal's target: the sign in the brand colour, the figure largest.
  target: { frame: "h-14 gap-1.5 border-[1.5px] border-line px-3.5", sign: "text-[20px] font-bold text-emerald", figure: "text-[22px] font-bold" },
  // Beside it, what is already saved.
  saved: { frame: "h-14 gap-1.5 border-[1.5px] border-line px-3.5", sign: "text-[18px] font-bold text-ink-faint", figure: "text-[18px] font-bold" },
  // Add money's amount.
  plain: { frame: "h-11 gap-2 px-3.5", sign: "text-[15px] font-semibold text-ink-faint", figure: "text-[15px] font-semibold max-md:text-[16px]" },
} as const;

// The Savings boards' amount box: the currency sign inline before the
// figure, grouped as it is typed ("16,50,000").
export function MoneyField({ id, value, onChange, currency, look, autoFocus = false }: { id: string; value: string; onChange: (value: string) => void; currency: string; look: keyof typeof LOOKS; autoFocus?: boolean }) {
  const { fmt } = useLocale();
  const field = useAmountField(value, onChange, currency);
  const style = LOOKS[look];
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      size="xl"
      {...field}
      placeholder="0"
      autoFocus={autoFocus}
      leading={<span className={style.sign}>{currencySymbol(currency, fmt)}</span>}
      frameClassName={cn("rounded-[12px]", style.frame)}
      className={cn("tabular-nums", style.figure)}
    />
  );
}
