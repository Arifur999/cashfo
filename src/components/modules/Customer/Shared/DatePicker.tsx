"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { weekdayOrder, weekStartOf } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD", same convention as a native <input type="date">; "" means no date picked yet
  onChange: (value: string) => void;
  placeholder?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function ordinal(day: number): string {
  if (day % 10 === 1 && day % 100 !== 11) return `${day}st`;
  if (day % 10 === 2 && day % 100 !== 12) return `${day}nd`;
  if (day % 10 === 3 && day % 100 !== 13) return `${day}rd`;
  return `${day}th`;
}

// Parsed with local Date(year, month, day) rather than `new Date(value)` --
// the latter parses "YYYY-MM-DD" as UTC midnight, which renders as the
// previous day in any timezone behind UTC.
function parseValue(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Exactly as many weeks as the month needs (5 most months, 6 for a long
// month that starts late in the week) rather than always padding to 6 --
// day 0/dayNum>daysInMonth naturally roll into the adjacent month via
// Date's own normalization, so no separate prev/next-month day-count math.
// Weeks start on `weekStart` (0 = Sunday), the reader's first day.
function buildMonthGrid(year: number, month: number, weekStart: number): { date: Date; inMonth: boolean }[] {
  const startWeekday = (new Date(year, month, 1).getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const date = new Date(year, month, i - startWeekday + 1);
    return { date, inMonth: date.getMonth() === month };
  });
}

export function DatePicker({ value, onChange, placeholder = "Select a date" }: DatePickerProps) {
  const { t, fmt } = useLocale();
  // "" (no date picked -- e.g. an optional Reminder Date left blank) must
  // NOT fall through to parseValue()'s Number("") === 0 -- that silently
  // resolves to year 1900, showing a nonsensical default instead of a
  // placeholder.
  const selected = value ? parseValue(value) : null;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState((selected ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState((selected ?? new Date()).getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  // The visible month only needs to track the selected value at the moment
  // the popover opens (e.g. after the modal resets `value` back to today
  // while closed) -- setting it here, in the click handler, means it never
  // needs to re-sync via an effect while the user is navigating months with
  // the popover open. With no value yet, opens on the current month rather
  // than year 1900.
  function openPicker() {
    const base = selected ?? new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function changeMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function pickDay(date: Date) {
    onChange(toValue(date));
    setOpen(false);
  }

  const today = new Date();
  const grid = buildMonthGrid(viewYear, viewMonth, weekStartOf(fmt));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        // The design's control frame (smartly InputFrame): line-strong edge,
        // emerald border and mint ring while focused.
        className="flex h-11 w-full items-center gap-1.5 whitespace-nowrap rounded-field border border-input bg-surface px-3 text-left text-body text-ink outline-none transition-[border-color,box-shadow] focus:border-focus-ring focus:focus-halo"
      >
        <Calendar className="h-4 w-4 shrink-0 text-ink-muted" />
        {selected ? (
          <span>
            {t(MONTH_NAMES[selected.getMonth()])} {toLocaleDigits(ordinal(selected.getDate()), fmt)}, {toLocaleDigits(String(selected.getFullYear()), fmt)}
          </span>
        ) : (
          <span className="text-ink-faint">{t(placeholder)}</span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-64 rounded-2xl border border-line bg-surface p-3 shadow-overlay">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label={t("Previous month")}
              className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-ink">
              {t(MONTH_NAMES[viewMonth])} {toLocaleDigits(String(viewYear), fmt)}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label={t("Next month")}
              className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-medium text-ink-muted">
            {weekdayOrder(fmt).map((d) => (
              <span key={d} className="py-1">
                {t(WEEKDAY_LABELS[d])}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
            {grid.map(({ date, inMonth }) => {
              const isSelected = selected !== null && isSameDay(date, selected);
              const isToday = !isSelected && isSameDay(date, today);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => pickDay(date)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    isSelected
                      ? "bg-emerald font-semibold text-on-action"
                      : isToday
                        ? "ring-1 ring-inset ring-emerald text-ink-2"
                        : inMonth
                          ? "text-ink-2 hover:bg-surface-sunken"
                          : "text-ink-faint hover:bg-hover"
                  }`}
                >
                  {toLocaleDigits(String(date.getDate()), fmt)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
