"use client";

import { monthOnlyLabel } from "@/components/modules/Customer/Budget/MonthSwitcher";
import { isThisMonth } from "@/lib/adminPeriod";
import type { Period } from "@/lib/customer/period";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// How the Dashboard and Analytics boards name a period in a sentence:
// "this month", "in September", "in 2025" or "in this period", and the
// matching "Active in September".
export function usePeriodWords(period: Period, today: string): { inPeriod: string; activeLabel: string } {
  const { translate, locale, fmt } = useLocale();
  if (period.kind === "month") {
    const month = monthOnlyLabel(period.month, fmt);
    return { inPeriod: isThisMonth(period, today) ? translate("this month") : translate("in {month}", { month }), activeLabel: translate("Active in {month}", { month }) };
  }
  if (period.kind === "year") {
    const year = toLocaleDigits(String(period.year), locale);
    return { inPeriod: translate("in {year}", { year }), activeLabel: translate("Active in {year}", { year }) };
  }
  return { inPeriod: translate("in this period"), activeLabel: translate("Active in this period") };
}
