"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { goalColor, remainingOf } from "@/lib/customer/savingsDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GoalRing } from "./GoalRing";

export interface GoalOption {
  goal: SavingsGoal;
  // Shown but not pickable (nothing to give, already full, the other side).
  off: boolean;
  // Said instead of where it stands ("Already the To goal").
  note?: string;
}

interface GoalPickerProps {
  // Every goal, so each keeps its list colour.
  goals: SavingsGoal[];
  // The goals the list shows, in order.
  options: GoalOption[];
  value: string;
  onChange: (id: string) => void;
  currency: string;
  id: string;
  // The field's label, which names the button and the list.
  labelId: string;
  disabled?: boolean;
  // What the line under a name says: what a goal has to give (From), or how
  // far along it is (To).
  role?: "from" | "to";
}

// A goal to move money from or to (SavingsTransfer board): its ring, name
// and where it stands. The list shows every open goal, the ones that can't
// be picked here dimmed. Plain buttons (aria-pressed on the chosen one): a
// listbox would need arrow keys.
export function GoalPicker({ goals, options, value, onChange, currency, id, labelId, disabled = false, role = "to" }: GoalPickerProps) {
  const { t, fmt } = useLocale();
  const [open, setOpen] = useState(false);
  const selected = goals.find((goal) => goal.id === value);

  const standing = (goal: SavingsGoal) =>
    role === "from"
      ? t(goal.status === "PAUSED" ? "{amount} saved · paused" : "{amount} saved", { amount: formatCurrency(goal.currentAmount, currency, fmt) })
      : t("{percent}% · {amount} to go", { percent: formatCount(goal.progressPercent, fmt), amount: formatCurrency(remainingOf(goal), currency, fmt) });
  // Decoration: the line under the name already says the percentage.
  const ring = (goal: SavingsGoal, size: 26 | 34) => (
    <span aria-hidden="true" className="shrink-0">
      <GoalRing percent={goal.progressPercent} color={goalColor(goal, goals.indexOf(goal))} size={size} label={`${formatCount(goal.progressPercent, fmt)}%`} />
    </span>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          // The label first, then what is chosen: "From goal, Hajj, 45% ...".
          aria-labelledby={`${labelId} ${id}`}
          disabled={disabled || (options.every((option) => option.off) && !selected)}
          className="flex h-14 w-full items-center gap-2.5 rounded-field border border-input bg-surface px-3 text-left transition-[border-color] disabled:opacity-60 data-open:border-emerald"
        >
          {selected ? (
            <>
              {ring(selected, 34)}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-semibold text-ink">{selected.name}</span>
                <span className="truncate text-caption font-normal text-ink-muted tabular-nums">{standing(selected)}</span>
              </span>
            </>
          ) : (
            <span className="min-w-0 flex-1 truncate text-body text-ink-muted">{options.every((option) => option.off) ? t("No goal to pick") : t("Pick a goal")}</span>
          )}
          <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} aria-labelledby={labelId} className="w-(--radix-popover-trigger-width) gap-0 rounded-[14px] border border-line bg-surface p-1.5 leading-[normal] shadow-overlay ring-0">
        <ul aria-labelledby={labelId} className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
          {options.map(({ goal, off, note }) => {
            const on = goal.id === value;
            return (
              <li key={goal.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={off}
                  onClick={() => {
                    onChange(goal.id);
                    setOpen(false);
                  }}
                  className={cn("flex min-h-12 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50", on && "bg-emerald-soft enabled:hover:bg-emerald-soft")}
                >
                  {ring(goal, 26)}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13.5px] font-semibold text-ink">{goal.name}</span>
                    <span className="truncate text-caption font-normal text-ink-muted tabular-nums">{note ?? standing(goal)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
