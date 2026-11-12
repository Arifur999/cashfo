"use client";

import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDay } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The Transfers board's form controls (New transfer popup): a 52px box with
// a 32px icon tile, the value over a small line, and a chevron; its edge is
// emerald once something is picked or while it is open.

const TRIGGER = "flex h-13 w-full min-w-0 items-center gap-2.5 rounded-[12px] border-[1.5px] bg-surface px-3 text-left transition-colors disabled:opacity-60";
// A list or calendar opens on the picked row, not with a ring on its first
// button.
const focusPicked = (event: Event) => {
  event.preventDefault();
  const content = event.currentTarget as HTMLElement | null;
  content?.querySelector<HTMLElement>("[aria-selected=true], [aria-pressed=true]")?.focus({ preventScroll: false, focusVisible: false } as FocusOptions);
};
const TILE = "flex size-8 shrink-0 items-center justify-center rounded-[9px] [&_svg]:size-4";

export interface SelectOption {
  value: string;
  name: string;
  // The small line under the name ("Bank account").
  sub?: string;
  // Right-aligned (the balance).
  right?: string;
  icon: React.ReactNode;
  // The tile's colours ("wallet-tile", or a tint and its ink).
  tileClassName: string;
  tileStyle?: React.CSSProperties;
  disabled?: boolean;
}

