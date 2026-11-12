"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";

// The Assets popups' fields (44px, 10px corners, the input edge; red when
// wrong, emerald with a halo when focused).
export const FIELD = "h-11 w-full rounded-[10px] border bg-surface px-3 text-[14px] text-ink outline-none transition-[border-color,box-shadow] focus:border-emerald focus:shadow-[0_0_0_3px_rgba(28,117,103,0.15)] disabled:bg-strip";
export const fieldEdge = (wrong: boolean) => (wrong ? "border-expense-fill" : "border-input");
export const LABEL = "text-[14px] font-medium text-ink";
// A native select's text: muted until something is picked.
export const pickedInk = (picked: boolean) => (picked ? "text-ink" : "text-ink-muted");

export function FieldError({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <span id={id} role="alert" className={cn("text-[12.5px] text-loss-ink", className)}>
      {children}
    </span>
  );
}

// The money box: the taka sign before the figure, no divider.
export function MoneyField({ id, symbol, value, onChange, wrong, size = "sm", placeholder = "0", onEnter, describedBy }: { id: string; symbol: string; value: string; onChange: (value: string) => void; wrong: boolean; size?: "sm" | "md"; placeholder?: string; onEnter?: () => void; describedBy?: string }) {
  return (
    <div className={cn("flex items-center rounded-[10px] border bg-surface transition-[border-color,box-shadow] focus-within:border-emerald focus-within:shadow-[0_0_0_3px_rgba(28,117,103,0.15)]", fieldEdge(wrong), size === "md" ? "h-13 gap-2 px-3.5" : "h-11 gap-2 px-3")}>
      <span aria-hidden="true" className={cn("font-semibold text-ink-soft", size === "md" ? "text-[18px]" : "text-[16px]")}>
        {symbol}
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        aria-invalid={wrong || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && onEnter) {
            event.preventDefault();
            onEnter();
          }
        }}
        className={cn("min-w-0 flex-1 border-0 bg-transparent text-ink tabular-nums outline-none placeholder:text-ink-muted", size === "md" ? "text-[20px] font-bold" : "text-[16px] font-semibold")}
      />
    </div>
  );
}

// The two-way pick on a sunken track ("I bought it now" / "I already own it").
export function SourceToggle<T extends string>({ value, options, onChange, label, compact = false }: { value: T; options: { value: T; label: string; sub: string }[]; onChange: (value: T) => void; label: string; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-[12px] bg-surface-sunken p-1">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center justify-center gap-px rounded-[9px] focus-visible:outline-2 focus-visible:outline-(--focus-ring)",
              compact ? "px-1.5 py-2" : "min-h-12 px-3 py-1.5",
              on ? "bg-surface shadow-[0_1px_2px_rgba(18,32,29,0.12)]" : "bg-transparent",
            )}
          >
            <span className={cn("font-semibold", compact ? "text-[13.5px] text-ink" : cn("text-[14px]", on ? "text-ink" : "text-ink-soft"))}>{option.label}</span>
            <span className={cn("text-ink-muted", compact ? "text-[11.5px]" : "text-[12px]")}>{option.sub}</span>
          </button>
        );
      })}
    </div>
  );
}

// The Category board's 44 x 26 switch.
export function BoardSwitch({ on, label, disabled, title, onClick }: { on: boolean; label: string; disabled?: boolean; title?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      className={cn("relative h-6.5 w-11 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-60", on ? "bg-emerald" : "bg-input")}
    >
      <span className={cn("absolute top-0.75 size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(18,32,29,0.25)] transition-[left]", on ? "left-5.25" : "left-0.75")} />
    </button>
  );
}

// A done toast, with Undo for five seconds when there is one.
export function doneToast(message: string, undo?: { label: string; run: () => void }) {
  toast.success(message, undo ? { duration: 5000, action: { label: undo.label, onClick: undo.run } } : undefined);
}
