// Shared money-formatting utility -- every page that shows money goes
// through here, so this is the one place that decides symbol, digit grouping
// and decimal places. A manual symbol map rather than Intl.NumberFormat's
// `style: "currency"`: that API's rendered symbol for BDT varies by
// environment/ICU data (sometimes "BDT", sometimes "৳").
//
// Taka is grouped the South Asian way (lakh/crore: ৳ 12,50,000), other
// currencies the international way. Whole amounts drop the paisa, as the
// design writes money ("৳ 85,000", "৳ 2,699.10"). The grouping locale is
// always explicit, never the machine default, so the server and every
// browser print the same text.
//
// Every formatter takes the reader's language last: a Bangla reader gets
// Bangla digits ("৳ ১২,৫০,০০০"), grouped the same way. Leave it out only
// where the text must stay Latin -- a CSV export, an input's value.
import { toLocaleDigits } from "@/lib/i18n/digits";
import type { Locale } from "@/lib/i18n/translate";

const CURRENCIES: Record<string, { symbol: string; locale: string }> = {
  BDT: { symbol: "৳", locale: "en-IN" },
  USD: { symbol: "$", locale: "en-US" },
};

const formatters = new Map<string, Intl.NumberFormat>();

const groupDigits = (value: number, grouping: string) => {
  const digits = Number.isInteger(value) ? 0 : 2;
  const key = `${grouping}:${digits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(grouping, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    formatters.set(key, formatter);
  }
  return formatter.format(value);
};

export function formatCurrency(amount: number | string, currencyCode: string, locale: Locale = "en"): string {
  const { symbol, locale: grouping } = CURRENCIES[currencyCode] ?? { symbol: currencyCode, locale: "en-US" };
  const value = Number(amount);
  // Rounded to the paisa before the sign is chosen, so a sum that is
  // negative only by float noise (-2.8e-17) prints "৳ 0", not "-৳ 0".
  const rounded = Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  // "-৳ 1,500", not "৳ -1,500": the sign leads, as it is read. A
  // no-break space, so a narrow card never leaves "৳" alone on its line.
  return toLocaleDigits(`${rounded < 0 ? "-" : ""}${symbol} ${groupDigits(Math.abs(rounded), grouping)}`, locale);
}

// "82,000": the figure alone, grouped as its currency is, for a table's
// month cells where the symbol would only repeat (the Reports board).
export function formatGrouped(amount: number | string, currencyCode: string, locale: Locale = "en"): string {
  const { locale: grouping } = CURRENCIES[currencyCode] ?? { locale: "en-US" };
  const value = Number(amount);
  const rounded = Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  return toLocaleDigits(`${rounded < 0 ? "-" : ""}${groupDigits(Math.abs(rounded), grouping)}`, locale);
}

// "+ ৳ 85,000" for money in, "− ৳ 52,300" for money out, "৳ 0" for
// nothing: the explicit sign the dashboards and statements show, with a real
// minus sign and a space, as the design writes it.
export function formatSignedCurrency(amount: number | string, currencyCode: string, locale: Locale = "en"): string {
  const value = Number(amount);
  const rounded = Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
  const unsigned = formatCurrency(Math.abs(rounded), currencyCode, locale);
  if (rounded > 0) return `+ ${unsigned}`;
  if (rounded < 0) return `− ${unsigned}`;
  return unsigned;
}

// The short units of a chart axis: lakh, thousand and crore, in Bangla too.
const COMPACT_UNITS: Record<Locale, { crore: string; lakh: string; thousand: string }> = {
  en: { crore: "Cr", lakh: "L", thousand: "K" },
  bn: { crore: " কো", lakh: " লা", thousand: " হা" },
};

// "1L", "50K", "1.2Cr" ("১ লা", "৫০ হা"): a chart axis label, grouped the
// Bangladeshi way.
export function formatCompactAmount(amount: number, locale: Locale = "en"): string {
  const units = COMPACT_UNITS[locale];
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  const short = (value: number, unit: string) => toLocaleDigits(`${sign}${Number.isInteger(value) ? value : value.toFixed(1).replace(/.0$/, "")}${unit}`, locale);
  if (abs >= 1e7) return short(Math.round((abs / 1e7) * 10) / 10, units.crore);
  if (abs >= 1e5) return short(Math.round((abs / 1e5) * 10) / 10, units.lakh);
  if (abs >= 1e3) return short(Math.round((abs / 1e3) * 10) / 10, units.thousand);
  return toLocaleDigits(`${sign}${Math.round(abs)}`, locale);
}

// Just the symbol, e.g. for an inline prefix inside an amount input --
// callers that need the formatted number too should use formatCurrency().
export function currencySymbol(currencyCode: string): string {
  return CURRENCIES[currencyCode]?.symbol ?? `${currencyCode} `;
}
