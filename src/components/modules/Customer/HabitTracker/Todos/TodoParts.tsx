"use client";

import { Check, ChevronDown } from "lucide-react";
import { timeLabel } from "@/lib/customer/date";
import { timeChoices } from "@/lib/customer/todoBoard";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The board's small pieces, shared by the day list, the week and the popup.

// A task's round-cornered tick box: 22px on a row, 18px on a week card and a
// step. `pop` plays the tick's pop as it is ticked.
export function TaskCheck({ checked, label, onClick, size = "md", pop = false, disabled }: { checked: boolean; label: string; onClick: () => void; size?: "md" | "sm"; pop?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex shrink-0 items-center justify-center transition-[transform,background-color,border-color] after:absolute after:-inset-2 hover:scale-108 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald disabled:cursor-default disabled:hover:scale-100",
        size === "md" ? "size-5.5 rounded-[7px]" : "size-4.5 rounded-[6px]",
        checked ? "bg-emerald text-on-action" : "border-[1.5px] border-line-strong bg-surface",
        pop && "todo-pop",
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn(size === "md" ? "size-3.25" : "size-2.75", !checked && "invisible")}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </button>
  );
}

// A row's little pill (priority, day, time, list, repeat, steps, note, moved).
export function Chip({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn("inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-1.75 text-[11.5px] leading-[normal] font-semibold whitespace-nowrap [&_svg]:size-2.75", className)} {...props}>
      {children}
    </span>
  );
}

// The 32px select the quick add uses (priority, time, list), with a dot or
// an icon on its left and the board's chevron on its right.
export function SmallSelect({ value, onChange, label, lead, width, children, muted = false, className }: { value: string; onChange: (value: string) => void; label: string; lead?: React.ReactNode; width: string; children: React.ReactNode; muted?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex h-8 shrink-0 items-center rounded-sm border border-line bg-surface hover:border-input focus-within:border-emerald", width, className)}>
      {lead && <span className="pointer-events-none absolute left-2.5 flex items-center text-ink-muted">{lead}</span>}
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} title={label} className={cn("h-full w-full cursor-pointer appearance-none bg-transparent pr-6 pl-6 text-[12.5px] font-semibold outline-none", muted ? "text-ink-faint" : "text-ink-2")}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3 text-ink-muted" strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

// A task's time: every 15 minutes, by part of the day ("5:00 pm"), or none.
export function TimeOptions({ value, none }: { value: string | null; none: string }) {
  const { t, fmt } = useLocale();
  return (
    <>
      <option value="">{none}</option>
      {timeChoices(value).map((group) => (
        <optgroup key={group.label} label={t(group.label)}>
          {group.times.map((time) => (
            <option key={time} value={time}>
              {timeLabel(time, t, fmt)}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

// A date picker hidden over something that looks like a button: the
// browser's own calendar opens on click.
export function DateOverlay({ value, label, onPick, className }: { value: string; label: string; onPick: (day: string) => void; className?: string }) {
  return (
    <input
      type="date"
      value={value}
      aria-label={label}
      title={label}
      onChange={(event) => event.target.value && onPick(event.target.value)}
      onClick={(event) => {
        try {
          event.currentTarget.showPicker();
        } catch {
          // An older browser opens it its own way.
        }
      }}
      className={cn("absolute inset-0 size-full cursor-pointer opacity-0", className)}
    />
  );
}

// The 8px bar of a day's or a week's progress.
export function ProgressLine({ pct, label, done = false, className }: { pct: number; label: string; done?: boolean; className?: string }) {
  return (
    <span role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label} className={cn("block h-2 w-27.5 overflow-hidden rounded-full bg-surface-sunken", className)}>
      <span className={cn("block h-full rounded-full transition-[width] duration-300", done ? "bg-success" : "bg-emerald")} style={{ width: `${pct}%` }} />
    </span>
  );
}

// A small check in a menu item or a chosen option.
export const Ticked = () => <Check className="size-3.5 text-emerald" strokeWidth={2.5} aria-hidden="true" />;
