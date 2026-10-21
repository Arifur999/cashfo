"use client";

import { ArrowRight, ArrowRightToLine, Check, ListChecks, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import Button from "@/components/smartly/Button";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import ProgressBar from "@/components/smartly/ProgressBar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { TodoItem, TodoPriority } from "@/lib/customer/api";
import { actionError } from "@/lib/customer/habitDisplay";
import { byPriority, dayLabel, doneOfText } from "@/lib/customer/todoDisplay";
import { addTodoItemAction, createTodoListAction, moveTodoItemToNextDayAction, removeTodoItemAction, updateTodoItemAction } from "@/lib/customer/todosActions";
import { getAppToday } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CloseButton } from "../Tracker/PanelParts";
import { PriorityMenu, TaskMeta } from "./TaskBits";

interface TodayTasksPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The button that opens it (the top bar's Today's tasks).
  children: React.ReactNode;
}

// Today's to-do list, right under its icon on desktop and up from the
// bottom on phones. The same list as /habit-tracker/todos; adding the first
// task creates today's list on the way.
export function TodayTasksPanel({ open, onOpenChange, children }: TodayTasksPanelProps) {
  const wide = useMediaQuery("(min-width: 768px)");
  const { t } = useLocale();

  if (wide) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="w-100 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-lg border border-line bg-surface p-0 shadow-overlay ring-0">
          <PanelBody sheet={false} onClose={() => onOpenChange(false)} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" showCloseButton={false} className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-xl border-0 bg-surface p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{t("Today’s tasks")}</SheetTitle>
        </SheetHeader>
        <span aria-hidden="true" className="mt-2 block h-1 w-10 shrink-0 self-center rounded-full bg-line-strong" />
        <PanelBody sheet onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({ sheet, onClose }: { sheet: boolean; onClose: () => void }) {
  const { t, locale } = useLocale();
  const { list, loaded, setList, reload } = useTodayTasks();
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("MEDIUM");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [showDone, setShowDone] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<TodoItem | null>(null);

  const items = list?.items ?? [];
  const openItems = byPriority(items.filter((i) => !i.completed));
  const doneItems = [...items].reverse().filter((i) => i.completed);
  const today = getAppToday();
  const movingAll = busy.has("all");

  function withBusy<T>(id: string, work: () => Promise<T>) {
    setBusy((prev) => new Set(prev).add(id));
    return work().finally(() =>
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
    );
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (adding) return;
    // Add stays live, as the board draws it; with nothing typed it sends
    // you back to the field.
    if (!value) {
      inputRef.current?.focus();
      return;
    }
    setAdding(true);
    try {
      let target = list;
      if (!target) {
        const created = await createTodoListAction(today);
        if (!created.success || !created.data) {
          toast.error(actionError(created.message, "Failed to create list", t, locale));
          return;
        }
        target = created.data;
        setList(target);
      }
      const result = await addTodoItemAction(target.id, { text: value, priority });
      if (result.success && result.data) {
        setList(result.data);
        setText("");
      } else {
        toast.error(actionError(result.message, "Failed to add task", t, locale));
      }
    } finally {
      setAdding(false);
    }
  }

  function toggle(item: TodoItem) {
    if (!list) return;
    void withBusy(item.id, async () => {
      const result = await updateTodoItemAction(list.id, item.id, { completed: !item.completed });
      if (result.success && result.data) setList(result.data);
      else toast.error(actionError(result.message, "Failed to update task", t, locale));
    });
  }

  // One move; true once it landed. quiet: the caller says how many moved.
  function moveToTomorrow(item: TodoItem, quiet = false): Promise<boolean> {
    const current = list;
    if (!current) return Promise.resolve(false);
    return withBusy(item.id, async () => {
      const result = await moveTodoItemToNextDayAction(current.id, item.id);
      if (result.success && result.data) {
        setList(result.data);
        if (!quiet) toast.success(t("Moved to next day"));
        return true;
      }
      toast.error(actionError(result.message, "Failed to move task", t, locale));
      return false;
    });
  }

  // One after another, as the board does it, then one word for them all.
  function moveAllToTomorrow() {
    if (!list || movingAll) return;
    const moving = openItems;
    void withBusy("all", async () => {
      let moved = 0;
      for (const item of moving) if (await moveToTomorrow(item, true)) moved++;
      if (moved > 0) toast.success(t(moved === 1 ? "{count} task moved to tomorrow" : "{count} tasks moved to tomorrow", { count: formatCount(moved, locale) }));
      await reload();
    });
  }

  function remove() {
    if (!list || !removeTarget) return;
    const item = removeTarget;
    void withBusy(item.id, async () => {
      const result = await removeTodoItemAction(list.id, item.id);
      setRemoveTarget(null);
      if (result.success && result.data) setList(result.data);
      else toast.error(actionError(result.message, "Failed to remove task", t, locale));
    });
  }

  const done = items.length - openItems.length;
  // From a habits page the link opens the whole list; from anywhere else it
  // says where it goes; with nothing today it offers the other days.
  const inHabits = usePathname().startsWith("/habit-tracker");
  const fullLink = items.length === 0 ? "All days" : inHabits ? "Open full list" : "Open in Habits";
  const rowH = sheet ? "min-h-15" : "min-h-13.5";
  const btn = cn("flex shrink-0 items-center justify-center rounded-md hover:bg-surface-sunken disabled:opacity-50 pointer-coarse:size-11", sheet ? "size-10" : "size-7.5");
  // The box is 20px; its hit area reaches 44px.
  const box = "relative flex size-5 shrink-0 items-center justify-center rounded-sm after:absolute after:-inset-3 disabled:opacity-50";

  return (
    <div className="flex flex-col text-ink">
      <div className={cn("flex items-start justify-between gap-3 pl-4.5", sheet ? "p-3 pl-4.5" : "pt-4 pr-3 pb-3")}>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className={cn("font-semibold", sheet ? "text-h3" : "text-title leading-[normal]")}>{t("Today’s tasks")}</h2>
          <span className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted", !sheet && "leading-[normal]")}>
            <span className="whitespace-nowrap">{[dayLabel(today, locale), items.length > 0 ? doneOfText(done, items.length, t, locale) : null].filter(Boolean).join(" · ")}</span>
            {items.length > 0 && <ProgressBar value={(done / items.length) * 100} size="sm" label={t("Tasks done today")} className="w-22" />}
          </span>
        </div>
        <CloseButton onClick={onClose} label={t("Close")} className={cn(sheet && "size-11")} />
      </div>

      <form onSubmit={add} className="flex gap-2 px-4.5 pb-3.5">
        <label htmlFor="today-task-new" className="sr-only">
          {t("New task for today")}
        </label>
        <input
          ref={inputRef}
          id="today-task-new"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={200}
          autoFocus
          placeholder={t("Add a task for today…")}
          className={cn(
            "min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-3 text-ink outline-none placeholder:text-ink-faint focus:border-emerald focus:shadow-[0_0_0_3px_var(--mint-50)]",
            sheet ? "h-11 text-body-lg" : "h-9.5 text-body",
          )}
        />
        <PriorityMenu value={priority} onChange={setPriority} look="flag" className={cn(sheet && "size-11")} />
        <Button type="submit" size={sheet ? "lg" : "sm"} disabled={adding} className={cn(sheet ? "h-11" : "h-9.5 text-body", "px-4")}>
          <Plus strokeWidth={2.5} className={sheet ? "size-4" : "size-3.75"} />
          {t("Add")}
        </Button>
      </form>

      {items.length > 0 ? (
        <div className="flex flex-col border-t border-divider">
          <div className="flex items-center gap-2 px-5 pt-3 pb-1 text-caption font-semibold text-ink-muted">
            {t("To do")}
            <span className="rounded-full bg-surface-sunken px-2 text-ink-2 tabular-nums">{formatCount(openItems.length, locale)}</span>
          </div>
          {openItems.map((item) => (
            <div key={item.id} className={cn("flex items-center gap-3 py-2 pr-3 pl-5", rowH)}>
              {/* The words tick the task too, not only its box. */}
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <button type="button" role="checkbox" aria-checked={false} aria-label={item.text} disabled={busy.has(item.id)} onClick={() => toggle(item)} className={cn(box, "border-[1.5px] border-line-strong bg-surface hover:border-emerald")} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                  <span className="truncate text-body font-medium">{item.text}</span>
                  <TaskMeta item={item} day={today} look="plain" />
                </span>
              </label>
              <button type="button" onClick={() => void moveToTomorrow(item)} disabled={busy.has(item.id) || movingAll} aria-label={`${t("Move to next day")}: ${item.text}`} title={t("Move to next day")} className={cn(btn, "text-ink-muted")}>
                <ArrowRightToLine className="size-4" strokeWidth={2.25} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setRemoveTarget(item)} disabled={busy.has(item.id) || movingAll} aria-label={`${t("Delete")}: ${item.text}`} title={t("Delete")} className={cn(btn, "text-line-strong hover:text-expense")}>
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {doneItems.length > 0 && (
            <>
              <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-line px-5 pt-3 pb-1">
                <span className="flex items-center gap-2 text-caption font-semibold text-ink-muted">
                  {t("Done")}
                  <span className="rounded-full bg-surface-sunken px-2 text-ink-2 tabular-nums">{formatCount(doneItems.length, locale)}</span>
                </span>
                <button type="button" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)} className="flex min-h-8 items-center text-small font-semibold text-ink-muted hover:text-ink pointer-coarse:min-h-11">
                  {showDone ? t("Hide") : t("Show")}
                </button>
              </div>
              {showDone &&
                doneItems.map((item) => (
                  <div key={item.id} className={cn("flex items-center gap-3 py-1 pr-3 pl-5", sheet ? "min-h-13" : "min-h-10.5")}>
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <button type="button" role="checkbox" aria-checked={true} aria-label={item.text} disabled={busy.has(item.id)} onClick={() => toggle(item)} className={cn(box, "bg-emerald text-on-action")}>
                        <Check className="size-3.5" strokeWidth={3.5} aria-hidden="true" />
                      </button>
                      <span className="min-w-0 flex-1 truncate text-body text-ink-muted line-through">{item.text}</span>
                    </label>
                    <button type="button" onClick={() => setRemoveTarget(item)} disabled={busy.has(item.id)} aria-label={`${t("Delete")}: ${item.text}`} title={t("Delete")} className={cn(btn, "text-line-strong hover:text-expense")}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 border-t border-divider px-8 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-mint-50 text-emerald">
            <ListChecks className="size-5.5" aria-hidden="true" />
          </span>
          <span className={cn("text-title font-semibold", !sheet && "leading-[normal]")}>{loaded ? t("Nothing planned for today") : t("Loading...")}</span>
          <span className="text-small leading-normal text-ink-muted">{t("Type a task above and press Enter. It goes straight onto today's list.")}</span>
        </div>
      )}

      <div className={cn("flex items-center justify-between gap-3 border-t border-line bg-strip px-4.5", sheet ? "pt-3 pb-6" : "py-2.5")}>
        {openItems.length > 0 ? (
          <Button variant="outline" size="sm" onClick={moveAllToTomorrow} disabled={movingAll} className="h-8 px-3 pointer-coarse:h-11">
            <ArrowRightToLine className="size-3.5" strokeWidth={2.25} />
            {t("Move {count} to tomorrow", { count: formatCount(openItems.length, locale) })}
          </Button>
        ) : (
          // A keyboard's hint, so not on a touch screen.
          <span className="text-caption leading-[normal] font-normal text-ink-muted pointer-coarse:invisible">{t("Enter adds · Esc closes")}</span>
        )}
        <Link href="/habit-tracker/todos" onClick={onClose} className={cn("flex items-center gap-1 text-small font-semibold whitespace-nowrap text-emerald hover:text-emerald-hover pointer-coarse:min-h-11", !sheet && "leading-[normal]")}>
          {t(fullLink)}
          <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={remove}
        isPending={removeTarget !== null && busy.has(removeTarget.id)}
        title={t("Delete task")}
        description={removeTarget ? t("Delete \"{name}\"? This cannot be undone.", { name: removeTarget.text }) : ""}
        confirmLabel={t("Delete")}
      />
    </div>
  );
}
