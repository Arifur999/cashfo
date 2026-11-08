"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Chip, { type ChipTone } from "@/components/smartly/Chip";
import { formatCurrency } from "@/lib/customer/currency";
import { monthName } from "@/lib/customer/insights";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../Shared/PopupDialog";

export interface GroupMonthChoice {
  // The month on show, and today's group month ("YYYY-MM").
  key: string;
  current: string;
  // Every month the group has, newest first.
  months: string[];
  isClosed: (key: string) => boolean;
  // What each month spent; null while it isn't known.
  spent: Record<string, number> | null;
  currency: string;
  onPick: (key: string) => void;
  busy?: boolean;
}

type MonthState = "closed" | "current" | "open";
const STATE: Record<MonthState, { label: string; tone: ChipTone }> = {
  closed: { label: "Closed", tone: "neutral" },
  open: { label: "Open", tone: "warning" },
  current: { label: "Current", tone: "income" },
};

// The GroupHeader board's month picker: the month on show with whether it
// is closed, open or the current one, and a popup of every month of the
// group by year, each with its state and what it spent. Every page of the
// group follows the month picked (it travels in the address as ?month=).
export function GroupMonthPicker({ groupName, choice }: { groupName: string; choice: GroupMonthChoice }) {
  const { t, fmt } = useLocale();
  const [open, setOpen] = useState(false);
  const stateOf = (key: string): MonthState => (choice.isClosed(key) ? "closed" : key === choice.current ? "current" : "open");
  const shown = STATE[stateOf(choice.key)];
  const label = monthName(choice.key, fmt, "long", true);
  const pick = (key: string) => {
    setOpen(false);
    if (key !== choice.key) choice.onPick(key);
  };

  // Newest year first, its months newest first.
  const years: { year: string; months: string[] }[] = [];
  for (const key of choice.months) {
    const year = key.slice(0, 4);
    const last = years[years.length - 1];
    if (last?.year === year) last.months.push(key);
    else years.push({ year, months: [key] });
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("Month shown: {month}. Change month", { month: label })}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 shrink-0 items-center gap-2 rounded-full border bg-surface pr-3 pl-4 text-body font-semibold whitespace-nowrap text-ink transition-[border-color,background-color,opacity] hover:border-mint-200 hover:bg-strip",
          open ? "border-emerald" : "border-line-strong",
          choice.busy && "opacity-60",
        )}
      >
        <CalendarDays className="size-4 text-ink-muted" aria-hidden="true" />
        {label}
        <Chip tone={shown.tone} size="sm" className="h-5.5 px-2 text-[11.5px]">
          {t(shown.label)}
        </Chip>
        <ChevronDown className="size-3.5 text-ink-muted" aria-hidden="true" />
      </button>

      <PopupDialog
        open={open}
        onClose={() => setOpen(false)}
        width={520}
        title={t("Choose a month")}
        sub={t("Every page of {group} will show the month you pick.", { group: groupName })}
        bodyClassName="gap-4"
        footerClassName="justify-between"
        footer={
          <>
            <span className="flex-1 text-caption leading-[1.45] text-ink-muted">{t("Closed months keep the figures they were closed with.")}</span>
            {choice.key !== choice.current && (
              <Button variant="secondary" onClick={() => pick(choice.current)}>
                {t("Back to this month")}
              </Button>
            )}
          </>
        }
      >
        {years.map(({ year, months }) => (
          <div key={year} className="flex flex-col gap-2">
            <span className="text-[12px] font-semibold tracking-[0.04em] text-ink-muted">{toLocaleDigits(year, fmt)}</span>
            <div className="grid grid-cols-3 gap-2">
              {months.map((key) => {
                const on = key === choice.key;
                const state = STATE[stateOf(key)];
                const spent = choice.spent ? (choice.spent[key] ?? 0) : null;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(key)}
                    className={cn(
                      "flex min-h-18.5 flex-col items-start gap-1.25 rounded-xl px-3 py-2.5 text-left transition-colors",
                      on ? "border-[1.5px] border-emerald bg-emerald-soft" : "border border-line bg-surface hover:border-mint-200",
                    )}
                  >
                    <span className={cn("text-body font-semibold", on ? "text-emerald" : "text-ink")}>{monthName(key, fmt, "long", false)}</span>
                    <Chip tone={state.tone} size="sm" className="h-5 px-1.75 text-[11px]">
                      {t(state.label)}
                    </Chip>
                    {spent !== null && <span className="text-[11.5px] text-ink-muted tabular-nums">{t("Spent {amount}", { amount: formatCurrency(spent, choice.currency, fmt) })}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </PopupDialog>
    </>
  );
}
