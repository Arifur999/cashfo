"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type BoxState = "done" | "missed" | "open" | "locked";

interface SheetBoxProps {
  state: BoxState;
  label: string;
  disabled?: boolean;
  onToggle: () => void;
}

// One 27px box of a month sheet: ticked, missed, still open today, or not
// reached yet. Shared by the Namaz and Ramadan sheets.
export function SheetBox({ state, label, disabled = false, onToggle }: SheetBoxProps) {
  return (
    <button
      type="button"
      role="gridcell"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex size-6.75 shrink-0 items-center justify-center rounded-sm transition-colors",
        state === "done" && "bg-emerald text-white hover:bg-emerald-hover",
        state === "missed" && "bg-expense-soft text-expense hover:bg-expense-soft/70",
        state === "open" && "border-[1.5px] border-dashed border-emerald bg-surface hover:bg-mint-50",
        state === "locked" && "cursor-not-allowed border border-surface-sunken bg-cream",
      )}
    >
      {state === "done" && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
      {state === "missed" && <X className="size-3" strokeWidth={3} aria-hidden="true" />}
    </button>
  );
}

interface DayTotalProps {
  // null when the day has not come.
  count: number | null;
  of: number;
  open?: boolean;
  title: string;
}

// The count along the bottom of a sheet: green when the day was full,
// quiet when one short, pink when more was missed.
export function DayTotal({ count, of, open = false, title }: DayTotalProps) {
  return (
    <span title={count === null ? "" : title} className={cn("flex h-5.5 w-6.75 shrink-0 items-center justify-center rounded-[5px] text-caption font-bold tabular-nums", count === null ? "text-transparent" : open ? "bg-surface-sunken text-ink-2" : count === of ? "bg-mint-50 text-emerald" : count >= of - 1 ? "bg-surface-sunken text-ink-2" : "bg-expense-soft text-expense")}>
      {count ?? ""}
    </span>
  );
}
