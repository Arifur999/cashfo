"use client";

import { Check, CheckCheck, Clock3, X } from "lucide-react";
import { cn } from "@/lib/utils";

// done is a plain tick (Ramadan, challenges); a Namaz box says how the
// prayer was prayed: with jama'at, on time, or as qaza.
export type BoxState = "done" | "jamaat" | "onTime" | "qaza" | "missed" | "open" | "locked";

interface SheetBoxProps {
  state: BoxState;
  label: string;
  disabled?: boolean;
  onToggle: () => void;
}

// One 27px box of a month sheet: ticked (or how a prayer was prayed),
// missed, still open today, or not reached yet. Shared by the Namaz and
// Ramadan sheets.
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
        (state === "done" || state === "jamaat") && "bg-emerald text-white hover:bg-emerald-hover",
        state === "onTime" && "bg-emerald-tint text-emerald",
        state === "qaza" && "bg-warning-soft text-warning",
        state === "missed" && "bg-rose-soft text-rose",
        state === "open" && "border-[1.5px] border-dashed border-emerald bg-surface hover:bg-mint-50",
        state === "locked" && "cursor-not-allowed border border-surface-sunken bg-cream",
      )}
    >
      {(state === "done" || state === "onTime") && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
      {state === "jamaat" && <CheckCheck className="size-3.5" strokeWidth={2.75} aria-hidden="true" />}
      {state === "qaza" && <Clock3 className="size-3.5" strokeWidth={2.5} aria-hidden="true" />}
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
