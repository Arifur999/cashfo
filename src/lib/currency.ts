// Every money value in the panel renders through this. Decimal columns arrive
// from the backend as fixed-2dp strings ("1500.00"), so strings are accepted
// and parsed here rather than at each call site.
export const DEFAULT_CURRENCY = "BDT";

// Taka is written the way the design writes it, "৳ 6,214.50": our own symbol
// (Intl's rendering of BDT varies by ICU data) joined to the digits with a
// no-break space, so a narrow cell never leaves "৳" alone on its line.
const SYMBOLS: Record<string, string> = { BDT: "৳" };

const formatters = new Map<string, Intl.NumberFormat>();

const getFormatter = (currency: string, fractionDigits: number) => {
  const key = `${currency}:${fractionDigits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      ...(SYMBOLS[currency] ? {} : { style: "currency", currency }),
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, formatter);
  }
  return formatter;
};

// "৳ 299", "৳ 2,699.10": the paisa only when there are some, as the design
// writes payments and prices in its lists.
export const formatAmount = (amount: number | string | null | undefined, currency = DEFAULT_CURRENCY): string => {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return formatCurrency(safeValue, currency, Number.isInteger(safeValue) ? 0 : 2);
};

// formatCurrency(1500) -> "৳ 1,500.00"; formatCurrency(5, "USD") -> "$5.00";
// non-numeric input falls back to 0.
export const formatCurrency = (amount: number | string | null | undefined, currency = DEFAULT_CURRENCY, fractionDigits = 2): string => {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const symbol = SYMBOLS[currency];
  if (!symbol) {
    return getFormatter(currency, fractionDigits).format(safeValue);
  }
  // The sign leads, as it is read: "-৳ 1,500.00".
  return `${safeValue < 0 ? "-" : ""}${symbol} ${getFormatter(currency, fractionDigits).format(Math.abs(safeValue))}`;
};
