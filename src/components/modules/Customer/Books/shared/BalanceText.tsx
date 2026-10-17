import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { cn } from "@/lib/utils";

interface BalanceTextProps extends Omit<React.ComponentProps<"span">, "children"> {
  value: number | string;
  currency: string;
}

// A balance in a ledger column: ink when positive, the expense red with a
// real minus sign when the account has gone the other way.
export function BalanceText({ value, currency, className, ...props }: BalanceTextProps) {
  const amount = Number(value);
  return (
    <span className={cn("tabular-nums whitespace-nowrap", amount < 0 ? "text-expense" : "text-ink", className)} {...props}>
      {amount < 0 ? formatSignedCurrency(amount, currency) : formatCurrency(amount, currency)}
    </span>
  );
}
