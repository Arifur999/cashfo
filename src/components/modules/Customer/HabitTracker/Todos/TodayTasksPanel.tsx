"use client";

import { ArrowRight, ArrowRightToLine, Check, ListChecks, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/modules/Customer/Shared/ConfirmModal";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import Button from "@/components/smartly/Button";
import ProgressBar from "@/components/smartly/ProgressBar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { TodoItem } from "@/lib/customer/api";
import { addTodoItemAction, createTodoListAction, moveTodoItemToNextDayAction, removeTodoItemAction, updateTodoItemAction } from "@/lib/customer/todosActions";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { formatTodoDate } from "./todoDate";

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
        <PopoverContent align="end" sideOffset={8} className="w-100 gap-0 overflow-hidden rounded-[14px] border border-line bg-surface p-0 shadow-[0_18px_48px_rgba(14,26,22,0.22),0_2px_6px_rgba(14,26,22,0.08)] ring-0">
          <PanelBody sheet={false} onClose={() => onOpenChange(false)} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" showCloseButton={false} className="max-h-[85vh] gap-0 overflow-y-auto rounded-t-[18px] border-0 bg-surface p-0 shadow-[0_-10px_30px_rgba(14,26,22,0.2)]">
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
  const { t } = useLocale();
  const { list, loaded, setList, reload } = useTodayTasks();
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [showDone, setShowDone] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<TodoItem | null>(null);

  const items = list?.items ?? [];
  const openItems = [...items].reverse().filter((i) => !i.completed);
  const doneItems = [...items].reverse().filter((i) => i.completed);
  const today = getAppToday();

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
    if (!value || adding) return;
    setAdding(true);
    try {
      let target = list;
      if (!target) {
        const created = await createTodoListAction(today);
        if (!created.success || !created.data) {
          toast.error(created.message ?? t("Failed to create list"));
          return;
        }
        target = created.data;
        setList(target);
      }
      const result = await addTodoItemAction(target.id, value);
      if (result.success && result.data) {
        setList(result.data);
        setText("");
      } else {
        toast.error(result.message ?? t("Failed to add task"));
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
      else toast.error(result.message ?? t("Failed to update task"));
    });
  }

  function moveToTomorrow(item: TodoItem) {
    if (!list) return;
    void withBusy(item.id, async () => {
      const result = await moveTodoItemToNextDayAction(list.id, item.id);
      if (result.success && result.data) {
        setList(result.data);
        toast.success(t("Moved to next day"));
      } else {
        toast.error(result.message ?? t("Failed to move task"));
      }
    });
  }

  async function moveAllToTomorrow() {
    if (!list) return;
    for (const item of openItems) {
      await moveToTomorrow(item);
    }
    await reload();
  }

  function remove() {
    if (!list || !removeTarget) return;
    const item = removeTarget;
    void withBusy(item.id, async () => {
      const result = await removeTodoItemAction(list.id, item.id);
      setRemoveTarget(null);
      if (result.success && result.data) setList(result.data);
      else toast.error(result.message ?? t("Failed to remove task"));
    });
  }

  const done = items.length - openItems.length;
  const rowH = sheet ? "min-h-15" : "min-h-13.5";
  const btn = sheet ? "size-10" : "size-7.5";

  return (
    <div className="flex flex-col text-ink">
      <div className={cn("flex items-start justify-between gap-3 pl-4.5", sheet ? "p-3 pl-4.5" : "pt-4 pr-3 pb-3")}>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className={cn("font-semibold", sheet ? "text-h3" : "text-title")}>{t("Today’s tasks")}</h2>
          <span className="flex items-center gap-3 text-small text-ink-muted">
            <span className="whitespace-nowrap">
              {formatTodoDate(today)}
              {items.length > 0 && ` · ${done} ${t("of")} ${items.length} ${t("done")}`}
            </span>
            {items.length > 0 && <ProgressBar value={(done / items.length) * 100} size="sm" label={t("Tasks done today")} className="w-22" />}
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label={t("Close")} className={cn("flex shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken", sheet ? "size-11" : "size-8")}>
          <X className="size-4.5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={add} className="flex gap-2 px-4.5 pb-3.5">
        <label htmlFor="today-task-new" className="sr-only">
          {t("New task for today")}
        </label>
        <input
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
        <Button type="submit" size={sheet ? "lg" : "sm"} disabled={!text.trim() || adding} className={cn(sheet && "h-11", "px-4")}>
          <Plus strokeWidth={2.5} className="size-4" />
          {t("Add")}
        </Button>
      </form>

      {items.length > 0 ? (
        <div className="flex flex-col border-t border-surface-sunken">
          <div className="flex items-center gap-2 px-5 pt-3 pb-1 text-caption font-semibold text-ink-muted">
            {t("To do")}
            <span className="rounded-full bg-surface-sunken px-2 text-ink-2 tabular-nums">{openItems.length}</span>
          </div>
          {openItems.map((item) => (
            <div key={item.id} className={cn("flex items-center gap-3 py-2 pr-3 pl-5", rowH)}>
              <button
                type="button"
                role="checkbox"
                aria-checked={false}
                aria-label={item.text}
                disabled={busy.has(item.id)}
                onClick={() => toggle(item)}
                className="size-5 shrink-0 rounded-sm border-[1.5px] border-line-strong bg-surface hover:border-emerald disabled:opacity-50"
              />
              <span className="min-w-0 flex-1 truncate text-body font-medium">{item.text}</span>
              <button type="button" onClick={() => moveToTomorrow(item)} disabled={busy.has(item.id)} aria-label={`${t("Move to next day")}: ${item.text}`} title={t("Move to next day")} className={cn("flex shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken disabled:opacity-50", btn)}>
                <ArrowRightToLine className="size-4" strokeWidth={2.25} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setRemoveTarget(item)} disabled={busy.has(item.id)} aria-label={`${t("Delete")}: ${item.text}`} title={t("Delete")} className={cn("flex shrink-0 items-center justify-center rounded-md text-line-strong hover:bg-surface-sunken hover:text-expense disabled:opacity-50", btn)}>
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {doneItems.length > 0 && (
            <>
              <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-line px-5 pt-3 pb-1">
                <span className="flex items-center gap-2 text-caption font-semibold text-ink-muted">
                  {t("Done")}
                  <span className="rounded-full bg-surface-sunken px-2 text-ink-2 tabular-nums">{doneItems.length}</span>
                </span>
                <button type="button" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)} className="text-small font-semibold text-ink-muted hover:text-ink">
                  {showDone ? t("Hide") : t("Show")}
                </button>
              </div>
              {showDone &&
                doneItems.map((item) => (
                  <div key={item.id} className={cn("flex items-center gap-3 py-1 pr-3 pl-5", sheet ? "min-h-13" : "min-h-10.5")}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={true}
                      aria-label={item.text}
                      disabled={busy.has(item.id)}
                      onClick={() => toggle(item)}
                      className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-emerald text-white disabled:opacity-50"
                    >
                      <Check className="size-3.5" strokeWidth={3.5} aria-hidden="true" />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-body text-ink-muted line-through">{item.text}</span>
                    <button type="button" onClick={() => setRemoveTarget(item)} disabled={busy.has(item.id)} aria-label={`${t("Delete")}: ${item.text}`} title={t("Delete")} className={cn("flex shrink-0 items-center justify-center rounded-md text-line-strong hover:bg-surface-sunken hover:text-expense disabled:opacity-50", btn)}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 border-t border-surface-sunken px-8 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-mint-50 text-emerald">
            <ListChecks className="size-5.5" aria-hidden="true" />
          </span>
          <span className="text-title font-semibold">{loaded ? t("Nothing planned for today") : t("Loading...")}</span>
          <span className="text-small leading-normal text-ink-muted">{t("Type a task above and press Enter. It goes straight onto today's list.")}</span>
        </div>
      )}

      <div className={cn("flex items-center justify-between gap-3 border-t border-line bg-cream px-4.5", sheet ? "pt-3 pb-6" : "py-2.5")}>
        {openItems.length > 0 ? (
          <Button variant="outline" size="sm" onClick={moveAllToTomorrow} className="h-8 px-3">
            <ArrowRightToLine className="size-3.5" strokeWidth={2.25} />
            {t("Move")} {openItems.length} {t("to tomorrow")}
          </Button>
        ) : (
          <span className="text-caption font-normal text-ink-muted">{t("Enter adds · Esc closes")}</span>
        )}
        <Link href={list ? `/habit-tracker/todos/${list.id}` : "/habit-tracker/todos"} onClick={onClose} className="flex items-center gap-1 text-small font-semibold whitespace-nowrap text-emerald hover:text-emerald-hover">
          {list ? t("Open full list") : t("All days")}
          <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>

      <ConfirmModal
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={remove}
        title={t("Delete Task")}
        message={removeTarget ? `${t("Delete")} "${removeTarget.text}"? ${t("This cannot be undone.")}` : ""}
        confirmLabel={t("Delete")}
      />
    </div>
  );
}