interface TransferSelectProps {
  labelId: string;
  placeholder: string;
  // The tile shown before anything is picked.
  placeholderIcon: React.ReactNode;
  options: SelectOption[];
  value: string;
  // The line under the picked name ("Balance ৳ 16,790").
  pickedSub?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TransferSelect({ labelId, placeholder, placeholderIcon, options, value, pickedSub, onChange, disabled = false }: TransferSelectProps) {
  const [open, setOpen] = useState(false);
  const picked = options.find((option) => option.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-haspopup="listbox" aria-labelledby={labelId} disabled={disabled} className={cn(TRIGGER, open || picked ? "border-emerald" : "border-line")}>
          <span className={cn(TILE, picked ? picked.tileClassName : "bg-surface-sunken text-ink-faint")} style={picked?.tileStyle}>
            {picked ? picked.icon : placeholderIcon}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            {picked ? (
              <>
                <span className="truncate text-body font-semibold text-ink">{picked.name}</span>
                {pickedSub && <span className="truncate text-[11.5px] text-ink-muted tabular-nums">{pickedSub}</span>}
              </>
            ) : (
              <span className="truncate text-body text-ink-faint">{placeholder}</span>
            )}
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-ink-muted transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} onOpenAutoFocus={focusPicked} className="max-h-70 w-(--radix-popover-trigger-width) min-w-62.5 gap-0 overflow-y-auto rounded-[12px] border border-line bg-surface p-1.5 shadow-[0_16px_36px_-12px_rgba(18,32,29,0.28)] ring-0">
        <div role="listbox" aria-labelledby={labelId} className="flex flex-col">
          {options.map((option) => {
            const on = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={on}
                aria-disabled={option.disabled || undefined}
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn("flex w-full items-center gap-2.5 rounded-[9px] px-2.25 py-1.75 text-left disabled:cursor-not-allowed disabled:opacity-50", on ? "bg-emerald-soft" : "hover:bg-hover")}
              >
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[8px] [&_svg]:size-3.5", option.tileClassName)} style={option.tileStyle}>
                  {option.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-[13.5px] font-semibold text-ink">{option.name}</span>
                  {option.sub && <span className="truncate text-[11.5px] text-ink-muted">{option.sub}</span>}
                </span>
                {option.right && <span className="shrink-0 text-[12.5px] font-semibold text-ink-soft tabular-nums">{option.right}</span>}
                <span className="flex w-4 shrink-0">{on && <Check className="size-4 text-emerald" strokeWidth={3} aria-hidden="true" />}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// "YYYY-MM-DD" days, counted in UTC so no timezone moves them.
const dayOf = (iso: string) => {
  const [year, month, date] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
};
const isoOf = (date: Date) => date.toISOString().slice(0, 10);
export const addDays = (iso: string, days: number): string => isoOf(new Date(dayOf(iso).getTime() + days * 86_400_000));

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SUNDAY_FIRST = [0, 1, 2, 3, 4, 5, 6] as const;

interface TransferDateFieldProps {
  labelId: string;
  value: string;
  // The app's today; later days can't be picked.
  today: string;
  onChange: (day: string) => void;
}

// The day: "12 November 2026 Thursday", a Today / Yesterday pill, and the
// app's own calendar (past days only, with Today, Yesterday and 2 days ago).
export function TransferDateField({ labelId, value, today, onChange }: TransferDateFieldProps) {
  const { t, fmt } = useLocale();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value.slice(0, 7));
  const yesterday = addDays(today, -1);
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const length = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  // Sunday first, as the Transfer board draws it, whatever week start the
  // customer picked in App preferences (this calendar only).
  const order = SUNDAY_FIRST;
  const blanks = order.indexOf(first.getUTCDay() as (typeof order)[number]);
  const atLatest = month >= today.slice(0, 7);
  const shift = (by: number) => setMonth(isoOf(new Date(Date.UTC(year, monthIndex + by, 1))).slice(0, 7));
  const pick = (day: string) => {
    onChange(day);
    setOpen(false);
  };
  const pill = value === today ? t("Today") : value === yesterday ? t("Yesterday") : null;
  const quick: [string, string][] = [
    [t("Today"), today],
    [t("Yesterday"), yesterday],
    [t("2 days ago"), addDays(today, -2)],
  ];

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setMonth(value.slice(0, 7));
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" aria-labelledby={labelId} aria-haspopup="dialog" className={cn(TRIGGER, open ? "border-emerald" : "border-line")}>
          <span className={cn(TILE, "bg-emerald-soft text-emerald")}>
            <Calendar aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            <span className="text-body font-semibold whitespace-nowrap text-ink">{formatDay(value, "d MMMM yyyy", fmt)}</span>
            <span className="truncate text-[12.5px] text-ink-muted">{t(WEEKDAYS[dayOf(value).getUTCDay()])}</span>
          </span>
          {pill && <span className="shrink-0 rounded-full bg-emerald-soft px-2.25 py-0.75 text-[11.5px] font-bold text-emerald">{pill}</span>}
          <ChevronDown className={cn("size-4 shrink-0 text-ink-muted transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} onOpenAutoFocus={focusPicked} aria-label={t("Pick a date")} className="w-75 gap-2.5 rounded-[14px] border border-line bg-surface p-3 shadow-[0_18px_40px_-12px_rgba(18,32,29,0.30)] ring-0">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => shift(-1)} aria-label={t("Previous month")} className="flex size-8 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-2 hover:bg-hover">
            <ChevronLeft className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
          </button>
          <span className="text-body font-bold text-ink">
            {t(MONTHS[monthIndex])} {toLocaleDigits(String(year), fmt)}
          </span>
          <button type="button" onClick={() => shift(1)} disabled={atLatest} aria-label={t("Next month")} className="flex size-8 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-2 hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronRight className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {order.map((weekday) => (
            <span key={weekday} className="flex h-6 items-center justify-center text-[11.5px] font-semibold text-ink-faint">
              {t(WEEKDAYS_SHORT[weekday])}
            </span>
          ))}
          {Array.from({ length: blanks }, (_, index) => (
            <span key={`blank-${index}`} aria-hidden="true" />
          ))}
          {Array.from({ length }, (_, index) => {
            const day = `${month}-${String(index + 1).padStart(2, "0")}`;
            const on = day === value;
            const future = day > today;
            return (
              <button
                key={day}
                type="button"
                disabled={future}
                aria-pressed={on}
                aria-label={formatDay(day, "d MMMM yyyy", fmt)}
                onClick={() => pick(day)}
                className={cn(
                  "h-8.5 rounded-[9px] p-0 text-small tabular-nums",
                  on ? "bg-emerald font-bold text-on-action" : day === today ? "border-[1.5px] border-emerald font-bold text-ink" : "font-medium text-ink hover:bg-hover",
                  future && "cursor-not-allowed text-ink-faint/60 hover:bg-transparent",
                )}
              >
                {toLocaleDigits(String(index + 1), fmt)}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5 border-t border-divider pt-2.5">
          {quick.map(([label, day]) => (
            <button
              key={day}
              type="button"
              onClick={() => pick(day)}
              className={cn("h-8 flex-1 rounded-full border text-[12.5px] font-semibold whitespace-nowrap", day === value ? "border-emerald bg-emerald-soft text-emerald" : "border-line bg-surface text-ink-2 hover:bg-hover")}
            >
              {label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
