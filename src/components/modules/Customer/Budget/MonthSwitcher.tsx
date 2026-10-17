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
}

export function monthLabel(month: number, year: number, locale: "en" | "bn"): string {
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

// "‹ October 2026 ›" in the page header of the monthly pages.
export function MonthSwitcher({ month, year, onChange, stretch = false }: MonthSwitcherProps) {
  const { t, locale } = useLocale();
  const previous = () => (month === 1 ? onChange(12, year - 1) : onChange(month - 1, year));
  const next = () => (month === 12 ? onChange(1, year + 1) : onChange(month + 1, year));
  const arrow = cn("flex items-center justify-center text-ink-2 hover:text-ink", stretch ? "size-10 rounded-md" : "h-9.5 w-9");

  return (
    <div className={cn("flex items-center bg-surface", stretch ? "h-14 w-full justify-between rounded-md border border-line p-2" : "h-10 rounded-md border border-line-strong")}>
      <button type="button" onClick={previous} aria-label={t("Previous month")} className={arrow}>
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <span className={cn("text-center text-body font-semibold text-ink", !stretch && "min-w-29")}>{monthLabel(month, year, locale)}</span>
      <button type="button" onClick={next} aria-label={t("Next month")} className={arrow}>
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
