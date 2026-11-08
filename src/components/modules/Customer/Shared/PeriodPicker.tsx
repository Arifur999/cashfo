"use client";

import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
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
import { periodRange, samePeriod, type PickedPeriod } from "@/lib/customer/period";
import { formatDay } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { type FormatLocale, langOf } from "@/lib/i18n/formatPrefs";
import { plural, type Translate } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type Tab = "month" | "year" | "custom";

const TABS: { value: Tab; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
];

const ALL_MODES: Tab[] = ["month", "year", "custom"];

const key = (year: number, month: number) => year * 12 + month;

// "Sep", or "সেপ্টে".
const shortMonth = (month: number, locale: FormatLocale) =>
  new Intl.DateTimeFormat(langOf(locale) === "bn" ? "bn-BD" : "en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2000, month - 1, 1)));

// The button's words: "All time", "October 2026", "Year 2025" or
// "1 Aug 2026 – 28 Oct 2026".
export function periodLabel(period: PickedPeriod, t: Translate, locale: FormatLocale): string {
  if (period.kind === "all") return t("All time");
  if (period.kind === "month") return monthLabel(period.month, period.year, locale);
  if (period.kind === "year") return t("Year {year}", { year: toLocaleDigits(String(period.year), locale) });
  return `${formatDay(period.from, "d MMM yyyy", locale)} – ${formatDay(period.to, "d MMM yyyy", locale)}`;
}

interface PeriodPickerProps {
  period: PickedPeriod;
  // YYYY-MM-DD on the app's calendar.
  today: string;
  // The months that have anything on this page; null when it can't say,
  // and then only months still to come are greyed out.
  activeMonths: ActiveMonth[] | null;
  // "Show all time" at the foot (Balance's pages).
  allowAll?: boolean;
  // The page's own period: the button is outlined while another is shown.
  defaultPeriod?: PickedPeriod;
  onPick: (period: PickedPeriod) => void;
  busy?: boolean;
  align?: "start" | "end";
  // The kinds of period offered, all three unless a page says (Budget
  // Planning: a plan is a month); with one there are no tabs.
  modes?: Tab[];
  // The line under the months when greyed-out ones mean something other
  // than "no data" (an English key).
  greyNote?: string;
  // The colour of a picked choice and of Show / Apply: the app's primary,
  // or the admin panel's forest (its boards pass the picker #0F3F38).
  accent?: "emerald" | "forest";
}

const ACCENT = {
  emerald: { on: "border-emerald text-emerald", outline: "border-emerald", button: "" },
  forest: { on: "border-forest text-forest", outline: "border-forest", button: "bg-forest hover:bg-forest-hover" },
} as const;

// "Choose period" (the canvas's one period picker for every report page): a
// month of a year, a whole year typed or picked, the reader's own days, or
// all time, in one popover under the button. Months with nothing are
// greyed out, so a pick never lands on an empty page.
export function PeriodPicker({ period, today, activeMonths, allowAll = false, defaultPeriod, onPick, busy = false, align = "end", modes = ALL_MODES, greyNote, accent = "emerald" }: PeriodPickerProps) {
  const { t, fmt } = useLocale();
  const current = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const range = periodRange(period);
  const shownYear = period.kind === "month" || period.kind === "year" ? period.year : period.kind === "custom" ? Number(period.to.slice(0, 4)) : null;

  // The years to offer: those with anything, or this year and the two before.
  const have = activeMonths && new Set(activeMonths.map((m) => key(m.year, m.month)));
  const monthsIn = new Map<number, number>();
  for (const m of activeMonths ?? []) monthsIn.set(m.year, (monthsIn.get(m.year) ?? 0) + 1);
  const years = monthsIn.size > 0 ? [...monthsIn.keys()].sort((a, b) => b - a) : [current.year, current.year - 1, current.year - 2];
  const firstYear = shownYear ?? years[0];

  const [open, setOpen] = useState(false);
  // The tab of the period in force, when this page offers it.
  const tabOf = (): Tab => {
    const wanted = period.kind === "year" || period.kind === "custom" ? period.kind : "month";
    return modes.includes(wanted) ? wanted : modes[0];
  };
  const [tab, setTab] = useState<Tab>(tabOf);
  const [monthYear, setMonthYear] = useState(firstYear);
  const [yearInput, setYearInput] = useState("");
  const [yearError, setYearError] = useState<string | null>(null);
  const [from, setFrom] = useState(range.dateFrom ?? `${today.slice(0, 8)}01`);
  const [to, setTo] = useState(range.dateTo ?? today);
  const [rangeError, setRangeError] = useState(false);

  const pick = (next: PickedPeriod) => {
    setOpen(false);
    onPick(next);
  };

  // Each opening starts from the period in force.
  function toggle(next: boolean) {
    setOpen(next);
    if (!next) return;
    setTab(tabOf());
    setMonthYear(firstYear);
    setYearInput("");
    setYearError(null);
    setFrom(range.dateFrom ?? `${today.slice(0, 8)}01`);
    setTo(range.dateTo ?? today);
    setRangeError(false);
  }

  function showYear() {
    if (!yearInput) return setYearError(t("Type a year first."));
    const year = Number(yearInput);
    if (years.includes(year) || (!have && /^\d{4}$/.test(yearInput) && year >= 2000 && year <= 2100)) pick({ kind: "year", year });
    else setYearError(t("No data found for {year}.", { year: toLocaleDigits(yearInput, fmt) }));
  }

  function applyRange() {
    if (!from || !to || from > to) setRangeError(true);
    else pick({ kind: "custom", from, to });
  }

  const tone = ACCENT[accent];
  const choice = (on: boolean) => (on ? cn("border-[1.5px] bg-emerald-soft font-bold", tone.on) : "border border-line bg-surface font-medium text-ink-2 hover:border-input");
  const outlined = open || (defaultPeriod !== undefined && !samePeriod(period, defaultPeriod));
  const yearOptions = years.includes(monthYear) ? years : [...years, monthYear].sort((a, b) => b - a);

  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          className={cn(
            "flex h-11 shrink-0 items-center gap-2 rounded-full border bg-surface px-4 text-body font-semibold whitespace-nowrap text-ink transition-opacity",
            outlined ? tone.outline : "border-input",
            busy && "opacity-60",
          )}
        >
          <CalendarDays className="size-4 text-ink-muted" strokeWidth={2} aria-hidden="true" />
          {periodLabel(period, t, fmt)}
          {open ? <ChevronUp className="size-3.5 text-ink-muted" aria-hidden="true" /> : <ChevronDown className="size-3.5 text-ink-muted" aria-hidden="true" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} sideOffset={8} aria-label={t("Choose period")} className="w-90 max-w-[calc(100vw-32px)] gap-3.5 rounded-2xl border border-line bg-surface p-3.5 text-ink ring-0">
        {modes.length > 1 && <SegmentedControl options={TABS.filter((option) => modes.includes(option.value))} value={tab} onChange={(next) => setTab(next)} label="Period type" variant="pill" stretch />}

        {tab === "month" && (
          <>
            <Field htmlFor="period-year" label={<span className="text-small font-medium text-ink">{t("Year")}</span>}>
              <NativeSelect id="period-year" value={String(monthYear)} onChange={(event) => setMonthYear(Number(event.target.value))} className="font-semibold">
                {yearOptions.map((year) => (
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
                  const off = have ? !have.has(here) : here > key(current.year, current.month);
                  const on = !off && period.kind === "month" && period.month === month && period.year === monthYear;
                  return (
                    <button
                      key={month}
                      type="button"
                      aria-pressed={on}
                      aria-label={monthLabel(month, monthYear, fmt)}
                      disabled={off}
                      onClick={() => pick({ kind: "month", month, year: monthYear })}
                      className={cn("h-10 rounded-field text-small", off ? "cursor-not-allowed border border-dashed border-line bg-strip text-ink-faint" : choice(on))}
                    >
                      {shortMonth(month, fmt)}
                    </button>
                  );
                })}
              </div>
            </div>
            <span className="text-caption text-ink-muted">{have ? t(greyNote ?? "Greyed-out months have no data.") : t("Months after this one are greyed out.")}</span>
          </>
        )}

        {tab === "year" && (
          <>
            <Field htmlFor="period-year-input" label={<span className="text-small font-medium text-ink">{t("Type a year")}</span>} error={yearError ?? undefined}>
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
                  invalid={yearError !== null}
                  onChange={(event) => {
                    setYearInput(event.target.value.replace(/\D/g, "").slice(0, 4));
                    setYearError(null);
                  }}
                  placeholder={t("e.g. {year}", { year: String(current.year - 1) })}
                  frameClassName="min-w-0 flex-1"
                />
                <Button type="submit" className={cn("rounded-full px-4", tone.button)}>
                  {t("Show")}
                </Button>
              </form>
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase">{monthsIn.size > 0 ? t("Years with data") : t("Recent years")}</span>
              {years.map((year) => {
                const on = period.kind === "year" && period.year === year;
                const months = monthsIn.get(year) ?? 0;
                return (
                  <button key={year} type="button" aria-pressed={on} onClick={() => pick({ kind: "year", year })} className={cn("flex h-11 items-center justify-between rounded-field px-3.5", choice(on))}>
                    <span className="text-body font-semibold">{toLocaleDigits(String(year), fmt)}</span>
                    {monthsIn.size > 0 && <span className="text-caption font-normal text-ink-muted">{plural(t, months, "{count} month", "{count} months", undefined, fmt)}</span>}
                  </button>
                );
              })}
            </div>
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
                  max={today}
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
                  max={today}
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
                {t("The “From” date must be on or before the “To” date.")}
              </span>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} className="rounded-full px-4">
                {t("Cancel")}
              </Button>
              <Button onClick={applyRange} className={cn("rounded-full px-4.5", tone.button)}>
                {t("Apply")}
              </Button>
            </div>
          </>
        )}

        {allowAll && (
          <button type="button" aria-pressed={period.kind === "all"} onClick={() => pick({ kind: "all" })} className={cn("h-10 rounded-field text-[13.5px]", choice(period.kind === "all"), "font-semibold")}>
            {t("Show all time")}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
