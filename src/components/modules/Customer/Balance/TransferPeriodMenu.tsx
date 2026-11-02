"use client";

import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { monthRangeLabel } from "@/lib/customer/balanceDisplay";
import { formatDay } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export type PeriodRange = "all" | "this-month" | "this-year" | "custom";

interface TransferPeriodMenuProps {
  range: PeriodRange;
  start: string | null;
  end: string | null;
  // This month, "2026-11": no later month can be picked.
  thisMonth: string;
  onChange: (range: PeriodRange, start?: string, end?: string | null) => void;
}

const OPTIONS: { value: PeriodRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "this-year", label: "This year" },
  { value: "custom", label: "Custom" },
];

const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

// The Transfers board's period button: All time, This month, This year, or
// Custom, which opens a year of months -- one month, or two for the run
// between them.
export function TransferPeriodMenu({ range, start, end, thisMonth, onChange }: TransferPeriodMenuProps) {
  const { t, fmt } = useLocale();
  const [open, setOpen] = useState(false);
  // The months being picked, applied with Done.
  const [draft, setDraft] = useState<{ start: string; end: string | null }>({ start: start ?? thisMonth, end });
  const [year, setYear] = useState(Number((start ?? thisMonth).slice(0, 4)));
  const [custom, setCustom] = useState(range === "custom");

  const label = range === "custom" && start ? monthRangeLabel(start, end, fmt) : t(OPTIONS.find((option) => option.value === range)?.label ?? "All time");
  const lastYear = Number(thisMonth.slice(0, 4));
  const [first, last] = !draft.end || draft.end >= draft.start ? [draft.start, draft.end ?? draft.start] : [draft.end, draft.start];

  function openChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDraft({ start: start ?? thisMonth, end });
      setYear(Number((start ?? thisMonth).slice(0, 4)));
      setCustom(range === "custom");
    }
  }

  function pick(key: string) {
    // A third pick starts over; a second one before the first swaps them.
    if (draft.end !== null) setDraft({ start: key, end: null });
    else if (key === draft.start) setDraft({ start: key, end: null });
    else setDraft({ start: key < draft.start ? key : draft.start, end: key < draft.start ? draft.start : key });
  }

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger className="flex h-10 min-w-37.5 items-center justify-between gap-2.5 rounded-full border border-input bg-surface px-3.5 text-[13.5px] font-medium whitespace-nowrap text-ink hover:bg-surface-sunken data-[state=open]:border-emerald">
        <span className="flex items-center gap-2">
          <CalendarDays className="size-3.75 text-ink-2" aria-hidden="true" />
          {label}
        </span>
        <ChevronDown className="size-3.5 text-ink-muted" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="flex w-67 flex-col gap-0.5 rounded-[14px] border border-line bg-surface p-2 shadow-overlay ring-0">
        <div role="menu" aria-label={t("Period")} className="flex flex-col gap-0.5">
          {OPTIONS.map((option) => {
            const on = option.value === "custom" ? custom : !custom && option.value === range;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => {
                  if (option.value === "custom") {
                    setCustom(true);
                    return;
                  }
                  setOpen(false);
                  onChange(option.value);
                }}
                className={cn("flex min-h-10 items-center justify-between rounded-lg px-2.5 text-left text-[13.5px] text-ink hover:bg-strip", on ? "bg-mint-50 font-semibold" : "font-medium")}
              >
                {t(option.label)}
                {on && <Check className="size-3.75 text-emerald" strokeWidth={2.75} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {custom && (
          <div className="mt-1.5 flex flex-col gap-2.5 border-t border-divider px-1.5 pt-2.5 pb-1">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setYear(year - 1)} aria-label={t("Previous year")} className="flex size-8 items-center justify-center rounded-full bg-surface-sunken text-ink-2">
                <ChevronLeft className="size-3.75" aria-hidden="true" />
              </button>
              <span className="text-body font-bold text-ink">{toLocaleDigits(String(year), fmt)}</span>
              <button type="button" onClick={() => setYear(year + 1)} disabled={year >= lastYear} aria-label={t("Next year")} className="flex size-8 items-center justify-center rounded-full bg-surface-sunken text-ink-2 disabled:opacity-40">
                <ChevronRight className="size-3.75" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-y-1">
              {Array.from({ length: 12 }, (_, index) => {
                const key = monthKey(year, index + 1);
                const later = key > thisMonth;
                const edge = key === first || key === last;
                const inside = key >= first && key <= last;
                const band = inside && first !== last;
                const column = index % 3;
                return (
                  <span
                    key={key}
                    className={cn(
                      "flex",
                      band && "bg-mint-50",
                      band && (key === first || column === 0) && "rounded-l-full",
                      band && (key === last || column === 2) && "rounded-r-full",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => pick(key)}
                      disabled={later}
                      aria-pressed={inside}
                      className={cn(
                        "h-9 flex-1 rounded-full text-[13px]",
                        later ? "cursor-default text-ink-faint" : edge ? "bg-primary font-semibold text-primary-foreground" : inside ? "font-semibold text-ink" : "font-medium text-ink hover:bg-strip",
                      )}
                    >
                      {formatDay(`${key}-01`, "MMM", fmt)}
                    </button>
                  </span>
                );
              })}
            </div>
            <span className="text-caption text-ink-muted">
              {draft.end === null ? t("Tap one month, or a second month to pick a range.") : t("{months} selected.", { months: monthRangeLabel(draft.start, draft.end, fmt) })}
            </span>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDraft({ start: thisMonth, end: null })} className="h-9 rounded-full px-3 text-small font-semibold text-ink-2 hover:bg-strip">
                {t("Clear")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onChange("custom", first, last === first ? null : last);
                }}
                className="h-9 rounded-full bg-primary px-4 text-small font-semibold text-primary-foreground hover:bg-emerald-hover"
              >
                {t("Done")}
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
