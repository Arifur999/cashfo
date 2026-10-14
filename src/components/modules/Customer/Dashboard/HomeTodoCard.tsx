"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import Card from "@/components/smartly/Card";
import type { TodoItem } from "@/lib/customer/api";
import { updateTodoItemAction } from "@/lib/customer/todosActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const MAX_ROWS = 4;

// Today's to-do list on Home: the first few tasks with their checkboxes,
// and the link to the full list. Reads the same copy of the list as the top
// bar, so ticking one here updates the count there.
export function HomeTodoCard() {
  const { t } = useLocale();
  const { list, loaded, setList } = useTodayTasks();
  const [busy, setBusy] = useState<string | null>(null);

  const items = list?.items ?? [];
  const open = items.filter((i) => !i.completed).length;
  // Open tasks first, newest first; done ones after.
  const rows = [...[...items].reverse().filter((i) => !i.completed), ...[...items].reverse().filter((i) => i.completed)].slice(0, MAX_ROWS);

  async function toggle(item: TodoItem) {
    if (!list || busy) return;
    setBusy(item.id);
    const result = await updateTodoItemAction(list.id, item.id, { completed: !item.completed });
    if (result.success && result.data) setList(result.data);
    else toast.error(result.message ?? t("Failed to update task"));
    setBusy(null);
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-ink">{t("To-do list")}</h3>
        <span className="text-small text-ink-muted">
          {open} {t("left")}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-2 text-body text-ink-muted">{loaded ? t("Nothing planned for today") : t("Loading...")}</p>
      ) : (
        rows.map((item) => (
          <label key={item.id} className={cn("flex min-h-8 cursor-pointer items-center gap-3 text-body", item.completed ? "text-ink-muted line-through" : "text-ink")}>
            <span className="relative flex size-4.5 shrink-0 items-center justify-center">
              <input type="checkbox" checked={item.completed} disabled={busy === item.id} onChange={() => toggle(item)} className="peer sr-only" />
              <span className={cn("flex size-4.5 items-center justify-center rounded-[5px] border-[1.5px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring", item.completed ? "border-emerald bg-emerald text-white" : "border-line-strong bg-surface")}>
                {item.completed && <Check className="size-3" strokeWidth={3.5} aria-hidden="true" />}
              </span>
            </span>
            <span className="min-w-0 flex-1 truncate">{item.text}</span>
          </label>
        ))
      )}
      <Link href={list ? `/habit-tracker/todos/${list.id}` : "/habit-tracker/todos"} className="mt-auto text-body font-semibold text-emerald hover:text-emerald-hover">
        {t("Open to-do list")}
      </Link>
    </Card>
  );
}
