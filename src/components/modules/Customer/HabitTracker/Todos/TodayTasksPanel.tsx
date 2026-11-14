"use client";

import { ArrowRight, ArrowRightToLine, Check, ListChecks, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
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
import { iconActionClass } from "@/components/smartly/IconAction";
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
        {/* The AppTopbar board hangs it 6px under the button, 150px past its right edge. */}
        <PopoverContent align="end" alignOffset={-150} sideOffset={6} className="relative w-100 max-w-[calc(100vw-32px)] gap-0 rounded-[14px] border border-line bg-surface p-0 shadow-[0_18px_30px_rgba(18,32,29,0.16)] ring-0">
          <div className="relative overflow-hidden rounded-[14px]">
            <PanelBody sheet={false} onClose={() => onOpenChange(false)} />
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" showCloseButton={false} className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-[18px] border-0 bg-surface p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{t("Today’s tasks")}</SheetTitle>
        </SheetHeader>
        <span aria-hidden="true" className="mt-2 block h-1 w-10 shrink-0 self-center rounded-full bg-input" />
        <PanelBody sheet onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({ sheet, onClose }: { sheet: boolean; onClose: () => void }) {
  const { t, fmt } = useLocale();
  const { list, loaded, setList, reload } = useTodayTasks();
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("MEDIUM");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [showDone, setShowDone] = useState(true);
  // The task whose delete is being asked about, in its own row.
  const [removeId, setRemoveId] = useState<string | null>(null);

  const items = list?.items ?? [];
  const openItems = byPriority(items.filter((i) => !i.completed));
  const doneItems = byPriority(items.filter((i) => i.completed));
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
          toast.error(actionError(created.message, "Failed to create list", t, fmt));
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
        toast.error(actionError(result.message, "Failed to add task", t, fmt));
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
      else toast.error(actionError(result.message, "Failed to update task", t, fmt));
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
        if (!quiet) toast.success(t("Moved to tomorrow"));
        return true;
      }
      toast.error(actionError(result.message, "Failed to move task", t, fmt));
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
      if (moved > 0) toast.success(t(moved === 1 ? "{count} task moved to tomorrow" : "{count} tasks moved to tomorrow", { count: formatCount(moved, fmt) }));
      await reload();
    });
  }

  function remove(item: TodoItem) {
    if (!list) return;
    void withBusy(item.id, async () => {
      const result = await removeTodoItemAction(list.id, item.id);
      setRemoveId(null);
      if (result.success && result.data) setList(result.data);
      else toast.error(actionError(result.message, "Failed to remove task", t, fmt));
    });
  }

  const done = items.length - openItems.length;
  // In Money Tracker the link says where the full list lives; in Habit
  // Tracker it opens it, or with nothing today offers the other days.
  const inHabits = usePathname().startsWith("/habit-tracker");
  const fullLink = !inHabits ? "Open in Habit Tracker" : items.length === 0 ? "All days" : "Open full list";
  const rowH = sheet ? "min-h-15" : "min-h-13.5";
  const doneRowH = sheet ? "min-h-13" : "min-h-10.5";
  // The board's small row actions (.sm-act): 30px here, 40px in the sheet.
  const btn = (tone: "default" | "danger") => cn(iconActionClass(tone), sheet ? "size-10" : "size-7.5");
  // The box is 20px; its hit area reaches 44px.
  const box = "relative flex size-5 shrink-0 items-center justify-center rounded-[6px] after:absolute after:-inset-3 disabled:opacity-50";
  const groupHead = "flex items-center gap-2 text-[11.5px] leading-[normal] font-semibold tracking-[0.04em] text-ink-muted uppercase";
  const groupCount = "rounded-full bg-surface-sunken px-1.75 tracking-normal text-ink-soft tabular-nums";

  // Delete asks first, inside the row: the row turns into the question.
  const confirmRow = (item: TodoItem, height: string) => (
    <div key={item.id} role="group" aria-label={`${t("Delete this task?")} ${item.text}`} className={cn("flex items-center gap-2 bg-expense-soft py-1.5 pr-3 pl-4.5", height)}>
      <span className="min-w-0 flex-1 truncate text-body font-medium text-expense">{t("Delete this task?")}</span>
      <button type="button" autoFocus onClick={() => setRemoveId(null)} disabled={busy.has(item.id)} className="flex h-8 shrink-0 items-center rounded-sm border border-line bg-surface px-2.5 text-[12.5px] font-semibold text-ink-2 hover:bg-surface-sunken disabled:opacity-50 pointer-coarse:h-11">
        {t("Cancel")}
      </button>
      <button type="button" onClick={() => remove(item)} disabled={busy.has(item.id)} aria-label={`${t("Delete")}: ${item.text}`} className="flex h-8 shrink-0 items-center gap-1.5 rounded-sm bg-expense-fill px-2.5 text-[12.5px] font-semibold text-white hover:bg-expense disabled:opacity-50 pointer-coarse:h-11">
        <Trash2 className="size-3.5" aria-hidden="true" />
        {t("Delete")}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col text-ink">
      <div className={cn("flex items-start justify-between gap-3 pl-4.5", sheet ? "p-3 pl-4.5" : "pt-4 pr-3 pb-3")}>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className={cn("font-semibold", sheet ? "text-h3" : "text-title leading-[normal]")}>{t("Today’s tasks")}</h2>
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] leading-[normal] text-ink-muted">
            <span className="whitespace-nowrap">{[dayLabel(today, fmt), items.length > 0 ? doneOfText(done, items.length, t, fmt) : null].filter(Boolean).join(" · ")}</span>
            {items.length > 0 && <ProgressBar value={(done / items.length) * 100} size="sm" label={t("Tasks done today")} className="w-22" />}
          </span>
        </div>
        <CloseButton onClick={onClose} label={t("Close")} className={cn("rounded-sm", sheet ? "size-11" : "size-8")} />
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
            "min-w-0 flex-1 rounded-sm border border-input bg-surface px-3 text-ink outline-none placeholder:text-ink-faint focus:border-emerald focus:focus-halo",
            sheet ? "h-11 text-body-lg" : "h-9.5 text-body pointer-coarse:h-11",
          )}
        />
        <PriorityMenu value={priority} onChange={setPriority} look="flag" className={cn(sheet && "size-11")} />
        <button type="submit" disabled={adding} className={cn("flex shrink-0 items-center gap-1.5 rounded-sm bg-primary px-4 text-body font-semibold text-primary-foreground transition-colors hover:bg-emerald-hover disabled:opacity-50", sheet ? "h-11" : "h-9.5 pointer-coarse:h-11")}>
          <Plus strokeWidth={2.5} className="size-3.75" aria-hidden="true" />
          {t("Add")}
        </button>
      </form>

      {items.length > 0 ? (
        <div className="flex flex-col border-t border-divider">
          <div className={cn(groupHead, "px-4.5 pt-2.5 pb-1")}>
            {t("To do")}
            <span className={groupCount}>{formatCount(openItems.length, fmt)}</span>
          </div>
          {openItems.map((item) =>
            removeId === item.id ? (
              confirmRow(item, rowH)
            ) : (
              <div key={item.id} className={cn("flex items-center gap-2.5 py-1.5 pr-3 pl-4.5", rowH)}>
                {/* The words tick the task too, not only its box. */}
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                  <button type="button" role="checkbox" aria-checked={false} aria-label={item.text} disabled={busy.has(item.id)} onClick={() => toggle(item)} className={cn(box, "border-[1.5px] border-line-strong bg-surface hover:border-emerald")} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                    <span className="truncate text-body font-medium">{item.text}</span>
                    <TaskMeta item={item} day={today} look="plain" />
                  </span>
                </label>
                <button type="button" onClick={() => void moveToTomorrow(item)} disabled={busy.has(item.id) || movingAll} aria-label={`${t("Move to tomorrow")}: ${item.text}`} title={t("Move to tomorrow")} className={btn("default")}>
                  <ArrowRightToLine strokeWidth={2.25} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setRemoveId(item.id)} disabled={busy.has(item.id) || movingAll} aria-label={`${t("Delete")}: ${item.text}`} title={t("Delete")} className={btn("danger")}>
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            ),
          )}
          {doneItems.length > 0 && (
            <>
              <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-strip px-4.5 pt-2.5 pb-1">
                <span className={groupHead}>
                  {t("Done")}
                  <span className={groupCount}>{formatCount(doneItems.length, fmt)}</span>
                </span>
                <button type="button" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)} className="relative flex items-center text-[12.5px] leading-[normal] font-semibold text-ink-muted after:absolute after:-inset-x-2 after:-inset-y-3.5 hover:text-ink">
                  {showDone ? t("Hide") : t("Show")}
                </button>
              </div>
              {showDone &&
                doneItems.map((item) =>
                  removeId === item.id ? (
                    confirmRow(item, doneRowH)
                  ) : (
                    <div key={item.id} className={cn("flex items-center gap-2.5 py-1 pr-3 pl-4.5", doneRowH)}>
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                        <button type="button" role="checkbox" aria-checked={true} aria-label={item.text} disabled={busy.has(item.id)} onClick={() => toggle(item)} className={cn(box, "bg-emerald text-on-action")}>
                          <Check className="size-3.25" strokeWidth={3.5} aria-hidden="true" />
                        </button>
                        <span className="min-w-0 flex-1 truncate text-body text-ink-faint line-through">{item.text}</span>
                      </label>
                      <button type="button" onClick={() => setRemoveId(item.id)} disabled={busy.has(item.id)} aria-label={`${t("Delete")}: ${item.text}`} title={t("Delete")} className={btn("danger")}>
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  ),
                )}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 border-t border-divider px-7 pt-5.5 pb-6.5 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-mint-50 text-emerald">
            <ListChecks className="size-5.5" aria-hidden="true" />
          </span>
          <span className="text-[15px] leading-[normal] font-semibold">{loaded ? t("Nothing planned for today") : t("Loading...")}</span>
          {loaded && <span className="text-small leading-normal text-ink-muted">{t("Type a task above and press Enter. It goes straight onto today's list.")}</span>}
        </div>
      )}

      <div className={cn("flex items-center justify-between gap-2.5 border-t border-line bg-strip px-4.5", sheet ? "pt-3 pb-6" : "py-2.5")}>
        {openItems.length > 0 ? (
          <button type="button" onClick={moveAllToTomorrow} disabled={movingAll} className="relative flex h-8 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 text-[12.5px] font-semibold whitespace-nowrap text-ink-2 transition-colors after:absolute after:-inset-y-1.5 after:inset-x-0 hover:bg-surface-sunken hover:text-ink disabled:opacity-50">
            <ArrowRightToLine className="size-3.5 text-ink-soft" strokeWidth={2.25} aria-hidden="true" />
            {t("Move {count} to tomorrow", { count: formatCount(openItems.length, fmt) })}
          </button>
        ) : (
          // A keyboard's hint, so not on a touch screen.
          <span className="text-caption leading-[normal] font-normal text-ink-muted pointer-coarse:invisible">{t("Enter adds · Esc closes")}</span>
        )}
        <Link href="/habit-tracker/todos" onClick={onClose} className="flex items-center gap-1.25 text-small leading-[normal] font-semibold whitespace-nowrap text-emerald hover:text-emerald-hover pointer-coarse:min-h-11">
          {t(fullLink)}
          <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
