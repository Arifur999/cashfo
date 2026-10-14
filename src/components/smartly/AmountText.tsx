import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-amount-sm",
  md: "text-amount",
  lg: "text-amount-lg",
  h2: "text-h2",
  display: "text-display",
  "display-xl": "text-display-xl",
} as const;

const TONES = {
  income: "text-income",
  expense: "text-expense",
  neutral: "text-ink",
  inherit: "",
} as const;

interface AmountTextProps extends Omit<React.ComponentProps<"span">, "children"> {
  value: number | string;
  currency?: string;
  size?: keyof typeof SIZES;
  // "auto" colours money in green and money out red; "neutral" keeps ink.
  tone?: keyof typeof TONES | "auto";
  // Show "+ ৳ …" / "− ৳ …" rather than "-৳ …".
  signed?: boolean;
}

// Money, always in tabular figures so columns of it line up.
const AmountText = ({ value, currency = "BDT", size = "md", tone = "neutral", signed = false, className, ...props }: AmountTextProps) => {
  const amount = Number(value);
  const resolvedTone = tone === "auto" ? (amount > 0 ? "income" : amount < 0 ? "expense" : "neutral") : tone;
  return (
    <span className={cn("tabular-nums", SIZES[size], TONES[resolvedTone], className)} {...props}>
      {signed ? formatSignedCurrency(amount, currency) : formatCurrency(amount, currency)}
    </span>
  );
};

export default AmountText;
