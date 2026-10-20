// Counts in the reader's digits: pagers, "Showing 1–20 of 54", list totals.
// Money keeps Latin digits (lib/currency.ts), so only counts and page numbers
// go through here. Plain and isomorphic, so a Server Component and the hydrated
// client print the same "১,২৩৪".
import { formatNumber } from "@/lib/number";
import { toBanglaDigits } from "./banglaDates";
import type { Locale } from "./translate";

// A text already formatted in English digits ("1–20", "3/12"), in the
// reader's digits. Everything that is not a digit stays as it is.
export const toLocaleDigits = (text: string, locale: Locale): string => (locale === "bn" ? toBanglaDigits(text) : text);

// 1234567 -> "1,234,567" in English and "১,২৩৪,৫৬৭" in Bangla. The grouping
// is formatNumber's en-US one in both, so a count reads the same either way.
export const formatCount = (value: number, locale: Locale): string => toLocaleDigits(formatNumber(value), locale);
