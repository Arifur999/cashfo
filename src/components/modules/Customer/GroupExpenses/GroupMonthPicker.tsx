"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { GroupSettlementRecord } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { closedRecordFor, monthRangeOf } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GroupDialog } from "./GroupDialog";

interface GroupMonthPickerProps {
  name: string;
  currency: string;
  // The month on show, this group month, and the months to choose from.
  value: string;
  current: string;
  months: string[];
  startDay: number;
  history: GroupSettlementRecord[];
  // What was spent in each month.
  spent: Record<string, number>;
  onPick: (key: string) => void;
  busy?: boolean;
}

type MonthState = "closed" | "current" | "open";
const STATE: Record<MonthState, { label: string; cls: string }> = {
  closed: { label: "Closed", cls: "bg-surface-sunken text-ink-soft" },
  open: { label: "Open@@month", cls: "bg-warning-soft text-warning" },
  current: { label: "Current", cls: "bg-success-soft text-tint-green-ink" },
};

// The header's month (the v16 GroupHeader board): a pill with the month and
// its state, opening every month of the group by year, each with what was
// spent in it. Every page that shows a month shows the one picked.
export function GroupMonthPicker({ name, currency, value, current, months, startDay, history, spent, onPick, busy = false }: GroupMonthPickerProps) {
  const { t, fmt } = useLocale();
  const [open, setOpen] = useState(false);
  const stateOf = (key: string): MonthState => (closedRecordFor(history, monthRangeOf(key, startDay)) ? "closed" : key === current ? "current" : "open");
  const state = STATE[stateOf(value)];
  // Newest first, grouped by year.
  const years = [...months]
    .sort()
    .reverse()
    .reduce<{ year: string; months: string[] }[]>((list, key) => {
      const year = key.slice(0, 4);
      const last = list[list.length - 1];
      if (last && last.year === year) last.months.push(key);
      else list.push({ year, months: [key] });
      return list;
    }, []);

  function pick(key: string) {
    setOpen(false);
    if (key !== value) onPick(key);
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("Month: {month}. Change", { month: monthName(value, fmt, "long", true) })}
        onClick={() => setOpen(true)}
        className={cn("flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-surface pr-3 pl-4 text-body font-semibold whitespace-nowrap text-ink transition-colors hover:border-mint-300", open && "border-mint-300", busy && "opacity-60")}
      >
        <CalendarDays className="size-4 text-ink-muted" strokeWidth={2} aria-hidden="true" />
        {monthName(value, fmt, "long", true)}
        <span className={cn("inline-flex h-5.5 items-center rounded-full px-2 text-[11.5px] font-semibold", state.cls)}>{t(state.label)}</span>
        <ChevronDown className="size-3.5 text-ink-muted" strokeWidth={2} aria-hidden="true" />
      </button>
      <GroupDialog
        open={open}
        onClose={() => setOpen(false)}
        width={520}
        title={t("Choose a month")}
        sub={t("Every page of {name} will show the month you pick.", { name })}
        footer={
          <>
            <span className="min-w-0 flex-1 text-caption leading-[1.45] text-ink-muted">{t("Closed months are locked. The admin can reopen one from Settlement.")}</span>
            {value !== current && (
              <button type="button" onClick={() => pick(current)} className="h-10 shrink-0 rounded-full border border-input bg-surface px-4 text-[13.5px] font-semibold text-ink hover:bg-hover">
                {t("Back to this month")}
              </button>
            )}
          </>
        }
      >
        {years.map((year) => (
          <div key={year.year} className="flex flex-col gap-2">
            <span className="text-caption font-semibold tracking-[0.04em] text-ink-muted">{toLocaleDigits(year.year, fmt)}</span>
            <div className="grid grid-cols-3 gap-2">
              {year.months.map((key) => {
                const on = key === value;
                const mark = STATE[stateOf(key)];
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(key)}
                    className={cn("flex min-h-18.5 flex-col items-start gap-1.25 rounded-[12px] px-3 py-2.5 text-left transition-colors hover:border-mint-300", on ? "border-[1.5px] border-emerald bg-emerald-wash" : "border border-line bg-surface")}
                  >
                    <span className={cn("text-body font-semibold", on ? "text-emerald" : "text-ink")}>{monthName(key, fmt, "long")}</span>
                    <span className={cn("inline-flex h-5 items-center rounded-full px-1.75 text-[11px] font-semibold", mark.cls)}>{t(mark.label)}</span>
                    <span className="text-[11.5px] text-ink-muted tabular-nums">{t("Spent {amount}", { amount: formatCurrency(spent[key] ?? 0, currency, fmt) })}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </GroupDialog>
    </>
  );
}
