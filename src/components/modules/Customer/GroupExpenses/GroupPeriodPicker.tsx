"use client";

import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { groupMonthOf } from "@/lib/customer/groupDisplay";
import { type GroupPeriod, type GroupPeriodKind, PERIOD_LABELS, periodLabel } from "@/lib/customer/groupPeriod";
import { formatDay } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

interface GroupPeriodPickerProps {
  value: GroupPeriod;
  // The page's choices, in order; "custom" adds the month grid.
  options: readonly GroupPeriodKind[];
  today: string;
  startDay: number;
  onChange: (period: GroupPeriod) => void;
  busy?: boolean;
}

// A group page's period (the v7 boards' dropdown): the page's own choices,
// and Custom, a year with its twelve months where one tap picks a month and
// a second picks the run of months between. Months still to come can't be
// picked.
export function GroupPeriodPicker({ value, options, today, startDay, onChange, busy = false }: GroupPeriodPickerProps) {
  const { t, fmt } = useLocale();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(value.kind === "custom");
  const current = groupMonthOf(today, startDay);
  const [year, setYear] = useState(Number((value.kind === "custom" ? value.to : current).slice(0, 4)));
  // The months picked so far: one, or the two ends of a run.
  const [first, setFirst] = useState<string | null>(value.kind === "custom" ? value.from : null);
  const [last, setLast] = useState<string | null>(value.kind === "custom" ? value.to : null);

  function toggle(next: boolean) {
    setOpen(next);
    if (next) {
      setCustom(value.kind === "custom");
      setYear(Number((value.kind === "custom" ? value.to : current).slice(0, 4)));
      setFirst(value.kind === "custom" ? value.from : null);
      setLast(value.kind === "custom" ? value.to : null);
    }
  }

  const pick = (period: GroupPeriod) => {
    setOpen(false);
    onChange(period);
  };

  function tapMonth(key: string) {
    if (!first || (first && last)) {
      setFirst(key);
      setLast(null);
    } else if (key < first) {
      setLast(first);
      setFirst(key);
    } else {
      setLast(key);
    }
  }

  const from = first;
  const to = last ?? first;

  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="menu"
          className={cn(
            "flex h-10 shrink-0 items-center gap-2 rounded-full border bg-surface px-4 text-small font-semibold whitespace-nowrap text-ink transition-opacity",
            open ? "border-emerald" : "border-line-strong",
            busy && "opacity-60",
          )}
        >
          {periodLabel(value, today, startDay, t, fmt)}
          <ChevronDown className="size-3.5 text-ink-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} aria-label={t("Choose period")} className="w-67 max-w-[calc(100vw-32px)] gap-1 rounded-2xl border border-line-card bg-surface p-2 text-ink ring-0">
        <div role="menu" className="flex flex-col gap-0.5">
          {options.map((kind) => {
            const on = kind === "custom" ? custom : !custom && value.kind === kind;
            return (
              <button
                key={kind}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => (kind === "custom" ? setCustom(true) : pick({ kind }))}
                className={cn("flex h-9 items-center gap-2 rounded-lg px-3 text-left text-small transition-colors", on ? "bg-emerald-soft font-semibold text-emerald" : "font-medium text-ink-2 hover:bg-surface-sunken")}
              >
                <span className="flex-1">{kind === "custom" ? t("Custom") : t(PERIOD_LABELS[kind])}</span>
                {on && <Check className="size-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {custom && options.includes("custom") && (
          <div className="mt-1 flex flex-col gap-2.5 border-t border-line pt-2.5">
            <div className="flex items-center justify-between px-1">
              <button type="button" aria-label={t("Previous year")} onClick={() => setYear(year - 1)} className="flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink">
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <span className="text-body font-semibold tabular-nums">{toLocaleDigits(String(year), fmt)}</span>
              <button
                type="button"
                aria-label={t("Next year")}
                disabled={year >= Number(current.slice(0, 4))}
                onClick={() => setYear(year + 1)}
                className="flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-40"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`).map((key) => {
                const ends = key === from || key === to;
                const inside = !!from && !!to && key > from && key < to;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={ends || inside}
                    aria-label={formatDay(`${key}-01`, "MMMM yyyy", fmt)}
                    disabled={key > current}
                    onClick={() => tapMonth(key)}
                    className={cn(
                      "h-9 rounded-lg text-small transition-colors disabled:cursor-not-allowed disabled:opacity-35",
                      ends ? "bg-emerald font-bold text-white" : inside ? "bg-emerald-soft font-semibold text-emerald" : "border border-line font-medium text-ink-2 hover:border-input",
                    )}
                  >
                    {formatDay(`${key}-01`, "MMM", fmt)}
                  </button>
                );
              })}
            </div>
            <p className="px-1 text-caption text-ink-muted">{t("Tap one month, or a second month to pick a range.")}</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFirst(null);
                  setLast(null);
                }}
              >
                {t("Clear")}
              </Button>
              <Button size="sm" disabled={!from} onClick={() => from && to && pick({ kind: "custom", from, to })}>
                {t("Done")}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
