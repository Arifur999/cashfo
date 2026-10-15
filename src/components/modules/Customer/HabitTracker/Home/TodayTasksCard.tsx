"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState, type RefObject } from "react";
import { toast } from "sonner";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import type { TodoItem, TodoList } from "@/lib/customer/api";
import { addTodoItemAction, createTodoListAction, updateTodoItemAction } from "@/lib/customer/todosActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface TodayTasksCardProps {
  today: string;
  // Today's list as the server rendered it, shown until the shell's own
  // copy has loaded.
  initial: TodoList | null;
  // The add box, so the page header's "Add task" can jump to it.
  inputRef: RefObject<HTMLInputElement | null>;
}

const SHOWN = 5;

// Today's to-do list, the same copy the top bar shows: what is left first,
// then what is done, and a box to add one more.
export function TodayTasksCard({ today, initial, inputRef }: TodayTasksCardProps) {
  const { t } = useLocale();
  const shell = useTodayTasks();
  const { loaded, setList } = shell;
  const list = loaded ? shell.list : initial;
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const items = list?.items ?? [];
  const open = items.filter((item) => !item.completed);
  const done = items.filter((item) => item.completed);
  const shown = [...open, ...done].slice(0, SHOWN);
  const more = items.length - shown.length;

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
          toast.error(created.message ?? t("Failed to add task"));
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
    if (!list || busy.has(item.id)) return;
    setBusy((prev) => new Set(prev).add(item.id));
    updateTodoItemAction(list.id, item.id, { completed: !item.completed })
      .then((result) => {
        if (result.success && result.data) setList(result.data);
        else toast.error(result.message ?? t("Failed to update task"));
      })
      .finally(() =>
        setBusy((prev) => {
          const rest = new Set(prev);
          rest.delete(item.id);
          return rest;
        }),
      );
  }

  return (
    <Card padding="none" className="flex flex-col gap-2 px-5 pt-5 pb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-title font-semibold text-ink">{t("Today's tasks")}</h2>
          {items.length > 0 && (
            <Chip tone="neutral" size="sm">
              {open.length} {t("left")}
            </Chip>
          )}
        </div>
        <Link href="/habit-tracker/todos" className="text-small font-semibold text-emerald hover:underline">
          {t("Open list")}
        </Link>
      </div>
      {items.length > 0 ? (
        <ul className="flex flex-col">
          {shown.map((item) => (
            <li key={item.id} className="flex items-start gap-3 border-b border-surface-sunken py-2">
              <button type="button" role="checkbox" aria-checked={item.completed} aria-label={item.text} disabled={busy.has(item.id)} onClick={() => toggle(item)} className={cn("mt-px flex size-4.5 shrink-0 items-center justify-center rounded-[5px] transition-colors disabled:opacity-50", item.completed ? "bg-emerald text-white" : "border-[1.5px] border-line-strong bg-surface hover:border-emerald")}>
                {item.completed && <Check className="size-3" strokeWidth={3.5} aria-hidden="true" />}
              </button>
              <span className={cn("min-w-0 flex-1 truncate text-body", item.completed ? "text-ink-muted line-through" : "text-ink")}>{item.text}</span>
            </li>
          ))}
          {more > 0 && (
            <li className="pt-2 text-caption text-ink-muted">
              {more} {t("more on the list")}
            </li>
          )}
        </ul>
      ) : (
        <span className="py-3 text-small text-ink-muted">{t("Nothing planned for today. Add the first task below.")}</span>
      )}
      <form onSubmit={add} className="mt-auto flex gap-2 pt-2">
        <Input ref={inputRef} size="sm" value={text} onChange={(event) => setText(event.target.value)} maxLength={200} placeholder={t("Add a task for today…")} aria-label={t("New task for today")} frameClassName="flex-1" />
        <Button type="submit" variant="soft" size="sm" className="h-9.5" disabled={!text.trim() || adding}>
          {t("Add")}
        </Button>
      </form>
    </Card>
  );
}
