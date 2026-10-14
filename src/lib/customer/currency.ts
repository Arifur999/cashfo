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
  // Rounded to the paisa before the sign is chosen, so a sum that is
  // negative only by float noise (-2.8e-17) prints "৳ 0.00", not "-৳ 0.00".
  const rounded = Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  // "-৳ 1,500.00", not "৳ -1,500.00": the sign leads, as it is read. A
  // no-break space, so a narrow card never leaves "৳" alone on its line.
  return `${rounded < 0 ? "-" : ""}${symbol}\u00A0${groupDigits(Math.abs(rounded), locale)}`;
}

// "+ ৳ 85,000.00" for money in, "− ৳ 52,300.00" for money out, "৳ 0.00" for
// nothing: the explicit sign the dashboards and statements show, with a real
// minus sign and a space, as the design writes it.
export function formatSignedCurrency(amount: number | string, currencyCode: string): string {
  const value = Number(amount);
  const rounded = Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  const unsigned = formatCurrency(Math.abs(rounded), currencyCode);
  if (rounded > 0) return `+ ${unsigned}`;
  if (rounded < 0) return `− ${unsigned}`;
  return unsigned;
}

// Just the symbol, e.g. for an inline prefix inside an amount input --
// callers that need the formatted number too should use formatCurrency().
export function currencySymbol(currencyCode: string): string {
  return CURRENCIES[currencyCode]?.symbol ?? `${currencyCode} `;
}
