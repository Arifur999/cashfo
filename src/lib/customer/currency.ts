// Shared money-formatting utility -- every page that shows money goes
// through here, so this is the one place that decides symbol, digit grouping
// and decimal places. A manual symbol map rather than Intl.NumberFormat's
// `style: "currency"`: that API's rendered symbol for BDT varies by
// environment/ICU data (sometimes "BDT", sometimes "৳").
//
// Taka is grouped the South Asian way (lakh/crore: Tk 12,50,000), other
// currencies the international way. Whole amounts drop the paisa, as the
// design writes money ("Tk 85,000", "Tk 2,699.10"). The grouping locale is
// always explicit, never the machine default, so the server and every
// browser print the same text.
//
// Every formatter takes the reader's language last: a Bangla reader gets
// taka's sign and Bangla digits ("৳ ১২,৫০,০০০"), grouped the same way, and
// an English reader "Tk" (takaSign). Leave it out only where the text must
// stay Latin -- a CSV export, an input's value. Given the reader's Fmt
// (formatPrefs.ts) instead, the digits and the taka grouping follow
// Settings' "Digits" and "Big amounts": "Tk 1,250,000" in groups of three,
// Bangla digits under an English page.
import { toLocaleDigits } from "@/lib/i18n/digits";
import { type FormatLocale, fmtOf, langOf, takaGroupingLocale, takaSign } from "@/lib/i18n/formatPrefs";

const CURRENCIES: Record<string, { symbol: (locale: FormatLocale) => string; locale: string }> = {
  BDT: { symbol: takaSign, locale: "en-IN" },
  USD: { symbol: () => "$", locale: "en-US" },
};

// The Intl locale a currency is grouped by: taka by the reader's choice
// (lakh unless they chose groups of three), the rest as they always are.
const groupingFor = (currencyCode: string, locale: FormatLocale): string =>
  currencyCode === "BDT" ? takaGroupingLocale(locale) : (CURRENCIES[currencyCode]?.locale ?? "en-US");

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

// The amount as shown: to the paisa, or to the whole taka for a reader who
// asked for that (Settings › App preferences).
const toShown = (value: number, locale: FormatLocale) => {
  if (!Number.isFinite(value)) return 0;
  return fmtOf(locale).round ? Math.round(value) : Math.round(value * 100) / 100;
};

export function formatCurrency(amount: number | string, currencyCode: string, locale: FormatLocale = "en"): string {
  const symbol = CURRENCIES[currencyCode]?.symbol(locale) ?? currencyCode;
  const grouping = groupingFor(currencyCode, locale);
  const value = Number(amount);
  // Rounded to the paisa before the sign is chosen, so a sum that is
  // negative only by float noise (-2.8e-17) prints "Tk 0", not "-Tk 0".
  const rounded = toShown(value, locale);
  // "-Tk 1,500", not "Tk -1,500": the sign leads, as it is read. A
  // no-break space, so a narrow card never leaves "Tk" alone on its line.
  return toLocaleDigits(`${rounded < 0 ? "-" : ""}${symbol} ${groupDigits(Math.abs(rounded), grouping)}`, locale);
}

// "82,000": the figure alone, grouped as its currency is, for a table's
// month cells where the symbol would only repeat (the Reports board).
export function formatGrouped(amount: number | string, currencyCode: string, locale: FormatLocale = "en"): string {
  const grouping = groupingFor(currencyCode, locale);
  const value = Number(amount);
  const rounded = toShown(value, locale);
  return toLocaleDigits(`${rounded < 0 ? "-" : ""}${groupDigits(Math.abs(rounded), grouping)}`, locale);
}

// "+ Tk 85,000" for money in, "− Tk 52,300" for money out, "Tk 0" for
// nothing: the explicit sign the dashboards and statements show, with a real
// minus sign and a space, as the design writes it.
export function formatSignedCurrency(amount: number | string, currencyCode: string, locale: FormatLocale = "en"): string {
  const value = Number(amount);
  const rounded = toShown(value, locale);
  const unsigned = formatCurrency(Math.abs(rounded), currencyCode, locale);
  if (rounded > 0) return `+ ${unsigned}`;
  if (rounded < 0) return `− ${unsigned}`;
  return unsigned;
}

// The short units of a chart axis, largest first: crore, lakh and thousand
// the Bangladeshi way, or billion, million and thousand in groups of three;
// in Bangla too.
const COMPACT_UNITS: Record<"en" | "bn", Record<"lakh" | "international", [number, string][]>> = {
  en: {
    lakh: [[1e7, "Cr"], [1e5, "L"], [1e3, "K"]],
    international: [[1e9, "B"], [1e6, "M"], [1e3, "K"]],
  },
  bn: {
    lakh: [[1e7, " কো"], [1e5, " লা"], [1e3, " হা"]],
    international: [[1e9, " বি"], [1e6, " মি"], [1e3, " হা"]],
  },
};

// "1L", "50K", "1.2Cr" ("১ লা", "৫০ হা"): a chart axis label, grouped the
// Bangladeshi way -- or "100K", "1.2M" for a reader who groups in threes.
export function formatCompactAmount(amount: number, locale: FormatLocale = "en"): string {
  const units = COMPACT_UNITS[langOf(locale)][fmtOf(locale).grouping];
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  const short = (value: number, unit: string) => toLocaleDigits(`${sign}${Number.isInteger(value) ? value : value.toFixed(1).replace(/.0$/, "")}${unit}`, locale);
  for (const [size, unit] of units) if (abs >= size) return short(Math.round((abs / size) * 10) / 10, unit);
  return toLocaleDigits(`${sign}${Math.round(abs)}`, locale);
}

// Just the symbol in the reader's language ("Tk", "৳"), e.g. for an inline
// prefix inside an amount input -- callers that need the formatted number
// too should use formatCurrency().
export function currencySymbol(currencyCode: string, locale: FormatLocale): string {
  return CURRENCIES[currencyCode]?.symbol(locale) ?? `${currencyCode} `;
}
