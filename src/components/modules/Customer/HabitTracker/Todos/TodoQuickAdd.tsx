"use client";

import { Clock, Plus, SlidersHorizontal } from "lucide-react";
import { forwardRef, useState } from "react";
import type { TodoCategory, TodoPriority } from "@/lib/customer/api";
import { categoryOf, listName } from "@/lib/customer/todoBoard";
import { PRIORITIES, PRIORITY_LABEL } from "@/lib/customer/todoDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SmallSelect, TimeOptions } from "./TodoParts";
import { LIST_TONE, PRIORITY_LOOK } from "./todoTone";

export interface QuickDraft {
  text: string;
  priority: TodoPriority;
  dueTime: string | null;
  categoryId: string | null;
}

interface TodoQuickAddProps {
  placeholder: string;
  categories: TodoCategory[];
  // The list filtered on is the one new tasks go to.
  defaultCategoryId: string | null;
  // Resolves true once the task is on the list (the box empties for the next).
  onAdd: (draft: QuickDraft) => Promise<boolean>;
  // "More": the full popup with what was typed so far.
  onMore: (draft: QuickDraft) => void;
}

// The box at the top of a day's list: the words, then priority, time and
// list, More for the full popup, and Add (Enter adds too).
export const TodoQuickAdd = forwardRef<HTMLInputElement, TodoQuickAddProps>(function TodoQuickAdd({ placeholder, categories, defaultCategoryId, onAdd, onMore }, ref) {
  const { t } = useLocale();
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("MEDIUM");
  const [dueTime, setDueTime] = useState<string | null>(null);
  const [chosenList, setChosenList] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const categoryId = chosenList && categories.some((category) => category.id === chosenList) ? chosenList : (defaultCategoryId ?? categoryOf({ categoryId: null }, categories)?.id ?? null);
  const category = categories.find((each) => each.id === categoryId) ?? null;
  const field = typeof ref === "object" ? ref : null;

  async function add() {
    if (adding) return;
    const words = text.trim();
    if (!words) {
      setError(true);
      field?.current?.focus();
      return;
    }
    setAdding(true);
    const added = await onAdd({ text: words, priority, dueTime, categoryId });
    setAdding(false);
    if (added) {
      setText("");
      setDueTime(null);
      field?.current?.focus();
    }
  }

  return (
    <div className="mx-4.5 mb-3 shrink-0 rounded-xl border border-input bg-surface focus-within:border-emerald focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--emerald)_12%,transparent)]">
      <div className="flex items-center gap-2.5 px-3">
        <Plus className="size-4.5 shrink-0 text-emerald" strokeWidth={2.25} aria-hidden="true" />
        <input
          ref={ref}
          value={text}
          maxLength={200}
          onChange={(event) => {
            setText(event.target.value);
            setError(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void add();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-invalid={error || undefined}
          className="h-11 min-w-0 flex-auto bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-faint"
        />
        {error && (
          <span role="alert" className="shrink-0 text-caption font-semibold text-expense-fill">
            {t("Write the task first")}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-b-xl border-t border-divider bg-strip px-2.5 py-1.75">
        <SmallSelect value={priority} onChange={(value) => setPriority(value as TodoPriority)} label={t("Priority")} width="w-28" lead={<span className={cn("size-2 rounded-full", PRIORITY_LOOK[priority].dot)} />}>
          {PRIORITIES.map((option) => (
            <option key={option} value={option}>
              {t(PRIORITY_LABEL[option])}
            </option>
          ))}
        </SmallSelect>
        <SmallSelect value={dueTime ?? ""} onChange={(value) => setDueTime(value || null)} label={t("Time")} width="w-32" muted={!dueTime} lead={<Clock className="size-3.25" strokeWidth={2} />}>
          <TimeOptions value={dueTime} none={t("Time")} />
        </SmallSelect>
        <SmallSelect value={categoryId ?? ""} onChange={(value) => setChosenList(value)} label={t("List")} width="w-31" lead={category && <span className={cn("size-2 rounded-[3px]", LIST_TONE[category.color].dot)} />}>
          {categories.map((each) => (
            <option key={each.id} value={each.id}>
              {listName(each, t)}
            </option>
          ))}
        </SmallSelect>
        <button
          type="button"
          onClick={() => {
            onMore({ text: text.trim(), priority, dueTime, categoryId });
            setText("");
            setDueTime(null);
          }}
          title={t("Open the full form with date, repeat, steps and note")}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.75 text-[12.5px] font-semibold text-ink-soft hover:brightness-97"
        >
          <SlidersHorizontal className="size-3.25" strokeWidth={2} aria-hidden="true" />
          {t("More")}
        </button>
        <span className="flex-1" />
        <span className="text-[11.5px] whitespace-nowrap text-ink-faint max-sm:hidden">{t("Press Enter to add")}</span>
        <button type="button" onClick={() => void add()} disabled={adding} className="inline-flex h-8 items-center rounded-sm bg-emerald px-3.5 text-[12.5px] font-semibold text-on-action hover:bg-emerald-hover disabled:opacity-60">
          {t("Add")}
        </button>
      </div>
    </div>
  );
});
