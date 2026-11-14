"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const shiftDay = (iso: string, days: number) => {
  const date = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};
const shiftMonth = (ym: string, months: number) => {
  const date = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + months, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
};
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DayButtonProps {
  // "YYYY-MM-DD"; "" shows the placeholder.
  value: string;
  onChange: (day: string) => void;
  today: string;
  // The days that can be picked, inclusive.
  min?: string;
  max?: string;
  // Quick picks under the month (Today, Yesterday, 2 days ago).
  quick?: boolean;
  labelledBy?: string;
  placeholder?: string;
  // The plan form's compact field: the day in one line, no weekday or tile.
  compact?: boolean;
  className?: string;
}

// The Savings boards' date field: the day in words with its weekday and a
// Today or Yesterday pill, and a month calendar under it.
export function DayButton({ value, onChange, today, min, max, quick = false, labelledBy, placeholder = "", compact = false, className }: DayButtonProps) {
  const { t, fmt } = useLocale();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value || today).slice(0, 7));
  const yesterday = shiftDay(today, -1);
  const pill = value === today ? t("Today") : value === yesterday ? t("Yesterday") : "";

  const year = +month.slice(0, 4);
  const monthIndex = +month.slice(5, 7) - 1;
  const lead = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const days = Array.from({ length }, (_, index) => `${month}-${pad(index + 1)}`);
  const allowed = (day: string) => (!min || day >= min) && (!max || day <= max);
  const noPrev = !!min && month <= min.slice(0, 7);
  const noNext = !!max && month >= max.slice(0, 7);

  const pick = (day: string) => {
    onChange(day);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setMonth((value || (min && min > today ? min : today)).slice(0, 7));
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-labelledby={labelledBy}
          className={cn(
            "flex w-full min-w-0 items-center gap-2.5 rounded-[12px] border-[1.5px] bg-surface text-left",
            compact ? "h-11 px-3" : "h-14 px-3",
            open ? "border-emerald" : "border-line hover:border-input",
            className,
          )}
        >
          {!compact && (
            <span aria-hidden="true" className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-emerald-soft text-emerald">
              <CalendarDays className="size-4.25" strokeWidth={2} />
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className={cn("truncate text-[14px]", value ? "font-semibold text-ink" : "text-ink-faint")}>{value ? formatDay(value, "d MMMM yyyy", fmt) : placeholder}</span>
            {!compact && value && <span className="text-[12px] text-ink-muted">{formatDay(value, "EEEE", fmt)}</span>}
          </span>
          {!compact && pill && <span className="shrink-0 rounded-full bg-emerald-soft px-2.25 py-0.75 text-[11.5px] font-bold text-emerald">{pill}</span>}
          <ChevronDown className={cn("size-4 shrink-0 text-ink-muted transition-transform duration-150", open && "rotate-180")} strokeWidth={2} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} aria-label={t("Pick a date")} className="flex w-75 flex-col gap-2 rounded-[14px] border border-line bg-surface p-3 leading-[normal] shadow-float ring-0">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} disabled={noPrev} aria-label={t("Previous month")} className="flex size-8 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-2 disabled:opacity-40">
            <ChevronLeft className="size-4" strokeWidth={2.25} aria-hidden="true" />
          </button>
          <span className="text-[14px] font-bold text-ink">{formatDay(`${month}-01`, "MMMM yyyy", fmt)}</span>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} disabled={noNext} aria-label={t("Next month")} className="flex size-8 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-2 disabled:opacity-40">
            <ChevronRight className="size-4" strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {WEEK.map((day) => (
            <span key={day} className="flex h-6 items-center justify-center text-[11.5px] font-semibold text-ink-faint">
              {t(day)}
            </span>
          ))}
          {Array.from({ length: lead }, (_, index) => (
            <span key={`lead-${index}`} aria-hidden="true" />
          ))}
          {days.map((day) => {
            const on = day === value;
            const ok = allowed(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => pick(day)}
                disabled={!ok}
                aria-pressed={on}
                aria-label={formatDay(day, "d MMMM yyyy", fmt)}
                className={cn(
                  "h-9 rounded-[9px] p-0 text-[13px] tabular-nums",
                  on ? "bg-emerald font-bold text-white" : ok ? "font-medium text-ink hover:bg-surface-sunken" : "font-medium text-line-strong/50",
                  !on && day === today && "border-[1.5px] border-emerald font-bold",
                )}
              >
                {formatCount(+day.slice(8), fmt)}
              </button>
            );
          })}
        </div>
        {quick && (
          <div className="flex gap-1.5 border-t border-card-rule pt-2.5">
            {[
              { label: t("Today"), day: today },
              { label: t("Yesterday"), day: yesterday },
              { label: t("2 days ago"), day: shiftDay(today, -2) },
            ].map((option) => (
              <button
                key={option.day}
                type="button"
                onClick={() => pick(option.day)}
                className={cn("h-8 flex-1 rounded-full border text-[12.5px] font-semibold", value === option.day ? "border-emerald-line bg-emerald-soft text-emerald" : "border-line bg-surface text-ink-2 hover:border-input")}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
