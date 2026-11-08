"use client";

import { AlertCircle, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Columns3, Inbox, ListChecks, Moon, Plus, Search, Sun, Sunrise, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { TodoCategory, TodoList, TodoRepeat } from "@/lib/customer/api";
import { dayText, shiftDay, WEEKDAY_SHORT, monthShort, weekdayOf } from "@/lib/customer/habitDisplay";
import {
  boardTasks,
  type BoardTask,
  canMoveTo,
  categoryOf,
  doneStreak,
  inCategory,
  isOverdue,
  matchesSearch,
  moveAllTarget,
  ofText,
  percent,
  relativeWord,
  rulesByDay,
  slotOf,
  sortTasks,
  stripAnchor,
  stripDays,
  tasksText,
  TIME_SLOTS,
  type TimeSlot,
  weekDays,
} from "@/lib/customer/todoBoard";
import { formatCount } from "@/lib/i18n/digits";
import { langOf } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { TodoDeleteDialog, TodoPullDialog } from "./TodoDialogs";
import { DateOverlay, ProgressLine } from "./TodoParts";
import { type QuickDraft, TodoQuickAdd } from "./TodoQuickAdd";
import { ListFilterChip, TodoSideColumn } from "./TodoSideColumn";
import { type TaskDraft, TodoTaskDialog } from "./TodoTaskDialog";
import { type RowContext, TodoTaskRow } from "./TodoTaskRow";
import { TodoWeekView } from "./TodoWeekView";
import { isPendingList, useTodoBoard } from "./useTodoBoard";

export type TodoView = "day" | "week" | "someday";

interface TodoBoardPageClientProps {
  lists: TodoList[];
  categories: TodoCategory[];
  repeats: TodoRepeat[];
  day: string;
  view: TodoView;
  today: string;
  // ?new=1: the New task popup opens (the dashboard's Add task).
  openNew?: boolean;
}

const CARD = "rounded-[14px] border border-line bg-surface shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-14px_rgba(15,23,42,0.12)]";
const SLOT_ICON: Record<TimeSlot, React.ComponentType<{ className?: string; strokeWidth?: number }>> = { am: Sunrise, pm: Sun, eve: Moon, any: Clock };

interface Section {
  key: string;
  title: string;
  count: number;
  icon: React.ReactNode;
  tone: "red" | "plain" | "green";
  collapsible?: boolean;
  action?: { label: string; onClick: () => void };
  groups: { key: string; slot?: TimeSlot; rows: BoardTask[] }[];
  context: RowContext;
  shown: boolean;
  cheer?: string;
  flash?: boolean;
}

// Habit Tracker › To Do List (the TodoBoard board): four figures, a strip
// of days, and the picked day's tasks by time of day -- or the week, or
// Someday -- beside tomorrow, the rest of the week, the repeating tasks
// and the lists. Every change can be undone from its toast.
export function TodoBoardPageClient({ lists: serverLists, categories: serverCategories, repeats, day, view: startView, today, openNew = false }: TodoBoardPageClientProps) {
  const { t, fmt } = useLocale();
  const board = useTodoBoard({ lists: serverLists, categories: serverCategories, today });
  const { categories } = board;
  const tasks = boardTasks(board.lists);
  const rules = rulesByDay(tasks);
  const tomorrow = shiftDay(today, 1);

  const [view, setView] = useState<TodoView>(startView);
  const [picked, setPicked] = useState(day);
  const [anchor, setAnchor] = useState(day);
  const [query, setQuery] = useState("");
  const [filterId, setFilterId] = useState<string | null>(null);
  const [doneClosed, setDoneClosed] = useState(false);
  const [popping, setPopping] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [editing, setEditing] = useState<BoardTask | null>(null);
  const [draft, setDraft] = useState<TaskDraft | null>(openNew ? { day } : null);
  const [deleting, setDeleting] = useState<BoardTask | null>(null);
  const [pulling, setPulling] = useState<string | null>(null);
  const quickAdd = useRef<HTMLInputElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const listTop = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const filter = categories.find((category) => category.id === filterId) ?? null;
  const q = query.trim();
  const searching = q.length > 0 && view !== "week";
  const shownAnchor = stripAnchor(anchor, picked);

  // The picked day and view stay in the address, so a reload keeps them.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("day", picked);
    if (view === "day") url.searchParams.delete("view");
    else url.searchParams.set("view", view);
    url.searchParams.delete("new");
    window.history.replaceState(window.history.state, "", url);
  }, [picked, view]);

  const pick = (next: string, nextView: TodoView = "day") => {
    setPicked(next);
    setView(nextView);
  };
  // The strip's arrows move it, and the picked day, a week.
  const shiftWeek = (days: number) => {
    setAnchor(shiftDay(shownAnchor, days));
    setPicked(shiftDay(picked, days));
  };

  // ---- Changes ----
  const busyTask = editing && board.busy.has(editing.item.id);
  const toggle = (task: BoardTask) => {
    if (!task.item.completed) {
      setPopping(task.item.id);
      later(() => setPopping((current) => (current === task.item.id ? null : current)), 700);
    }
    void board.toggle(task);
  };
  const move = (moving: BoardTask[], to: string | null) => void board.move(moving, to);
  const openTask = (task: BoardTask) => {
    setDraft(null);
    setEditing(task);
  };
  const openNewTask = (start: Partial<TaskDraft> = {}) => {
    setEditing(null);
    setDraft({ day: view === "someday" ? null : picked, categoryId: filterId, ...start });
  };
  async function confirmDelete() {
    if (!deleting) return;
    if (await board.remove(deleting)) {
      setDeleting(null);
      setEditing(null);
    }
  }
  const addQuick = (target: string | null) => (draftTask: QuickDraft) => board.add({ date: target, text: draftTask.text, priority: draftTask.priority, dueTime: draftTask.dueTime, categoryId: draftTask.categoryId });

  // ---- The figures ----
  const todayTasks = tasks.filter((task) => task.day === today);
  const todayDone = todayTasks.filter((task) => task.item.completed).length;
  const overdue = tasks.filter((task) => isOverdue(task, today));
  const week = weekDays(today, fmt);
  const weekTasks = tasks.filter((task) => task.day !== null && task.day >= week[0] && task.day <= week[6]);
  const weekDone = weekTasks.filter((task) => task.item.completed).length;
  const streak = doneStreak(
    tasks.map((task) => task.item),
    today,
  );
  const todayPct = percent(todayDone, todayTasks.length);

  function showOverdue() {
    if (overdue.length === 0) {
      toast.success(t("Nothing is overdue. Nice work!"));
      return;
    }
    setView("day");
    setPicked(today);
    setAnchor(today);
    setQuery("");
    setFilterId(null);
    setFlash(true);
    later(() => listTop.current?.querySelector('[data-section="overdue"]')?.scrollIntoView({ block: "start", behavior: "smooth" }), 80);
    later(() => setFlash(false), 2600);
  }

  const kpis = [
    {
      key: "today",
      emoji: "✅",
      emojiBg: "bg-success-soft",
      label: t("Done today"),
      value: ofText(todayDone, todayTasks.length, t, fmt),
      hint: "",
      bar: todayPct,
      red: false,
      tip: t("Open today"),
    },
    {
      key: "overdue",
      emoji: "⏰",
      emojiBg: overdue.length ? "bg-expense-soft" : "bg-surface-sunken",
      label: t("Overdue"),
      value: overdue.length ? tasksText(overdue.length, t, fmt) : t("None"),
      hint: overdue.length ? t("Tap to see") : "",
      bar: null,
      red: overdue.length > 0,
      tip: t("Show overdue tasks"),
    },
    {
      key: "week",
      emoji: "📅",
      emojiBg: "bg-sky-soft",
      label: t("This week"),
      value: ofText(weekDone, weekTasks.length, t, fmt),
      hint: t("done"),
      bar: null,
      red: false,
      tip: t("Open the week view"),
    },
    {
      key: "streak",
      emoji: "🔥",
      emojiBg: "bg-orange-soft",
      label: t("Done streak"),
      value: t(streak === 1 ? "{count} day" : "{count} days", { count: formatCount(streak, fmt) }),
      hint: streak ? t("a task done each day") : t("finish one today"),
      bar: null,
      red: false,
      tip: t("Days in a row with at least one task done"),
    },
  ];
  // Each figure opens what it counts.
  function openKpi(key: string) {
    if (key === "overdue") return showOverdue();
    if (key === "week") {
      setQuery("");
      return pick(today, "week");
    }
    setAnchor(today);
    pick(today);
  }

  // ---- The main card ----
  const someday = tasks.filter((task) => task.day === null);
  const somedayOpen = someday.filter((task) => !task.item.completed).length;
  const inFilter = (task: BoardTask) => inCategory(task.item, categories, filterId);
  const sections: Section[] = [];
  let title = "";
  let sub = "";
  let progress: { text: string; pct: number; done: boolean } | null = null;
  let placeholder = "";
  let empty: { icon: React.ReactNode; title: string; sub: string; buttons: { key: "add" | "pull" | "clear"; label: string; primary: boolean }[] } | null = null;
  let foot: { text: string; button: string | null; onClick: () => void } | null = null;

  if (searching) {
    const found = sortTasks(tasks.filter((task) => inFilter(task) && matchesSearch(task.item, q))).sort((a, b) => Number(a.item.completed) - Number(b.item.completed));
    title = t("Search results");
    sub = t("Matching “{text}” in all days and Someday", { text: q });
    if (found.length) sections.push({ key: "search", title: t("Results"), count: found.length, icon: <Search />, tone: "plain", groups: [{ key: "all", rows: found }], context: "search", shown: true });
    else empty = { icon: <Search />, title: t("No matching tasks"), sub: t("Try another word, or clear the search."), buttons: [{ key: "clear", label: t("Clear search"), primary: false }] };
  } else if (view === "someday") {
    const open = sortTasks(someday.filter((task) => inFilter(task) && (!task.item.completed || task.item.id === popping)));
    const done = someday.filter((task) => inFilter(task) && task.item.completed && task.item.id !== popping);
    title = t("Someday");
    sub = t("Ideas and tasks without a date. Plan them when you are ready.");
    placeholder = t("Add a task for someday, no date needed");
    if (open.length) sections.push({ key: "someday", title: "", count: open.length, icon: null, tone: "plain", groups: [{ key: "all", rows: open }], context: "some", shown: true });
    if (done.length) sections.push({ key: "done", title: t("Done"), count: done.length, icon: <Check />, tone: "green", collapsible: true, groups: [{ key: "all", rows: done }], context: "some", shown: !doneClosed });
    if (!open.length && !done.length)
      empty = {
        icon: <Inbox />,
        title: t("Nothing in Someday"),
        sub: t("Tasks without a date wait here until you plan them."),
        buttons: [{ key: "add", label: t("Add a task"), primary: true }],
      };
  } else {
    const dayTasks = tasks.filter((task) => task.day === picked && inFilter(task));
    const open = dayTasks.filter((task) => !task.item.completed || task.item.id === popping);
    const done = dayTasks.filter((task) => task.item.completed && task.item.id !== popping);
    const doneCount = dayTasks.filter((task) => task.item.completed).length;
    const word = relativeWord(picked, today);
    title = `${word ? `${t(word)} · ` : ""}${dayText(picked, fmt, "full")}`;
    sub = picked < today ? t("A past day. Anything left open is now overdue.") : t("High priority first, grouped by time of day");
    if (dayTasks.length) progress = { text: t("{text} done", { text: ofText(doneCount, dayTasks.length, t, fmt) }), pct: percent(doneCount, dayTasks.length), done: doneCount === dayTasks.length };
    placeholder = picked === today ? t("Add a task for today") : picked === tomorrow ? t("Add a task for tomorrow") : t("Add a task for {day}", { day: dayText(picked, fmt, "full") });
    const late = picked === today ? sortTasks(tasks.filter((task) => task.day !== null && task.day < today && inFilter(task) && (!task.item.completed || task.item.id === popping))) : [];
    const lateMovable = late.filter((task) => canMoveTo(task, today, rules));
    if (late.length)
      sections.push({
        key: "overdue",
        title: t("Overdue"),
        count: late.length,
        icon: <AlertCircle />,
        tone: "red",
        action: lateMovable.length ? { label: t("Move all to today"), onClick: () => move(lateMovable, today) } : undefined,
        groups: [{ key: "all", rows: late }],
        context: "overdue",
        shown: true,
        flash,
      });
    if (open.length) {
      const ranked = sortTasks(open);
      const groups = TIME_SLOTS.map((slot) => ({ key: slot.key, slot: slot.key, rows: ranked.filter((task) => slotOf(task.item.dueTime) === slot.key) })).filter((group) => group.rows.length);
      sections.push({ key: "todo", title: t("To do"), count: open.length, icon: <ListChecks />, tone: "plain", groups, context: "day", shown: true });
    } else if (dayTasks.length) {
      sections.push({ key: "todo", title: t("To do"), count: 0, icon: <ListChecks />, tone: "plain", groups: [], context: "day", shown: false, cheer: picked === today ? t("All done for today. Alhamdulillah, well done!") : t("Everything on this day is done.") });
    }
    if (done.length) sections.push({ key: "done", title: t("Done"), count: done.length, icon: <Check />, tone: "green", collapsible: true, groups: [{ key: "all", rows: done }], context: "day", shown: !doneClosed });
    if (!dayTasks.length && !late.length)
      empty = {
        icon: <CalendarDays />,
        title: t("Nothing planned for this day"),
        sub: filter ? t("No tasks from this list here. Add one above, or show all lists.") : t("Add a task above, or bring one in from Someday."),
        buttons: [
          { key: "add", label: t("Add a task"), primary: true },
          { key: "pull", label: t("Pull from Someday"), primary: false },
        ],
      };
    const target = moveAllTarget(picked, today);
    const movable = dayTasks.filter((task) => canMoveTo(task, target, rules));
    const openCount = dayTasks.filter((task) => !task.item.completed).length;
    if (openCount > 0)
      foot = {
        text: t(openCount === 1 ? "{count} task still open" : "{count} tasks still open", { count: formatCount(openCount, fmt) }),
        // Nothing to move when every open task's rule is there already.
        button: movable.length === 0 ? null : picked < today ? t("Move all to today") : picked === today ? t("Move all to tomorrow") : t("Move all to the next day"),
        onClick: () => move(movable, target),
      };
  }

  function emptyAction(key: "add" | "pull" | "clear") {
    if (key === "clear") setQuery("");
    else if (key === "pull") setPulling(picked);
    else quickAdd.current?.focus();
  }

  const views: { key: TodoView; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "day", label: t("Day"), icon: <Sun />, count: 0 },
    { key: "week", label: t("Week"), icon: <Columns3 />, count: 0 },
    { key: "someday", label: t("Someday"), icon: <Inbox />, count: somedayOpen },
  ];

  const rowFor = (task: BoardTask, context: RowContext) => (
    <TodoTaskRow
      key={task.item.id}
      task={task}
      context={context}
      category={categoryOf(task.item, categories)}
      today={today}
      busy={board.busy.has(task.item.id) || isPendingList(task.listId)}
      popping={popping === task.item.id}
      canMoveTo={(to) => canMoveTo(task, to, rules)}
      onToggle={() => toggle(task)}
      onOpen={() => openTask(task)}
      onMove={(to) => move([task], to)}
      onDuplicate={() => void board.duplicate(task)}
      onDelete={() => setDeleting(task)}
    />
  );

  return (
    <div className="flex w-full flex-col gap-3 px-4 pt-5 pb-24 leading-[normal] md:px-8 md:pt-4.5 md:pb-5 lg:h-full lg:min-h-0">
      {/* Title, search, the three views and New task. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("To Do List")}</h1>
          <p className="truncate text-body text-ink-muted">{t("Plan the day, tick things off, and move the rest to tomorrow.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative block w-full sm:w-55">
            <Search className="pointer-events-none absolute top-3 left-3 size-4 text-ink-faint" strokeWidth={2} aria-hidden="true" />
            <input
              ref={searchField}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.stopPropagation();
                  setQuery("");
                }
              }}
              placeholder={t("Search tasks")}
              aria-label={t("Search tasks")}
              className="h-10 w-full rounded-sm border border-input bg-surface pr-8 pl-9 text-body text-ink outline-none focus:border-emerald focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--emerald)_15%,transparent)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchField.current?.focus();
                }}
                aria-label={t("Clear search")}
                className="absolute top-2 right-1.5 flex size-6 items-center justify-center rounded-[6px] bg-surface-sunken text-ink-muted hover:text-ink"
              >
                <X className="size-3.25" strokeWidth={2.25} aria-hidden="true" />
              </button>
            )}
          </label>
          <div role="tablist" aria-label={t("View")} className="inline-flex rounded-[10px] bg-surface-sunken p-[3px]">
            {views.map((each) => {
              const on = view === each.key;
              return (
                <button
                  key={each.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setView(each.key)}
                  className={cn("inline-flex h-8.5 items-center gap-1.5 rounded-sm px-3.5 text-small font-semibold whitespace-nowrap [&_svg]:size-3.5", on ? "bg-surface text-emerald shadow-[0_1px_2px_rgba(15,23,42,0.12)] dark:bg-surface-raised" : "text-ink-soft hover:text-ink")}
                >
                  {each.icon}
                  {each.label}
                  {each.count > 0 && <span className={cn("inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.25 text-[11px]", on ? "bg-emerald-soft text-emerald" : "bg-line text-ink-soft")}>{formatCount(each.count, fmt)}</span>}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => openNewTask()} className="inline-flex h-10 items-center gap-2 rounded-sm bg-emerald px-4 text-body font-semibold whitespace-nowrap text-on-action shadow-[0_1px_2px_rgba(15,23,42,0.10)] hover:bg-emerald-hover">
            <Plus className="size-4" strokeWidth={2.25} aria-hidden="true" />
            {t("New task")}
          </button>
        </div>
      </div>

      {/* The four figures, each opening what it counts. */}
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <button key={kpi.key} type="button" onClick={() => openKpi(kpi.key)} title={kpi.tip} className={cn("flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border bg-surface px-3.5 py-2.5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-[border-color,box-shadow] hover:border-input hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.18)]", kpi.red ? "border-expense-line" : "border-line")}>
            <span aria-hidden="true" className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-[10px] text-[18px]", kpi.emojiBg)}>
              {kpi.emoji}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[12.5px] text-ink-muted">{kpi.label}</span>
              <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
                <span className={cn("text-[19px] font-bold tabular-nums", kpi.red ? "text-expense" : "text-ink")}>{kpi.value}</span>
                {kpi.hint && <span className="truncate text-caption text-ink-faint">{kpi.hint}</span>}
              </span>
              {kpi.bar !== null && (
                <span role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={kpi.bar} aria-label={kpi.label} className="mt-0.5 block h-1.25 overflow-hidden rounded-full bg-surface-sunken">
                  <span className={cn("block h-full rounded-full", kpi.bar === 100 ? "bg-success" : "bg-emerald")} style={{ width: `${kpi.bar}%` }} />
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* The strip of days: a week either way, today, and any date. */}
      {view === "day" && !searching && (
        <nav aria-label={t("Days")} className="flex shrink-0 items-stretch gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          <StripButton label={t("Previous week")} onClick={() => shiftWeek(-7)}>
            <ChevronLeft className="size-4" strokeWidth={2} aria-hidden="true" />
          </StripButton>
          {stripDays(shownAnchor).map((date) => {
            const dayList = tasks.filter((task) => task.day === date);
            const total = dayList.length;
            const doneOn = dayList.filter((task) => task.item.completed).length;
            const on = date === picked;
            const isToday = date === today;
            const friday = weekdayOf(date) === 5;
            const hot = dayList.some((task) => !task.item.completed && task.item.priority === "HIGH");
            const count = !total ? "–" : date <= today ? `${formatCount(doneOn, fmt)}/${formatCount(total, fmt)}` : tasksText(total, t, fmt);
            const aria = `${dayText(date, fmt, "full")} · ${total ? (date <= today ? t("{text} done", { text: ofText(doneOn, total, t, fmt) }) : tasksText(total, t, fmt)) : t("no tasks")}`;
            return (
              <button
                key={date}
                type="button"
                aria-current={on ? "date" : undefined}
                aria-label={aria}
                onClick={() => pick(date)}
                className={cn(
                  "relative flex h-15.5 min-w-16 flex-1 flex-col items-center justify-center gap-px rounded-[11px] px-1 transition-[border-color,box-shadow,transform] hover:-translate-y-px",
                  on ? "border border-emerald bg-emerald text-on-action shadow-[0_6px_14px_-6px_var(--emerald)]" : isToday ? "border-[1.5px] border-emerald bg-surface text-ink" : friday ? "border border-success-line/60 bg-success-soft/40 text-ink" : "border border-line bg-surface text-ink",
                )}
              >
                {hot && <span aria-hidden="true" className={cn("absolute top-1.75 right-2 size-1.75 rounded-full", on ? "bg-expense-soft" : "bg-expense-fill")} />}
                <span className={cn("text-[11.5px] font-semibold whitespace-nowrap", on ? "text-on-action/90" : isToday ? "text-emerald" : friday ? "text-success-ink" : "text-ink-muted")}>{isToday ? t("Today") : t(WEEKDAY_SHORT[weekdayOf(date)])}</span>
                <span className="text-[17px] leading-[1.15] font-bold whitespace-nowrap tabular-nums">
                  {formatCount(Number(date.slice(8, 10)), fmt)} <span className="text-[11px] font-semibold opacity-70">{monthShort(Number(date.slice(5, 7)), langOf(fmt))}</span>
                </span>
                <span className={cn("text-[11px] font-semibold whitespace-nowrap tabular-nums", on ? "text-on-action" : !total ? "text-input" : total === doneOn ? "text-success" : "text-ink-muted")}>{count}</span>
              </button>
            );
          })}
          <StripButton label={t("Next week")} onClick={() => shiftWeek(7)}>
            <ChevronRight className="size-4" strokeWidth={2} aria-hidden="true" />
          </StripButton>
          <button
            type="button"
            onClick={() => {
              setAnchor(today);
              pick(today);
            }}
            className="flex h-15.5 shrink-0 flex-col items-center justify-center gap-1 rounded-[11px] border border-line bg-surface px-3.5 text-small font-semibold text-emerald hover:bg-surface-sunken"
          >
            <Sun className="size-4.25" strokeWidth={2} aria-hidden="true" />
            {t("Today")}
          </button>
          <span className="relative flex shrink-0">
            <span aria-hidden="true" className="flex h-15.5 flex-col items-center justify-center gap-1 rounded-[11px] border border-line bg-surface px-3.5 text-small font-semibold text-ink-2">
              <CalendarDays className="size-4.25" strokeWidth={2} />
              {t("Pick a date")}
            </span>
            <DateOverlay
              value={picked}
              label={t("Pick a date")}
              onPick={(next) => {
                setAnchor(next);
                pick(next);
              }}
            />
          </span>
        </nav>
      )}

      {view === "week" ? (
        <TodoWeekView
          day={picked}
          today={today}
          tasks={tasks.filter(inFilter)}
          categories={categories}
          filter={filter}
          busy={board.busy}
          popping={popping}
          onClearFilter={() => setFilterId(null)}
          onShift={(days) => setPicked(shiftDay(picked, days))}
          onThisWeek={() => setPicked(today)}
          onOpenDay={(date) => pick(date)}
          onToggle={toggle}
          onOpen={openTask}
          onAdd={(date, text) => board.add({ date, text, categoryId: filterId })}
        />
      ) : (
        <div className="grid min-h-0 gap-4 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_330px] lg:grid-rows-[minmax(0,1fr)]">
          <section aria-labelledby="todo-main-title" className={cn(CARD, "flex min-h-0 flex-col overflow-hidden")}>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3.5 px-4.5 pt-3.5 pb-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 id="todo-main-title" className="truncate text-[17px] font-semibold text-ink">
                  {title}
                </h2>
                <span className="truncate text-[12.5px] text-ink-muted">{sub}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                {filter && <ListFilterChip category={filter} onClear={() => setFilterId(null)} />}
                {progress && (
                  <span className="flex items-center gap-2.5 text-small whitespace-nowrap text-ink-soft">
                    <b className="font-semibold text-ink">{progress.text}</b>
                    <ProgressLine pct={progress.pct} label={progress.text} done={progress.done} />
                  </span>
                )}
              </div>
            </div>

            {!searching && (
              <TodoQuickAdd
                // A new day or view starts the box afresh.
                key={view === "someday" ? "someday" : picked}
                ref={quickAdd}
                placeholder={placeholder}
                categories={categories}
                defaultCategoryId={filterId}
                onAdd={addQuick(view === "someday" ? null : picked)}
                onMore={(typed) => openNewTask({ text: typed.text, priority: typed.priority, dueTime: typed.dueTime, categoryId: typed.categoryId })}
              />
            )}

            <div ref={listTop} className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-color:var(--input)_transparent] [scrollbar-width:thin]">
              {sections.map((section) => (
                <div key={section.key} data-section={section.key} className={cn(section.flash && "todo-flash")}>
                  {section.title && (
                    <div className={cn("sticky top-0 z-2 flex h-9 items-center gap-2 border-y pr-3.5 pl-4.5", section.tone === "red" ? "border-expense-line bg-expense-soft/60" : "border-line bg-strip")}>
                      <button
                        type="button"
                        onClick={section.collapsible ? () => setDoneClosed((value) => !value) : undefined}
                        aria-expanded={section.collapsible ? section.shown : undefined}
                        className={cn("flex items-center gap-2 text-caption font-bold tracking-[0.03em] uppercase [&_svg]:size-3.5", section.tone === "red" ? "text-expense" : section.tone === "green" ? "text-success-ink" : "text-ink-2", section.collapsible ? "cursor-pointer" : "cursor-default")}
                      >
                        {section.collapsible && <ChevronDown className={cn("transition-transform", !section.shown && "-rotate-90")} strokeWidth={2.25} aria-hidden="true" />}
                        {section.icon}
                        {section.title}
                        <span className={cn("inline-flex h-4.5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11.5px] tracking-normal", section.tone === "red" ? "bg-expense-soft" : section.tone === "green" ? "bg-success-soft" : "bg-line")}>{formatCount(section.count, fmt)}</span>
                      </button>
                      <span className="flex-1" />
                      {section.action && (
                        <button type="button" onClick={section.action.onClick} className="inline-flex h-6.5 items-center gap-1.5 rounded-sm border border-expense-line bg-surface px-2.5 text-caption font-semibold text-expense hover:brightness-97">
                          <Sun className="size-3.25" strokeWidth={2.25} aria-hidden="true" />
                          {section.action.label}
                        </button>
                      )}
                    </div>
                  )}
                  {section.cheer && (
                    <div role="status" className="mx-4.5 my-3 flex items-center gap-2.5 rounded-xl border border-success-line/60 bg-success-soft/60 px-3.5 py-3 text-[13.5px] font-semibold text-success-ink">
                      <span aria-hidden="true" className="text-[18px]">
                        🎉
                      </span>
                      {section.cheer}
                    </div>
                  )}
                  {section.shown &&
                    section.groups.map((group) => {
                      const SlotIcon = group.slot ? SLOT_ICON[group.slot] : null;
                      return (
                        <div key={group.key}>
                          {group.slot && SlotIcon && (
                            <div className="flex items-center gap-1.5 px-4.5 pt-2.25 pb-0.75 text-[11.5px] font-bold text-ink-faint">
                              <SlotIcon className="size-3.25" strokeWidth={2} />
                              {t(TIME_SLOTS.find((slot) => slot.key === group.slot)!.label)}
                              <span className="font-semibold text-input">· {formatCount(group.rows.length, fmt)}</span>
                            </div>
                          )}
                          {group.rows.map((task) => rowFor(task, section.context))}
                        </div>
                      );
                    })}
                </div>
              ))}
              {empty && (
                <div className="flex min-h-full flex-col items-center justify-center gap-2.5 p-7 text-center">
                  <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-emerald-soft text-emerald [&_svg]:size-6.5">
                    {empty.icon}
                  </span>
                  <span className="text-[16px] font-semibold text-ink">{empty.title}</span>
                  <span className="max-w-95 text-[13.5px] leading-[1.55] text-ink-muted">{empty.sub}</span>
                  <span className="mt-1.5 flex gap-2.5">
                    {empty.buttons.map((button) => (
                      <button key={button.key} type="button" onClick={() => emptyAction(button.key)} className={cn("inline-flex h-9.5 items-center rounded-sm px-4 text-body font-semibold", button.primary ? "bg-emerald text-on-action hover:bg-emerald-hover" : "border border-input bg-surface text-ink hover:brightness-97")}>
                        {button.label}
                      </button>
                    ))}
                  </span>
                </div>
              )}
            </div>

            {foot && (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-strip px-4.5 py-2.5">
                <span className="flex items-center gap-2 text-small text-ink-soft">
                  <span aria-hidden="true" className="size-2 rounded-full bg-warning-fill" />
                  {foot.text}
                </span>
                {foot.button && (
                  <button type="button" onClick={foot.onClick} className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-input bg-surface px-2.75 text-[12.5px] font-semibold text-ink hover:brightness-97">
                    <ChevronRight className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
                    {foot.button}
                  </button>
                )}
              </div>
            )}
          </section>

          <TodoSideColumn
            tasks={tasks}
            repeats={repeats}
            categories={categories}
            today={today}
            filter={filterId}
            onFilter={setFilterId}
            onOpenTask={openTask}
            onOpenDay={(date) => {
              setQuery("");
              pick(date);
            }}
            onOpenWeek={(date) => {
              setQuery("");
              pick(date, "week");
            }}
            onAddList={board.addCategory}
            onDeleteList={board.removeCategory}
          />
        </div>
      )}

      <TodoTaskDialog
        editing={editing}
        draft={draft}
        categories={categories}
        today={today}
        busy={!!busyTask}
        onClose={() => {
          setEditing(null);
          setDraft(null);
        }}
        onAdd={(task) => board.add(task)}
        onSave={board.save}
        onDelete={setDeleting}
      />
      <TodoDeleteDialog task={deleting} busy={!!deleting && board.busy.has(deleting.item.id)} onClose={() => setDeleting(null)} onConfirm={() => void confirmDelete()} />
      <TodoPullDialog day={pulling} today={today} tasks={tasks} categories={categories} onClose={() => setPulling(null)} onPull={(task) => pulling && move([task], pulling)} />
    </div>
  );
}

function StripButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="flex h-15.5 w-8.5 shrink-0 items-center justify-center rounded-[11px] border border-line bg-surface text-ink-2 hover:bg-surface-sunken">
      {children}
    </button>
  );
}
