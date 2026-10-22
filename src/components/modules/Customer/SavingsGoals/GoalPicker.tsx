"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { goalColor, remainingOf } from "@/lib/customer/savingsDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GoalRing } from "./GoalRing";

interface GoalPickerProps {
  // Every goal: each keeps its list colour, and the chosen one shows even
  // when it is no longer on offer (a swap can bring an empty goal into From).
  goals: SavingsGoal[];
  // The ones that can be picked here.
  options: SavingsGoal[];
  value: string;
  onChange: (id: string) => void;
  currency: string;
  id: string;
  // The field's label, which names the button and the list.
  labelId: string;
  disabled?: boolean;
}

// A goal to move money from or to: its ring, name and where it stands. The
// list is plain buttons (aria-pressed on the chosen one): a listbox would
// need arrow keys, and an option can't hold a button.
export function GoalPicker({ goals, options, value, onChange, currency, id, labelId, disabled = false }: GoalPickerProps) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const selected = goals.find((goal) => goal.id === value);

  const standing = (goal: SavingsGoal) =>
    goal.status === "PAUSED"
      ? t("{amount} saved · paused", { amount: formatCurrency(goal.currentAmount, currency) })
      : t("{percent}% · {amount} to go", { percent: formatCount(goal.progressPercent, locale), amount: formatCurrency(remainingOf(goal), currency) });
  // Decoration: the line under the name already says the percentage.
  const ring = (goal: SavingsGoal) => (
    <span aria-hidden="true" className="shrink-0">
      <GoalRing percent={goal.progressPercent} color={goalColor(goals.indexOf(goal), goal.status)} size={34} label={`${formatCount(goal.progressPercent, locale)}%`} />
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
          disabled={disabled || (options.length === 0 && !selected)}
          className="flex h-14 w-full items-center gap-3 rounded-md border border-line-strong bg-surface px-3 text-left transition-[border-color,box-shadow] disabled:opacity-60 data-open:border-emerald data-open:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]"
        >
          {selected ? (
            <>
              {ring(selected)}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-semibold text-ink">{selected.name}</span>
                <span className="truncate text-caption font-normal text-ink-muted tabular-nums">{standing(selected)}</span>
              </span>
            </>
          ) : (
            <span className="min-w-0 flex-1 truncate text-body text-ink-muted">{options.length === 0 ? t("No goal to pick") : t("Pick a goal")}</span>
          )}
          <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} aria-labelledby={labelId} className="w-(--radix-popover-trigger-width) gap-0 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
        {options.length === 0 ? (
          <p className="px-3 py-2 text-small text-ink-muted">{t("No goal to pick")}</p>
        ) : (
          <ul aria-labelledby={labelId} className="flex max-h-72 flex-col overflow-y-auto">
            {options.map((goal) => {
              const on = goal.id === value;
              return (
                <li key={goal.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      onChange(goal.id);
                      setOpen(false);
                    }}
                    className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-hover pointer-coarse:min-h-11", on && "bg-mint-50")}
                  >
                    {ring(goal)}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body font-semibold text-ink">{goal.name}</span>
                      <span className="truncate text-caption font-normal text-ink-muted tabular-nums">{standing(goal)}</span>
                    </span>
                    {on && <Check className="size-4 shrink-0 text-emerald" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
