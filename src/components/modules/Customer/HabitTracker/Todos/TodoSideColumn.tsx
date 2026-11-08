"use client";

import { ArrowRight, CalendarDays, ListChecks, Repeat, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import type { TodoCategory, TodoColor, TodoRepeat } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { dayText, shiftDay } from "@/lib/customer/habitDisplay";
import { type BoardTask, categoryOf, dayWord, listName, listNameTaken, NEW_LIST_COLORS, nextListColor, rangeText, sortTasks, tasksText } from "@/lib/customer/todoBoard";
import { repeatLabel } from "@/lib/customer/todoDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { LIST_TONE, PRIORITY_LOOK } from "./todoTone";

const CARD = "flex shrink-0 flex-col gap-1 rounded-[14px] border border-line bg-surface px-3.5 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

interface SideItem {
  key: string;
  text: string;
  sub: string;
  dot: string;
  onOpen: () => void;
}

function SideCard({ title, date, icon, iconClass, count, items, more, none, onOpen, openTip }: { title: string; date?: string; icon: React.ReactNode; iconClass: string; count: string; items: SideItem[]; more: number; none: string; onOpen: () => void; openTip: string }) {
  const { t, fmt } = useLocale();
  return (
    <section aria-label={title} className={CARD}>
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <button type="button" onClick={onOpen} title={openTip} className="flex min-w-0 cursor-pointer items-center gap-2 text-left">
          <span aria-hidden="true" className={cn("flex size-6.5 shrink-0 items-center justify-center rounded-sm [&_svg]:size-3.5", iconClass)}>
            {icon}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[14.5px] leading-[normal] font-semibold text-ink">{title}</span>
            {date && <span className="truncate text-[11.5px] leading-[normal] text-ink-faint">{date}</span>}
          </span>
        </button>
        <span className="shrink-0 text-caption text-ink-muted">{count}</span>
      </div>
      {items.map((item) => (
        <button key={item.key} type="button" onClick={item.onOpen} className="-mx-1.5 flex w-[calc(100%+12px)] cursor-pointer items-start gap-2.5 rounded-sm p-1.5 text-left transition-colors hover:bg-row-hover">
          <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.dot)} />
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-[13.5px] leading-[normal] font-medium text-ink">{item.text}</span>
            <span className="truncate text-caption text-ink-muted">{item.sub}</span>
          </span>
        </button>
      ))}
      {items.length === 0 && <span className="py-1 text-[12.5px] text-ink-faint">{none}</span>}
      {more > 0 && (
        <button type="button" onClick={onOpen} className="cursor-pointer self-start py-0.5 text-[12.5px] font-semibold text-emerald hover:underline">
          {t("+{count} more", { count: formatCount(more, fmt) })}
        </button>
      )}
    </section>
  );
}

interface TodoSideColumnProps {
  tasks: BoardTask[];
  repeats: TodoRepeat[];
  categories: TodoCategory[];
  today: string;
  // The list filtered on (null: all lists).
  filter: string | null;
  onFilter: (categoryId: string | null) => void;
  onOpenTask: (task: BoardTask) => void;
  onOpenDay: (day: string) => void;
  onOpenWeek: (day: string) => void;
  onAddList: (name: string, color: TodoColor) => Promise<TodoCategory | null>;
  onDeleteList: (category: TodoCategory) => Promise<boolean>;
}

