// Shared money-formatting utility -- every page that shows money goes
// through here, so this is the one place that decides symbol, digit grouping
// and decimal places. A manual symbol map rather than Intl.NumberFormat's
// `style: "currency"`: that API's rendered symbol for BDT varies by
// environment/ICU data (sometimes "BDT", sometimes "৳").
//
// Taka is grouped the South Asian way (lakh/crore: ৳ 12,50,000.00), other
// currencies the international way. The locale is always explicit, never the
// machine default, so the server and every browser print the same text (a
// bn-BD browser would otherwise switch to Bangla digits mid-page).
const CURRENCIES: Record<string, { symbol: string; locale: string }> = {
  BDT: { symbol: "৳", locale: "en-IN" },
  USD: { symbol: "$", locale: "en-US" },
};

const formatters = new Map<string, Intl.NumberFormat>();

const groupDigits = (value: number, locale: string) => {
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    formatters.set(locale, formatter);
  }
  return formatter.format(value);
};

export function formatCurrency(amount: number | string, currencyCode: string): string {
  const { symbol, locale } = CURRENCIES[currencyCode] ?? { symbol: currencyCode, locale: "en-US" };
  const value = Number(amount);
  const safeValue = Number.isFinite(value) ? value : 0;
  // "-৳ 1,500.00", not "৳ -1,500.00": the sign leads, as it is read.
  return `${safeValue < 0 ? "-" : ""}${symbol} ${groupDigits(Math.abs(safeValue), locale)}`;
}

// Just the symbol, e.g. for an inline prefix inside an amount input --
// callers that need the formatted number too should use formatCurrency().
export function currencySymbol(currencyCode: string): string {
  return CURRENCIES[currencyCode]?.symbol ?? `${currencyCode} `;
}
