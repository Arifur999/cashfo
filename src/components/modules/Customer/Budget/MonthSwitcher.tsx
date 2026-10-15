"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface MonthSwitcherProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

export function monthLabel(month: number, year: number, locale: "en" | "bn"): string {
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

// "‹ October 2026 ›" in the page header of the monthly pages.
export function MonthSwitcher({ month, year, onChange }: MonthSwitcherProps) {
  const { t, locale } = useLocale();
  const previous = () => (month === 1 ? onChange(12, year - 1) : onChange(month - 1, year));
  const next = () => (month === 12 ? onChange(1, year + 1) : onChange(month + 1, year));

  return (
    <div className="flex h-10 items-center rounded-md border border-line-strong bg-surface">
      <button type="button" onClick={previous} aria-label={t("Previous month")} className="flex h-9.5 w-9 items-center justify-center text-ink-2 hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <span className="min-w-29 text-center text-body font-semibold text-ink">{monthLabel(month, year, locale)}</span>
      <button type="button" onClick={next} aria-label={t("Next month")} className="flex h-9.5 w-9 items-center justify-center text-ink-2 hover:text-ink">
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