// The board's right column: tomorrow, the rest of the week, the repeating
// tasks, and the lists (pick one to show only its tasks; add your own).
export function TodoSideColumn({ tasks, repeats, categories, today, filter, onFilter, onOpenTask, onOpenDay, onOpenWeek, onAddList, onDeleteList }: TodoSideColumnProps) {
  const { t, fmt } = useLocale();
  const tomorrow = shiftDay(today, 1);
  const open = (pick: (task: BoardTask) => boolean) => sortTasks(tasks.filter((task) => !task.item.completed && (!filter || categoryOf(task.item, categories)?.id === filter) && pick(task)));
  const nameOf = (task: BoardTask) => {
    const category = categoryOf(task.item, categories);
    return category ? listName(category, t) : "";
  };
  const sub = (task: BoardTask, withDay: boolean) => [withDay && task.day ? dayText(task.day, fmt, "short") : "", task.item.dueTime ? timeLabel(task.item.dueTime, t, fmt) : "", nameOf(task)].filter(Boolean).join(" · ");
  const item = (task: BoardTask, line: string): SideItem => ({ key: task.item.id, text: task.item.text, sub: line, dot: PRIORITY_LOOK[task.item.priority].dot, onOpen: () => onOpenTask(task) });

  const tomorrowTasks = open((task) => task.day === tomorrow);
  const laterTasks = open((task) => task.day !== null && task.day >= shiftDay(today, 2) && task.day <= shiftDay(today, 7));
  // Each repeating task once: its next open copy from today on.
  const nextCopy = (rule: TodoRepeat) => sortTasks(tasks.filter((task) => task.item.repeat?.id === rule.id && !task.item.completed && task.day !== null && task.day >= today))[0];
  const repeatRows = repeats
    .filter((rule) => !filter || (categories.find((category) => category.id === rule.categoryId) ?? categoryOf({ categoryId: null }, categories))?.id === filter)
    .map((rule) => {
      const copy = nextCopy(rule);
      return {
        key: rule.id,
        text: rule.text,
        sub: copy?.day ? `${repeatLabel(rule, t, fmt)} · ${t("next {day}", { day: dayWord(copy.day, today, t, fmt) })}` : repeatLabel(rule, t, fmt),
        dot: PRIORITY_LOOK[rule.priority].dot,
        onOpen: () => (copy ? onOpenTask(copy) : onOpenDay(today)),
      };
    });
  const firstRepeat = repeatRows[0];

  return (
    <div className="flex min-h-0 flex-col gap-3 pr-0.5 pb-0.5 lg:overflow-y-auto lg:[scrollbar-width:thin]">
      <SideCard
        title={t("Tomorrow")}
        date={dayText(tomorrow, fmt, "full")}
        icon={<ArrowRight strokeWidth={2.25} />}
        iconClass="bg-sky-soft text-sky"
        count={tasksText(tomorrowTasks.length, t, fmt)}
        items={tomorrowTasks.slice(0, 4).map((task) => item(task, sub(task, false)))}
        more={tomorrowTasks.length - 4}
        none={t("Nothing planned yet")}
        onOpen={() => onOpenDay(tomorrow)}
        openTip={t("Open tomorrow")}
      />
      <SideCard
        title={t("Later this week")}
        date={rangeText(shiftDay(today, 2), shiftDay(today, 7), t, fmt)}
        icon={<CalendarDays strokeWidth={2} />}
        iconClass="bg-tint-violet text-tint-violet-ink"
        count={tasksText(laterTasks.length, t, fmt)}
        items={laterTasks.slice(0, 5).map((task) => item(task, sub(task, true)))}
        more={laterTasks.length - 5}
        none={t("Nothing planned yet")}
        onOpen={() => onOpenWeek(shiftDay(today, 2))}
        openTip={t("Open the week view")}
      />
      <SideCard
        title={t("Repeating tasks")}
        icon={<Repeat strokeWidth={2} />}
        iconClass="bg-tint-teal text-tint-teal-ink"
        count={tasksText(repeatRows.length, t, fmt)}
        items={repeatRows.slice(0, 5)}
        more={repeatRows.length - 5}
        none={t("No repeating tasks yet. Set Repeat in a task.")}
        onOpen={() => firstRepeat?.onOpen()}
        openTip={t("Open the next one")}
      />
      <ListsCard tasks={tasks} categories={categories} filter={filter} onFilter={onFilter} onAdd={onAddList} onDelete={onDeleteList} />
    </div>
  );
}

