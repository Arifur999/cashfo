// Counts in the reader's digits: pagers, "Showing 1–20 of 54", list totals.
// Money goes through lib/customer/currency.ts, so only counts and page
// numbers go through here. Plain and isomorphic, so a Server Component and
// the hydrated client print the same "১,২৩৪".
//
// Each takes the reader's language, or their Fmt (formatPrefs.ts) when the
// digits should follow Settings' choice rather than the language.
import { formatNumber } from "@/lib/number";
import { type FormatLocale, writeDigits } from "./formatPrefs";

// A text already formatted in English digits ("1–20", "3/12"), in the
// reader's digits. Everything that is not a digit stays as it is.
export const toLocaleDigits = (text: string, locale: FormatLocale): string => writeDigits(text, locale);

// 1234567 -> "1,234,567" in English and "১,২৩৪,৫৬৭" in Bangla. The grouping
// is formatNumber's en-US one in both, so a count reads the same either way;
// the "Big amounts" choice is about money and leaves counts in threes.
export const formatCount = (value: number, locale: FormatLocale): string => toLocaleDigits(formatNumber(value), locale);
