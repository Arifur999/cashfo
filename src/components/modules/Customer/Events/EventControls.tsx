"use client";

import { cn } from "@/lib/utils";

// The board's two-way choice on a grey track ("I'm invited" / "My own
// event", "I gave" / "I received"): the picked half is a white raised tab.
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-[14px] bg-page p-1">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={cn("h-10 rounded-[11px] text-body font-semibold", on ? "bg-surface text-ink shadow-[0_1px_3px_rgba(18,32,29,0.12)]" : "text-ink-muted hover:text-ink")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// A whole-row switch with its icon and words (Remind me a day before).
export function Switch({ checked, onChange, icon, label, disabled = false }: { checked: boolean; onChange: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className="flex items-center gap-2.5 rounded-[12px] border border-line-card bg-surface px-3.5 py-3 text-left text-body text-ink hover:bg-row-hover disabled:opacity-60"
    >
      {icon}
      <span className="flex-1">{label}</span>
      <span aria-hidden="true" className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-input")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left]", checked ? "left-4.5" : "left-0.5")} />
      </span>
    </button>
  );
}
