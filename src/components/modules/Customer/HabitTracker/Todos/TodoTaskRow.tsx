"use client";

import { ArrowRight, CalendarDays, Clock, Copy, Inbox, ListChecks, MoreVertical, Pencil, Repeat, StickyNote, Sun, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { TodoCategory } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { type BoardTask, dayWord, lateChip, listName, movedChip, quickMoves, stepCount } from "@/lib/customer/todoBoard";
import { PRIORITY_LABEL, repeatLabel } from "@/lib/customer/todoDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { Chip, DateOverlay, TaskCheck } from "./TodoParts";
import { LIST_TONE, PRIORITY_LOOK } from "./todoTone";

// Where a row is shown: a day's list, the Overdue band, Someday or search
// results (which name each task's day).
export type RowContext = "day" | "overdue" | "some" | "search";

interface TodoTaskRowProps {
  task: BoardTask;
  context: RowContext;
  category: TodoCategory | null;
  today: string;
  busy: boolean;
  // The tick's pop plays on the task just ticked.
  popping: boolean;
  // A move the server would refuse (a repeating task already on that day) isn't offered.
  canMoveTo: (to: string | null) => boolean;
  onToggle: () => void;
  onOpen: () => void;
  onMove: (to: string | null) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const MOVE_WORDS = {
  today: { label: "Today@@move", tip: "Move to today" },
  tomorrow: { label: "Tomorrow@@move", tip: "Move to tomorrow" },
  next: { label: "Next day", tip: "Move to the next day" },
} as const;

// One task on the board's list: its box, its words (they open it), its
// chips, the one-tap moves and a date to pick (shown on hover, always in
// Someday), and the ⋮ menu.
export function TodoTaskRow({ task, context, category, today, busy, popping, canMoveTo, onToggle, onOpen, onMove, onDuplicate, onDelete }: TodoTaskRowProps) {
  const { t, fmt } = useLocale();
  const { item, day } = task;
  const checked = item.completed;
  const late = lateChip(task, today, t, fmt);
  const dateText = late ?? (context === "search" ? dayWord(day, today, t, fmt) : null);
  const moved = movedChip(item, day, today, t, fmt);
  const steps = stepCount(item);
  const tone = category ? LIST_TONE[category.color] : null;
  const moves = checked ? [] : quickMoves(day, today).filter((move) => canMoveTo(move.to));

  return (
    <div data-done={checked || undefined} className={cn("group/row flex min-h-13.5 items-center gap-3 border-b border-divider py-1.75 pr-3.5 pl-4.5 transition-colors hover:bg-row-hover", busy && "pointer-events-none opacity-60")}>
      <TaskCheck checked={checked} pop={popping} label={checked ? t("Mark as not done") : t("Mark as done")} onClick={onToggle} disabled={busy} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <button type="button" onClick={onOpen} title={t("Open to edit")} className={cn("block max-w-full cursor-pointer truncate text-left text-[14.5px] leading-[normal] font-medium hover:underline hover:underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald", checked ? "text-ink-faint line-through" : "text-ink")}>
          {item.text}
        </button>
        <span className="flex items-center gap-1.5 overflow-hidden text-ink-muted">
          <Chip className={PRIORITY_LOOK[item.priority].chip}>
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", PRIORITY_LOOK[item.priority].dot)} />
            {t(PRIORITY_LABEL[item.priority])}
          </Chip>
          {dateText && (
            <Chip className={late ? "bg-expense-soft text-expense" : "bg-surface-sunken text-ink-2"}>
              <CalendarDays aria-hidden="true" />
              {dateText}
            </Chip>
          )}
          {item.dueTime && (
            <Chip className="bg-surface-sunken text-ink-2 tabular-nums">
              <Clock aria-hidden="true" />
              {timeLabel(item.dueTime, t, fmt)}
            </Chip>
          )}
          {category && tone && (
            <Chip className={tone.chip}>
              <span aria-hidden="true" className={cn("size-1.75 rounded-[2px]", tone.dot)} />
              {listName(category, t)}
            </Chip>
          )}
          {item.repeat && (
            <Chip className="bg-emerald-soft text-emerald">
              <Repeat aria-hidden="true" />
              {repeatLabel(item.repeat, t, fmt)}
            </Chip>
          )}
          {steps.total > 0 && (
            <Chip title={t("Steps")} className={cn("tabular-nums", steps.done === steps.total ? "bg-success-soft text-success-ink" : "bg-tint-indigo text-tint-indigo-ink")}>
              <ListChecks aria-hidden="true" />
              {formatCount(steps.done, fmt)}/{formatCount(steps.total, fmt)}
            </Chip>
          )}
          {item.note && (
            <Chip role="img" aria-label={t("Has a note")} title={t("Has a note")} className="bg-tint-yellow px-1.5 text-tint-yellow-ink">
              <StickyNote aria-hidden="true" />
            </Chip>
          )}
          {moved && (
            <Chip className={moved.strong ? "bg-expense-soft text-expense" : "bg-orange-soft text-orange"}>
              <ArrowRight aria-hidden="true" />
              {moved.text}
            </Chip>
          )}
        </span>
      </span>
      <span className={cn("flex shrink-0 items-center gap-1.5", context !== "some" && "opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100 pointer-coarse:opacity-100")}>
        {moves.map((move) => {
          const words = MOVE_WORDS[move.key];
          return (
            <button key={move.key} type="button" title={t(words.tip)} onClick={() => onMove(move.to)} className="inline-flex h-7.5 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.75 text-[12.5px] font-semibold whitespace-nowrap text-ink-soft hover:brightness-97 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald">
              {move.key === "today" ? <Sun className="size-3.25" strokeWidth={2.25} aria-hidden="true" /> : <ArrowRight className="size-3.25" strokeWidth={2.25} aria-hidden="true" />}
              {t(words.label)}
            </button>
          );
        })}
        {!checked && (
          <span className="relative inline-flex">
            <span aria-hidden="true" className="flex size-7.5 items-center justify-center rounded-sm border border-line bg-surface text-ink-muted">
              <CalendarDays className="size-3.5" strokeWidth={2} />
            </span>
            <DateOverlay value={day ?? ""} label={t("Pick a date")} onPick={(to) => to !== day && canMoveTo(to) && onMove(to)} />
          </span>
        )}
      </span>
      <TaskMenu task={task} today={today} canMoveTo={canMoveTo} onOpen={onOpen} onMove={onMove} onDuplicate={onDuplicate} onDelete={onDelete} />
    </div>
  );
}

// The ⋮ menu: Edit, Duplicate, Move to Someday (or, from Someday, Plan
// for today), Delete.
export function TaskMenu({ task, today, canMoveTo, onOpen, onMove, onDuplicate, onDelete }: { task: BoardTask; today: string; canMoveTo: (to: string | null) => boolean; onOpen: () => void; onMove: (to: string | null) => void; onDuplicate: () => void; onDelete: () => void }) {
  const { t } = useLocale();
  const item = "flex h-9 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 text-[13.5px] font-medium text-ink focus:bg-surface-sunken [&_svg]:size-3.75 pointer-coarse:h-11";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t("More actions")} title={t("More actions")} className="flex size-7.5 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink data-open:bg-surface-sunken pointer-coarse:size-11">
        <MoreVertical className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-55 rounded-xl border border-line bg-surface p-1.5 shadow-overlay ring-0">
        <DropdownMenuItem onSelect={onOpen} className={item}>
          <Pencil aria-hidden="true" />
          {t("Edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate} className={item}>
          <Copy aria-hidden="true" />
          {t("Duplicate")}
        </DropdownMenuItem>
        {task.day !== null ? (
          <DropdownMenuItem onSelect={() => onMove(null)} disabled={!canMoveTo(null)} className={item}>
            <Inbox aria-hidden="true" />
            {t("Move to Someday")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onMove(today)} disabled={!canMoveTo(today)} className={item}>
            <Sun aria-hidden="true" />
            {t("Plan for today")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="mx-0 my-1 bg-divider" />
        <DropdownMenuItem onSelect={onDelete} className={cn(item, "text-expense-fill focus:bg-expense-soft focus:text-expense-fill")}>
          <Trash2 aria-hidden="true" />
          {t("Delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
