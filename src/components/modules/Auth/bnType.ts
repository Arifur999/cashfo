import type { Locale } from "@/lib/i18n/translate";

// The display styles are drawn for Latin: their tight tracking and ~1.1 line
// squeeze Bangla clusters and let the vowel signs of wrapped lines touch, and
// an overline's letter-spacing breaks the headstroke (মাত্রা). In Bangla a
// heading gets normal tracking and a 1.3 line, an overline no tracking.
// Put after the text style in cn(), so they win over it.
export const bnHeading = (locale: Locale) => (locale === "bn" ? "tracking-normal leading-[1.3]" : undefined);

export const bnOverline = (locale: Locale) => (locale === "bn" ? "tracking-normal normal-case" : undefined);
