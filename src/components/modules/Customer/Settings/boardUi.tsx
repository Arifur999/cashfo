"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The v16 Settings boards' shared pieces (Notifications, Data & privacy).

export const CARD = "min-w-0 rounded-card border border-line-card bg-surface shadow-card";
export const SELECT = "select-chevron h-9 rounded-[10px] border border-input bg-surface pl-2.75 text-[13.5px] text-ink disabled:bg-surface-sunken disabled:text-ink-faint";

// A 38 x 22 track, the emerald when on, an 18px white thumb 2px in.
export function SmallSwitch({ on, label, disabled, title, onClick }: { on: boolean; label: string; disabled?: boolean; title?: string; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} title={title} disabled={disabled} onClick={onClick} className={cn("relative h-5.5 w-9.5 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-55", on ? "bg-primary" : "bg-input")}>
      <span className={cn("absolute top-0.5 left-0.5 size-4.5 rounded-full bg-white shadow-[0_1px_2px_rgba(18,32,29,0.25)] transition-transform", on && "translate-x-4")} />
    </button>
  );
}

// One choice of a few, on a grey pill: the chosen one lifts white.
export function BoardSegment<T extends string>({ value, options, label, disabled, onChange, className }: { value: T; options: { value: T; label: string }[]; label: string; disabled?: boolean; onChange: (value: T) => void; className?: string }) {
  const { t } = useLocale();
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex shrink-0 gap-0.5 self-start rounded-full bg-page p-[3px]", disabled && "opacity-50", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={disabled}
          onClick={() => value !== option.value && onChange(option.value)}
          className={cn("h-8 rounded-full px-3.25 text-small whitespace-nowrap disabled:cursor-not-allowed", value === option.value ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(18,32,29,0.10)] dark:bg-surface-raised" : "font-medium text-ink-2 hover:text-ink")}
        >
          {t(option.label)}
        </button>
      ))}
    </div>
  );
}

// A ticked or empty box in a pill (the sections to export, what AI may read).
export function CheckChip({ on, label, disabled, onClick }: { on: boolean; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={cn("inline-flex h-8.5 items-center gap-1.75 rounded-full border pr-3 pl-2 text-small font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50", on ? "border-primary bg-soft-check text-ink" : "border-input bg-surface text-ink-2")}
    >
      <span aria-hidden="true" className={cn("flex size-4 items-center justify-center rounded-[5px] border-[1.5px]", on ? "border-primary bg-primary text-white" : "border-ink-faint bg-surface")}>
        {on && (
          <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}
