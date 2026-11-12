// Every money value in the panel renders through this. Decimal columns arrive
// from the backend as fixed-2dp strings ("1500.00"), so strings are accepted
// and parsed here rather than at each call site.
import { toLocaleDigits } from "@/lib/i18n/digits";
import { takaSign } from "@/lib/i18n/formatPrefs";
import type { Locale } from "@/lib/i18n/translate";

export const DEFAULT_CURRENCY = "BDT";

// Taka is written "Tk 6,214.50" in English and "৳ ৬,২১৪.৫০" in Bangla
// (takaSign): our own sign (Intl's rendering of BDT varies by ICU data)
// joined to the digits with a no-break space, so a narrow cell never leaves
// the sign alone on its line.
const SYMBOLS: Record<string, (locale: Locale) => string> = { BDT: takaSign };

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

// "Tk 299", "Tk 2,699.10": the paisa only when there are some, as the design
// writes payments and prices in its lists. The reader's language comes last:
// Bangla gets "৳" and Bangla digits. Leave it out where the text must stay
// Latin (a CSV export).
export const formatAmount = (amount: number | string | null | undefined, currency = DEFAULT_CURRENCY, locale: Locale = "en"): string => {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return formatCurrency(safeValue, currency, Number.isInteger(safeValue) ? 0 : 2, locale);
};

// formatCurrency(1500) -> "Tk 1,500.00"; formatCurrency(5, "USD") -> "$5.00";
// non-numeric input falls back to 0.
export const formatCurrency = (amount: number | string | null | undefined, currency = DEFAULT_CURRENCY, fractionDigits = 2, locale: Locale = "en"): string => {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const symbol = SYMBOLS[currency]?.(locale);
  if (!symbol) {
    return toLocaleDigits(getFormatter(currency, fractionDigits).format(safeValue), locale);
  }
  // The sign leads, as it is read: "-Tk 1,500.00".
  return toLocaleDigits(`${safeValue < 0 ? "-" : ""}${symbol} ${getFormatter(currency, fractionDigits).format(Math.abs(safeValue))}`, locale);
};
