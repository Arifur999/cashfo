"use client";

import { ArrowRight, Check, ChevronDown, Clock, Flag, Repeat } from "lucide-react";
import { useRef } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { TodoItem, TodoPriority } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { movedLabel, PRIORITIES, PRIORITY_LABEL, repeatLabel } from "@/lib/customer/todoDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The board's colours for each priority: a soft chip, its dot and its ink.
export const PRIORITY_TONE: Record<TodoPriority, { chip: string; dot: string; ink: string; on: string }> = {
  HIGH: { chip: "bg-expense-soft text-expense", dot: "bg-expense-fill", ink: "text-expense", on: "border-expense-fill bg-expense-soft text-expense" },
  MEDIUM: { chip: "bg-warning-soft text-warning", dot: "bg-warning-fill", ink: "text-warning", on: "border-warning-fill bg-warning-soft text-warning" },
  LOW: { chip: "bg-surface-sunken text-ink-2", dot: "bg-ink-muted", ink: "text-ink-2", on: "border-ink-muted bg-surface-sunken text-ink-2" },
};

const FLAG_INK: Record<TodoPriority, string> = { HIGH: "text-expense-fill", MEDIUM: "text-warning-fill", LOW: "text-ink-muted" };

export function PriorityDot({ priority, className }: { priority: TodoPriority; className?: string }) {
  return <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_TONE[priority].dot, className)} />;
}

// "● High" in its soft chip, as a task row shows it.
export function PriorityChip({ priority }: { priority: TodoPriority }) {
  const { t } = useLocale();
  return (
    <span className={cn("flex h-5 items-center gap-1 rounded-full px-2 font-semibold", PRIORITY_TONE[priority].chip)}>
      <PriorityDot priority={priority} />
      {t(PRIORITY_LABEL[priority])}
    </span>
  );
}

interface PriorityMenuProps {
  value: TodoPriority;
  onChange: (priority: TodoPriority) => void;
  // "label": a dot, the word and a chevron (the board's add row); "flag": a
  // square flag button (the Today panel).
  look?: "label" | "flag";
  className?: string;
}

// Picks a new task's priority.
export function PriorityMenu({ value, onChange, look = "label", className }: PriorityMenuProps) {
  const { t } = useLocale();
  const name = `${t("Priority")}: ${t(PRIORITY_LABEL[value])}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={name}
        title={name}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface text-ink hover:bg-surface-sunken data-open:bg-cream",
          look === "label" ? "h-10 gap-2 px-3 text-small font-semibold" : "size-9.5",
          className,
        )}
      >
        {look === "label" ? (
          <>
            <PriorityDot priority={value} className="size-2" />
            {t(PRIORITY_LABEL[value])}
            <ChevronDown className="size-3.5 text-ink-muted" strokeWidth={2.25} aria-hidden="true" />
          </>
        ) : (
          <Flag className={cn("size-4", FLAG_INK[value])} strokeWidth={2.25} aria-hidden="true" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-40 rounded-md border border-line bg-surface p-1.5 shadow-overlay ring-0">
        {PRIORITIES.map((priority) => (
          <DropdownMenuItem key={priority} onSelect={() => onChange(priority)} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 text-small font-medium text-ink focus:bg-cream">
            <PriorityDot priority={priority} className="size-2" />
            <span className="flex-1">{t(PRIORITY_LABEL[priority])}</span>
            {priority === value && <Check className="size-3.5 text-emerald" strokeWidth={2.5} aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TimeButtonProps {
  // "HH:MM", or null for any time.
  value: string | null;
  onChange: (time: string | null) => void;
  className?: string;
}

// "🕒 Time", or the time picked; the browser's own time picker opens.
export function TimeButton({ value, onChange, className }: TimeButtonProps) {
  const { t } = useLocale();
  const picker = useRef<HTMLInputElement>(null);
  function open() {
    try {
      picker.current?.showPicker();
    } catch {
      picker.current?.focus();
    }
  }
  return (
    <span className={cn("relative flex shrink-0", className)}>
      <button type="button" onClick={open} className={cn("flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-small font-semibold hover:bg-surface-sunken", value ? "text-ink tabular-nums" : "text-ink-2")}>
        <Clock className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
        {value ? timeLabel(value, t) : t("Time")}
      </button>
      <input ref={picker} type="time" value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} aria-label={t("Time")} tabIndex={-1} className="pointer-events-none absolute inset-0 opacity-0" />
    </span>
  );
}

interface TaskMetaProps {
  item: TodoItem;
  // The day the task is listed on, to word "Moved from yesterday".
  day: string;
  // "chip": the board's row (priority chip, time, repeat, moved). "plain":
  // the Today panel (a dot and the word, then the time or the move).
  look?: "chip" | "plain";
}

// The line under a task: its priority, time, repeat and where it moved from.
export function TaskMeta({ item, day, look = "chip" }: TaskMetaProps) {
  const { t, locale } = useLocale();
  const moved = item.movedFrom ? movedLabel(item.movedFrom, day, t) : null;
  if (look === "plain") {
    return (
      <span className="flex items-center gap-2 text-caption whitespace-nowrap text-ink-muted">
        <span className={cn("flex items-center gap-1 font-semibold", PRIORITY_TONE[item.priority].ink)}>
          <PriorityDot priority={item.priority} />
          {t(PRIORITY_LABEL[item.priority])}
        </span>
        {moved ? <span className="truncate font-semibold text-warning">{moved}</span> : item.dueTime && <span className="font-medium tabular-nums">{timeLabel(item.dueTime, t)}</span>}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-muted">
      <PriorityChip priority={item.priority} />
      {item.dueTime && (
        <span className="flex items-center gap-1 tabular-nums">
          <Clock className="size-3" aria-hidden="true" />
          {timeLabel(item.dueTime, t)}
        </span>
      )}
      {item.repeat && (
        <span className="flex items-center gap-1">
          <Repeat className="size-3" aria-hidden="true" />
          {repeatLabel(item.repeat, t, locale)}
        </span>
      )}
      {moved && (
        <span className="flex items-center gap-1 font-semibold text-warning">
          <ArrowRight className="size-3" strokeWidth={2.25} aria-hidden="true" />
          {moved}
        </span>
      )}
    </span>
  );
}
