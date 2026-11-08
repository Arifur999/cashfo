"use client";

import { Trash2 } from "lucide-react";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import type { TodoCategory } from "@/lib/customer/api";
import { dayText } from "@/lib/customer/habitDisplay";
import { type BoardTask, categoryOf, listName, sortTasks } from "@/lib/customer/todoBoard";
import { PRIORITY_LABEL } from "@/lib/customer/todoDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PRIORITY_LOOK } from "./todoTone";

// "Delete this task?": the task's words in a box, what goes with it, and
// that Undo brings it back.
export function TodoDeleteDialog({ task, busy, onClose, onConfirm }: { task: BoardTask | null; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  const { t } = useLocale();
  return (
    <PopupDialog
      open={task !== null}
      onClose={onClose}
      busy={busy}
      plain
      width={420}
      className="rounded-2xl"
      bodyClassName="gap-3 p-5.5"
      title={
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-expense-soft text-expense-fill">
            <Trash2 className="size-4.75" strokeWidth={2} />
          </span>
          <span className="text-[17px] font-semibold">{t("Delete this task?")}</span>
        </span>
      }
      sub={<span className="block truncate rounded-[10px] border border-line bg-strip px-3 py-2.5 text-body font-semibold text-ink">{task?.item.text}</span>}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="inline-flex h-10 items-center rounded-sm border border-input bg-surface px-4 text-body font-semibold text-ink hover:brightness-97 disabled:opacity-60">
            {t("Cancel")}
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-sm bg-expense-fill px-4 text-body font-semibold text-white hover:brightness-95 disabled:opacity-60">
            {busy && <Loader />}
            {t("Delete task")}
          </button>
        </>
      }
    >
      <p className="text-[13.5px] leading-[1.6] text-ink-soft">{t("It will be removed with its steps and note. You can undo it right after.")}</p>
    </PopupDialog>
  );
}

// "Pull from Someday": the open Someday tasks, each with + Add to put it on
// the day.
export function TodoPullDialog({ day, today, tasks, categories, onClose, onPull }: { day: string | null; today: string; tasks: BoardTask[]; categories: TodoCategory[]; onClose: () => void; onPull: (task: BoardTask) => void }) {
  const { t, fmt } = useLocale();
  const rows = sortTasks(tasks.filter((task) => task.day === null && !task.item.completed));
  const target = day ? (day === today ? `${t("today")}, ${dayText(day, fmt, "full")}` : dayText(day, fmt, "full")) : "";
  return (
    <PopupDialog
      open={day !== null}
      onClose={onClose}
      width={480}
      className="rounded-2xl"
      headClassName="items-center px-5.5 py-4"
      bodyClassName="gap-0 px-0 py-2 [scrollbar-width:thin]"
      footerClassName="px-5.5 py-3"
      title={t("Pull from Someday")}
      sub={t("Add to {day}", { day: target })}
      footer={
        <button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-sm border border-input bg-surface px-4 text-body font-semibold text-ink hover:brightness-97">
          {t("Done")}
        </button>
      }
    >
      {rows.map((task) => {
        const category = categoryOf(task.item, categories);
        return (
          <div key={task.item.id} className="flex items-center gap-3 border-b border-divider px-5.5 py-2.5">
            <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", PRIORITY_LOOK[task.item.priority].dot)} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-body font-medium text-ink">{task.item.text}</span>
              <span className="text-caption text-ink-muted">
                {category ? listName(category, t) : ""} · {t(PRIORITY_LABEL[task.item.priority])}
              </span>
            </span>
            <button type="button" onClick={() => onPull(task)} className="inline-flex h-8 shrink-0 items-center rounded-sm border border-emerald-line bg-emerald-soft px-2.75 text-[12.5px] font-semibold text-emerald hover:brightness-97">
              + {t("Add")}
            </button>
          </div>
        );
      })}
      {rows.length === 0 && <div className="px-5.5 py-7 text-center text-[13.5px] text-ink-muted">{t("Nothing in Someday yet.")}</div>}
    </PopupDialog>
  );
}