function ListsCard({ tasks, categories, filter, onFilter, onAdd, onDelete }: { tasks: BoardTask[]; categories: TodoCategory[]; filter: string | null; onFilter: (id: string | null) => void; onAdd: (name: string, color: TodoColor) => Promise<TodoCategory | null>; onDelete: (category: TodoCategory) => Promise<boolean> }) {
  const { t, fmt } = useLocale();
  const [draft, setDraft] = useState<string | null>(null);
  const [color, setColor] = useState<TodoColor | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirmDialog();
  const chosen = color ?? nextListColor(categories);

  async function save() {
    const name = (draft ?? "").trim();
    if (!name) return setError(t("Write a name for the list."));
    if (listNameTaken(name, categories, t)) return setError(t("A list with this name already exists."));
    setSaving(true);
    const created = await onAdd(name, chosen);
    setSaving(false);
    if (created) {
      setDraft(null);
      setColor(null);
      setError("");
    }
  }

  async function remove(category: TodoCategory) {
    const ok = await confirm({
      title: "Delete this list?",
      message: t("“{name}” goes. Its tasks stay, under Personal.", { name: category.name }),
      confirmLabel: "Delete list",
      danger: true,
    });
    if (!ok) return;
    if (filter === category.id) onFilter(null);
    await onDelete(category);
  }

  return (
    <section aria-label={t("Lists")} className={cn(CARD, "gap-1.5")}>
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="flex size-6.5 items-center justify-center rounded-sm bg-surface-sunken text-ink-soft">
            <ListChecks className="size-3.5" strokeWidth={2} />
          </span>
          <span className="text-[14.5px] leading-[normal] font-semibold text-ink">{t("Lists")}</span>
        </span>
        {filter && (
          <button type="button" onClick={() => onFilter(null)} className="cursor-pointer text-[12.5px] font-semibold text-emerald hover:underline">
            {t("All lists")}
          </button>
        )}
      </div>
      {categories.map((category) => {
        const on = filter === category.id;
        const count = tasks.filter((task) => !task.item.completed && categoryOf(task.item, categories)?.id === category.id).length;
        const tone = LIST_TONE[category.color];
        return (
          <div key={category.id} className="group/list relative flex">
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onFilter(on ? null : category.id)}
              title={on ? t("All lists") : t("Show only this list")}
              className={cn("flex h-8.5 w-full cursor-pointer items-center gap-2.5 rounded-[9px] border px-2.5 text-left text-ink", on ? tone.on : "border-divider bg-surface hover:bg-row-hover")}
            >
              <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-[3px]", tone.dot)} />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{listName(category, t)}</span>
              <span className={cn("shrink-0 text-caption text-ink-muted", category.key === null && "group-focus-within/list:invisible group-hover/list:invisible")}>{t("{count} open", { count: formatCount(count, fmt) })}</span>
            </button>
            {/* A list you added can go; its tasks move to Personal. */}
            {category.key === null && (
              <button type="button" onClick={() => void remove(category)} aria-label={t("Delete the list {name}", { name: category.name })} title={t("Delete list")} className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-[6px] text-ink-faint opacity-0 group-focus-within/list:opacity-100 group-hover/list:opacity-100 hover:bg-expense-soft hover:text-expense-fill pointer-coarse:opacity-100">
                <Trash2 className="size-3.5" strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
      {draft !== null ? (
        <div className="flex flex-col gap-1.5 rounded-[10px] border border-line bg-strip p-2">
          <input
            ref={field}
            autoFocus
            value={draft}
            maxLength={30}
            onChange={(event) => {
              setDraft(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void save();
              } else if (event.key === "Escape") {
                event.stopPropagation();
                setDraft(null);
                setError("");
              }
            }}
            placeholder={t("List name, e.g. Shopping")}
            aria-label={t("List name, e.g. Shopping")}
            aria-invalid={!!error || undefined}
            className={cn("h-8.5 w-full rounded-sm border bg-surface px-3 text-[13.5px] text-ink outline-none focus:border-emerald focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--emerald)_15%,transparent)]", error ? "border-expense-fill" : "border-input")}
          />
          {error && (
            <span role="alert" className="text-caption text-expense-fill">
              {error}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            {NEW_LIST_COLORS.map((each, index) => (
              <button key={each} type="button" aria-label={t("Colour {count}", { count: formatCount(index + 1, fmt) })} aria-pressed={each === chosen} onClick={() => setColor(each)} className={cn("size-5 cursor-pointer rounded-[6px] border-2", LIST_TONE[each].swatch, each === chosen ? "border-ink" : "border-surface")} />
            ))}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setError("");
              }}
              className="inline-flex h-7 items-center rounded-sm border border-input bg-surface px-2.75 text-[12.5px] font-semibold text-ink hover:brightness-97"
            >
              {t("Cancel")}
            </button>
            <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex h-7 items-center rounded-sm bg-emerald px-2.75 text-[12.5px] font-semibold text-on-action hover:bg-emerald-hover disabled:opacity-60">
              {t("Add")}
            </button>
          </span>
        </div>
      ) : (
        <button type="button" onClick={() => setDraft("")} className="h-8 cursor-pointer rounded-[9px] border border-dashed border-input text-[12.5px] font-semibold text-ink-muted hover:border-ink-faint hover:text-ink">
          + {t("New list")}
        </button>
      )}
      {dialog}
    </section>
  );
}

// The "Showing: Work ×" chip over a filtered list.
export function ListFilterChip({ category, onClear }: { category: TodoCategory; onClear: () => void }) {
  const { t } = useLocale();
  const tone = LIST_TONE[category.color];
  return (
    <button type="button" onClick={onClear} aria-label={t("All lists")} className={cn("inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border px-2.75 text-[12.5px] font-semibold whitespace-nowrap", tone.on)}>
      <span aria-hidden="true" className={cn("size-2 rounded-full", tone.dot)} />
      {t("Showing:")} {listName(category, t)}
      <X className="size-3" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
