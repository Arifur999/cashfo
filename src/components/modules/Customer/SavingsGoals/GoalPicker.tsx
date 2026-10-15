"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { goalColor, remainingOf } from "@/lib/customer/savingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GoalRing } from "./GoalRing";

interface GoalPickerProps {
  // Every goal, so each keeps its list colour; `options` are the ones on offer.
  goals: SavingsGoal[];
  options: SavingsGoal[];
  value: string;
  onChange: (id: string) => void;
  currency: string;
  id?: string;
  disabled?: boolean;
}

// A goal to move money from or to: its ring, name and where it stands.
export function GoalPicker({ goals, options, value, onChange, currency, id, disabled = false }: GoalPickerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const selected = options.find((goal) => goal.id === value);

  const standing = (goal: SavingsGoal) => (goal.status === "PAUSED" ? `${formatCurrency(goal.currentAmount, currency)} ${t("saved")} · ${t("paused")}` : `${goal.progressPercent}% · ${formatCurrency(remainingOf(goal), currency)} ${t("to go")}`);
  const ring = (goal: SavingsGoal) => <GoalRing percent={goal.progressPercent} color={goalColor(goals.indexOf(goal), goal.status)} size={34} label={`${goal.progressPercent}%`} />;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled || options.length === 0}
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
      <PopoverContent align="start" sideOffset={6} className="w-(--radix-popover-trigger-width) gap-0 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
        <ul role="listbox" aria-labelledby={listId} className="flex max-h-72 flex-col overflow-y-auto">
          {options.map((goal) => {
            const on = goal.id === value;
            return (
              <li key={goal.id} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(goal.id);
                    setOpen(false);
                  }}
                  className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-cream", on && "bg-mint-50")}
                >
                  {ring(goal)}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-semibold text-ink">{goal.name}</span>
                    <span className="truncate text-caption font-normal text-ink-muted tabular-nums">{standing(goal)}</span>
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
