"use client";

import { useMemo } from "react";
import { clockText, whenText } from "@/lib/customer/eventsDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The words every part of Calendar & Events writes, in the reader's
// language, digits and date style: money from paisa, a day, a time, "In 5
// days".
export function useEventWords(currency: string) {
  const { t, fmt } = useLocale();
  return useMemo(() => {
    const count = (value: number) => formatCount(value, fmt);
    return {
      t,
      fmt,
      count,
      money: (paisa: number) => formatCurrency(paisa / 100, currency, fmt),
      // "Sat, 7 Nov 2026" (withYear) or "Sat, 7 Nov".
      day: (day: string, withYear = true) => formatDay(day, withYear ? "EEE, d MMM yyyy" : "EEE, d MMM", fmt),
      weekday: (day: string) => formatDay(day, "EEE", fmt),
      clock: (time: string) => clockText(time, t, (text) => toLocaleDigits(text, fmt)),
      when: (days: number) => whenText(t, days, count),
    };
  }, [t, fmt, currency]);
}

export type EventWords = ReturnType<typeof useEventWords>;
