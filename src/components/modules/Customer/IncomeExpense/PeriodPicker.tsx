"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { monthLabel } from "@/components/modules/Customer/Budget/MonthSwitcher";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ActiveMonth } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { getAppToday } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { type FormatLocale, langOf } from "@/lib/i18n/formatPrefs";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { Period } from "./ieFigures";

type Tab = Period["kind"];

const TABS: { value: Tab; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
];

const key = (year: number, month: number) => year * 12 + month;

// "Sep", or "সেপ্টে".
const shortMonth = (month: number, locale: FormatLocale) =>
  new Intl.DateTimeFormat(langOf(locale) === "bn" ? "bn-BD" : "en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2000, month - 1, 1)));

const dayText = (day: string, locale: FormatLocale) => formatDate(`${day}T00:00:00.000Z`, "d MMM yyyy", locale);

// The button's words: "October 2026", "Year 2025" or "1 Aug 2026 – 28 Oct 2026".
export function periodLabel(period: Period, t: (key: string, values?: Record<string, string>) => string, locale: FormatLocale): string {
  if (period.kind === "month") return monthLabel(period.month, period.year, locale);
  if (period.kind === "year") return t("Year {year}", { year: toLocaleDigits(String(period.year), locale) });
  return `${dayText(period.from, locale)} – ${dayText(period.to, locale)}`;
}

interface PeriodPickerProps {
  period: Period;
  current: { month: number; year: number };
  // The months with any income or expense; null when the backend can't say,
  // and then only months still to come are greyed out.
  activeMonths: ActiveMonth[] | null;
  onPick: (period: Period) => void;
  busy?: boolean;
}

// Overview's period: a month of a year, a whole year, or the reader's own
// days, in one popover under the button (the board's "Choose period").
export function PeriodPicker({ period, current, activeMonths, onPick, busy = false }: PeriodPickerProps) {
  const { t, fmt } = useLocale();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(period.kind);
  const shownYear = period.kind === "custom" ? current.year : period.year;
  const [monthYear, setMonthYear] = useState(shownYear);
  const [yearInput, setYearInput] = useState("");
  const [yearError, setYearError] = useState(false);
  const range = period.kind === "custom" ? period : { from: `${current.year}-${String(current.month).padStart(2, "0")}-01`, to: getAppToday() };
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [rangeError, setRangeError] = useState(false);

  const active = new Set((activeMonths ?? []).map((m) => key(m.year, m.month)));
  // Years with transactions and how many months of each have any, newest first.
  const yearsWithMonths = [...(activeMonths ?? []).reduce((years, m) => years.set(m.year, (years.get(m.year) ?? 0) + 1), new Map<number, number>())].sort((a, b) => b[0] - a[0]);
  const selectYears = [...new Set([current.year, shownYear, ...yearsWithMonths.map(([year]) => year)])].sort((a, b) => b - a);

  const pick = (next: Period) => {
    setOpen(false);
    onPick(next);
  };

  function toggle(next: boolean) {
    setOpen(next);
    if (next) {
      setTab(period.kind);
      setMonthYear(shownYear);
      setYearError(false);
      setRangeError(false);
    }
  }

  function showYear() {
    const year = Number(yearInput);
    const valid = /^\d{4}$/.test(yearInput) && year >= 2000 && year <= 2100;
    if (!valid || (activeMonths !== null && !yearsWithMonths.some(([y]) => y === year))) setYearError(true);
    else pick({ kind: "year", year });
  }

  function applyRange() {
    if (!from || !to || from > to) setRangeError(true);
    else pick({ kind: "custom", from, to });
  }

  const choice = (on: boolean) => (on ? "border-[1.5px] border-emerald bg-emerald-soft font-bold text-emerald" : "border border-line bg-surface font-medium text-ink-2 hover:border-input");

  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          className={cn(
            "flex h-11 shrink-0 items-center gap-2 rounded-full border bg-surface px-4 text-body font-semibold whitespace-nowrap text-ink transition-opacity",
            open ? "border-emerald" : "border-line-strong",
            busy && "opacity-60",
          )}
        >
          {periodLabel(period, t, fmt)}
          {open ? <ChevronUp className="size-3.5 text-ink-muted" aria-hidden="true" /> : <ChevronDown className="size-3.5 text-ink-muted" aria-hidden="true" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} aria-label={t("Choose period")} className="w-90 max-w-[calc(100vw-32px)] gap-3.5 rounded-2xl border border-line-card bg-surface p-3.5 text-ink ring-0">
        <SegmentedControl options={TABS} value={tab} onChange={(next) => setTab(next)} label="Period type" variant="pill" stretch />

        {tab === "month" && (
          <>
            <Field htmlFor="period-year" label={<span className="text-small font-medium text-ink">{t("Year")}</span>}>
              <NativeSelect id="period-year" value={String(monthYear)} onChange={(event) => setMonthYear(Number(event.target.value))} className="font-semibold">
                {selectYears.map((year) => (
                  <option key={year} value={year}>
                    {toLocaleDigits(String(year), fmt)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-small font-medium text-ink">{t("Month")}</span>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const here = key(monthYear, month);
                  const isCurrent = here === key(current.year, current.month);
                  const on = period.kind === "month" && period.month === month && period.year === monthYear;
                  const off = !on && (here > key(current.year, current.month) || (activeMonths !== null && !isCurrent && !active.has(here)));
                  return (
                    <button
                      key={month}
                      type="button"
                      aria-pressed={on}
                      aria-label={monthLabel(month, monthYear, fmt)}
                      disabled={off}
                      onClick={() => pick({ kind: "month", month, year: monthYear })}
                      className={cn("h-10 rounded-[10px] text-small", off ? "cursor-not-allowed border border-dashed border-line bg-strip text-ink-faint" : choice(on))}
                    >
                      {shortMonth(month, fmt)}
                    </button>
                  );
                })}
              </div>
            </div>
            {activeMonths !== null && <span className="text-caption text-ink-muted">{t("Greyed-out months have no transactions.")}</span>}
          </>
        )}

        {tab === "year" && (
          <>
            <Field htmlFor="period-year-input" label={<span className="text-small font-medium text-ink">{t("Type a year")}</span>} error={yearError ? t("No transactions found for {year}.", { year: yearInput || t("that year") }) : undefined}>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  showYear();
                }}
                className="flex gap-2"
              >
                <Input
                  id="period-year-input"
                  inputMode="numeric"
                  maxLength={4}
                  value={yearInput}
                  invalid={yearError}
                  onChange={(event) => {
                    setYearInput(event.target.value.replace(/\D/g, "").slice(0, 4));
                    setYearError(false);
                  }}
                  placeholder={t("e.g. {year}", { year: String(current.year - 1) })}
                  frameClassName="min-w-0 flex-1"
                />
                <Button type="submit" className="rounded-full px-4">
                  {t("Show")}
                </Button>
              </form>
            </Field>
            {yearsWithMonths.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("Years with transactions")}</span>
                {yearsWithMonths.map(([year, months]) => {
                  const on = period.kind === "year" && period.year === year;
                  return (
                    <button key={year} type="button" aria-pressed={on} onClick={() => pick({ kind: "year", year })} className={cn("flex h-11 items-center justify-between rounded-[10px] px-3.5", choice(on))}>
                      <span className="text-body font-semibold">{toLocaleDigits(String(year), fmt)}</span>
                      <span className="text-caption font-normal text-ink-muted">{plural(t, months, "{count} month", "{count} months", undefined, fmt)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "custom" && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Field htmlFor="period-from" label={<span className="text-small font-medium text-ink">{t("From")}</span>}>
                <DayInput
                  id="period-from"
                  size="md"
                  value={from}
                  max={getAppToday()}
                  invalid={rangeError}
                  onChange={(day) => {
                    setFrom(day);
                    setRangeError(false);
                  }}
                />
              </Field>
              <Field htmlFor="period-to" label={<span className="text-small font-medium text-ink">{t("To@@date")}</span>}>
                <DayInput
                  id="period-to"
                  size="md"
                  value={to}
                  max={getAppToday()}
                  invalid={rangeError}
                  onChange={(day) => {
                    setTo(day);
                    setRangeError(false);
                  }}
                />
              </Field>
            </div>
            {rangeError && (
              <span role="alert" className="text-caption text-expense">
                {t("The “From” date must be before the “To” date.")}
              </span>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} className="rounded-full px-4">
                {t("Cancel")}
              </Button>
              <Button onClick={applyRange} className="rounded-full px-4.5">
                {t("Apply")}
              </Button>
            </div>
          </>
        )}

      </PopoverContent>
    </Popover>
  );
}
