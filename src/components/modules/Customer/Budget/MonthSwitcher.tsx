"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface MonthSwitcherProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  // A full-width card with 40px arrows, as the phone boards draw it.
  stretch?: boolean;
  className?: string;
}

const format = (locale: "en" | "bn", options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { ...options, timeZone: "UTC" });

// "October 2026", or "অক্টোবর ২০২৬".
export function monthLabel(month: number, year: number, locale: "en" | "bn"): string {
  return format(locale, { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

// "October" alone, or "অক্টোবর".
export function monthOnlyLabel(month: number, locale: "en" | "bn"): string {
  return format(locale, { month: "long" }).format(new Date(Date.UTC(2000, month - 1, 1)));
}

// "‹ October 2026 ›" in the page header of the monthly pages. The month
// is a live region, so a screen reader hears the new one after an arrow.
export function MonthSwitcher({ month, year, onChange, stretch = false, className }: MonthSwitcherProps) {
  const { t, locale } = useLocale();
  const previous = () => (month === 1 ? onChange(12, year - 1) : onChange(month - 1, year));
  const next = () => (month === 12 ? onChange(1, year + 1) : onChange(month + 1, year));
  const arrow = cn("flex items-center justify-center text-ink-2 hover:text-ink", stretch ? "size-10 rounded-md pointer-coarse:size-11" : "h-9.5 w-9 pointer-coarse:w-11");

  return (
    <div className={cn("flex items-center bg-surface", stretch ? "w-full justify-between rounded-md border border-line p-2" : "h-10 rounded-sm border border-input dark:border-line-strong", className)}>
      <button type="button" onClick={previous} aria-label={t("Previous month")} className={arrow}>
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <span aria-live="polite" className={cn("text-center text-body text-ink", stretch ? "font-bold" : "min-w-29 font-semibold")}>
        {monthLabel(month, year, locale)}
      </span>
      <button type="button" onClick={next} aria-label={t("Next month")} className={arrow}>
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
