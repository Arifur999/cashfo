// Every money value in the panel renders through this. Decimal columns arrive
// from the backend as fixed-2dp strings ("1500.00"), so strings are accepted
// and parsed here rather than at each call site.
export const DEFAULT_CURRENCY = "BDT";

const formatters = new Map<string, Intl.NumberFormat>();

const getFormatter = (currency: string, fractionDigits: number) => {
  const key = `${currency}:${fractionDigits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, formatter);
  }
  return formatter;
};

// formatCurrency(1500) -> "BDT 1,500.00"; non-numeric input falls back to 0.
export const formatCurrency = (amount: number | string | null | undefined, currency = DEFAULT_CURRENCY, fractionDigits = 2): string => {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return getFormatter(currency, fractionDigits).format(safeValue);
};
