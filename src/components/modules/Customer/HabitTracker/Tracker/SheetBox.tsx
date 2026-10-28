"use client";

import { Check, CheckCheck, Clock3, X } from "lucide-react";
import { cn } from "@/lib/utils";

// done is a plain tick (Ramadan, challenges); a Namaz box says how the
// prayer was prayed: with jama'at, on time, or as qaza. A missed prayer
// carries a cross; notDone is the same red box left blank (a Ramadan day).
export type BoxState = "done" | "jamaat" | "onTime" | "qaza" | "missed" | "notDone" | "open" | "locked";

// Each state's look, shared by the boxes and the legends that explain them,
// so the two can't drift apart. A miss is the expense red everywhere.
const LOOK: Record<BoxState, string> = {
  done: "bg-emerald text-on-action",
  jamaat: "bg-emerald text-on-action",
  onTime: "bg-emerald-tint text-emerald",
  qaza: "bg-warning-soft text-warning",
  missed: "bg-expense-soft text-expense",
  notDone: "bg-expense-soft",
  open: "border-[1.5px] border-dashed border-emerald bg-surface",
  locked: "border border-divider bg-strip",
};

const HOVER: Partial<Record<BoxState, string>> = {
  done: "hover:bg-emerald-hover",
  jamaat: "hover:bg-emerald-hover",
  open: "hover:bg-mint-50",
};

function BoxIcon({ state, small = false }: { state: BoxState; small?: boolean }) {
  const size = small ? "size-3" : "size-3.5";
  if (state === "done" || state === "onTime") return <Check className={size} strokeWidth={3} aria-hidden="true" />;
  if (state === "jamaat") return <CheckCheck className={size} strokeWidth={2.75} aria-hidden="true" />;
  if (state === "qaza") return <Clock3 className={size} strokeWidth={2.5} aria-hidden="true" />;
  if (state === "missed") return <X className={small ? "size-2.5" : "size-3"} strokeWidth={3} aria-hidden="true" />;
  return null;
}

interface SheetBoxProps {
  state: BoxState;
  label: string;
  disabled?: boolean;
  onToggle: () => void;
  // A sheet is one Tab stop: only its current box takes Tab (0), the rest
  // are reached with the arrow keys (-1). See useRovingGrid.
  tabIndex?: number;
  onFocus?: () => void;
  ref?: React.Ref<HTMLButtonElement>;
}

// One 27px box of a month sheet: ticked (or how a prayer was prayed),
// missed, still open today, or not reached yet. Shared by the Namaz and
// Ramadan sheets.
export function SheetBox({ state, label, disabled = false, onToggle, tabIndex, onFocus, ref }: SheetBoxProps) {
  return (
    <button
      ref={ref}
      type="button"
      role="gridcell"
      aria-label={label}
      title={label}
      disabled={disabled}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onClick={onToggle}
      className={cn("flex size-6.75 shrink-0 items-center justify-center rounded-[6px] transition-colors", LOOK[state], !disabled && HOVER[state], state === "locked" && "cursor-not-allowed")}
    >
      <BoxIcon state={state} />
    </button>
  );
}

// A legend's sample of a state: the same box, smaller and still.
export function BoxSwatch({ state }: { state: BoxState }) {
  return (
    <span aria-hidden="true" className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-[5px]", LOOK[state])}>
      <BoxIcon state={state} small />
    </span>
  );
}

interface DayTotalProps {
  // null when the day has not come.
  count: number | null;
  of: number;
  open?: boolean;
  title: string;
  // The count as the reader writes it.
  label?: string;
}

// The count along the bottom of a sheet: green when the day was full,
// quiet when one short, red when more was missed.
export function DayTotal({ count, of, open = false, title, label }: DayTotalProps) {
  return (
    <span title={count === null ? "" : title} className={cn("flex h-5.5 w-6.75 shrink-0 items-center justify-center rounded-[5px] text-[11.5px] font-bold tabular-nums", count === null ? "text-transparent" : open ? "bg-surface-sunken text-ink-2" : count === of ? "bg-mint-50 text-brand-ink" : count >= of - 1 ? "bg-surface-sunken text-ink-2" : "bg-expense-soft text-expense")}>
      {count === null ? "" : (label ?? count)}
    </span>
  );
}
