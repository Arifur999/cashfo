"use client";

import { ArrowDown, ArrowUp, Check, ChevronsUpDown, CircleCheck, Clock, GraduationCap, LayoutGrid, List, MapPin, Pause, Pencil, Play, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import PageFrame from "@/components/smartly/PageFrame";
import { useStoredChoice } from "@/components/modules/Customer/Balance/useStoredChoice";
import type { Reminder, Skill, SkillsOverview } from "@/lib/customer/api";
import { actionError, dayText } from "@/lib/customer/habitDisplay";
import { longDay } from "@/lib/customer/libraryBoard";
import { deleteSkillAction, restoreSkillAction, updateSkillAction } from "@/lib/customer/skillActions";
import {
  agoText,
  amountOf,
  categoryOf,
  doneText,
  logsOf,
  progressOf,
  SKILL_CATEGORIES,
  type SkillCategory,
  type SkillState,
  SKILLS_DASHBOARD_HREF,
  skillHref,
  skillWeek,
  STATE_INFO,
  STATE_ORDER,
  stateInput,
  stateOf,
  totalText,
} from "@/lib/customer/skillsBoard";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { LB_FIELD, LB_OUTLINE, LB_PRIMARY } from "../Books/LibraryBits";
import { useReminderBook } from "../Reminders";
import { CategoryIcon, skillColors, StateChip } from "./SkillBits";
import { SkillFormDialog } from "./SkillFormDialog";

type Tab = "all" | SkillState;
type View = "board" | "list";
type Sort = { key: "name" | "pct" | "last"; dir: 1 | -1 } | null;
const VIEWS = ["board", "list"] as const;
const TABS: Tab[] = ["all", "learning", "want", "paused", "done"];
const LIST_COLUMNS = "grid-cols-[minmax(0,1fr)_150px_172px_124px_132px_122px_128px]";

interface MySkillsPageClientProps {
  overview: SkillsOverview;
  today: string;
  reminders: Reminder[] | null;
  openAdd?: boolean;
}

// The status button a skill offers next: start, pause, resume, learn again.
function nextMove(state: SkillState): { to: SkillState; label: string; icon: typeof Play; tone: string } {
  if (state === "want") return { to: "learning", label: "Start learning", icon: Play, tone: "" };
  if (state === "learning") return { to: "paused", label: "Pause", icon: Pause, tone: "bg-surface-sunken text-ink-soft" };
  if (state === "paused") return { to: "learning", label: "Resume", icon: Play, tone: "bg-warning-soft text-warning" };
  return { to: "learning", label: "Learn again", icon: RotateCcw, tone: "bg-surface-sunken text-ink-soft" };
}

// Skills › My skills (the SkillsList board): every skill on a board by
// category or in a sortable list, filtered by state, category and a
// search; skills added, edited, moved along and deleted (with undo) here.
export function MySkillsPageClient({ overview, today, reminders: savedReminders, openAdd = false }: MySkillsPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const reminders = useReminderBook(savedReminders);
  const { skills } = overview;
  const logs = overview.logs ?? [];
  const summaries = overview.summaries ?? {};
  const count = (n: number) => formatCount(n, fmt);
  const [tab, setTab] = useState<Tab>("all");
  const [category, setCategory] = useState<SkillCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useStoredChoice<View>("smartly-skills-view", VIEWS, "board");
  const [sort, setSort] = useState<Sort>(null);
  const [form, setForm] = useState<{ editing: Skill | null; category?: SkillCategory; state?: SkillState } | null>(openAdd ? { editing: null } : null);
  const [removing, setRemoving] = useState<Skill | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const needle = query.trim().toLowerCase();
  const matches = (skill: Skill, byState: boolean, byCategory: boolean) =>
    (!byState || tab === "all" || stateOf(skill) === tab) && (!byCategory || category === "all" || categoryOf(skill.category).id === category) && (!needle || `${skill.name} ${skill.source}`.toLowerCase().includes(needle));
  const last = (skill: Skill) => summaries[skill.id]?.lastPractised ?? "";
  const baseOrder = (a: Skill, b: Skill) => STATE_ORDER[stateOf(a)] - STATE_ORDER[stateOf(b)] || last(b).localeCompare(last(a)) || a.name.localeCompare(b.name);
  const items = skills.filter((skill) => matches(skill, true, true)).sort(baseOrder);
  const listItems = sort
    ? [...items].sort((a, b) => {
        const va = sort.key === "name" ? a.name.toLowerCase() : sort.key === "pct" ? progressOf(a).pct : last(a);
        const vb = sort.key === "name" ? b.name.toLowerCase() : sort.key === "pct" ? progressOf(b).pct : last(b);
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir || baseOrder(a, b);
      })
    : items;
  const counts = Object.fromEntries(TABS.map((value) => [value, skills.filter((skill) => (value === "all" || stateOf(skill) === value) && matches(skill, false, true)).length])) as Record<Tab, number>;
  const catCount = (id: SkillCategory | "all") => skills.filter((skill) => (id === "all" || categoryOf(skill.category).id === id) && matches(skill, true, false)).length;
  const showEmptyGroup = category !== "all" && tab === "all" && !needle;
  const groups = SKILL_CATEGORIES.map((cat) => ({ cat, mine: items.filter((skill) => categoryOf(skill.category).id === cat.id) })).filter((group) => group.mine.length > 0 || (showEmptyGroup && group.cat.id === category));
  const noMatch = skills.length > 0 && items.length === 0 && groups.length === 0;
  const learningCount = skills.filter((skill) => stateOf(skill) === "learning").length;
  const doneCount = skills.filter((skill) => stateOf(skill) === "done").length;

  const clearFilters = () => {
    setQuery("");
    setTab("all");
    setCategory("all");
  };

  function move(skill: Skill, to: SkillState) {
    const from = stateOf(skill);
    startTransition(async () => {
      const result = await updateSkillAction(skill.id, stateInput(to));
      router.refresh();
      if (!result.success) return void toast.error(actionError(result.message, "Failed to save skill", t, fmt));
      setHighlight(skill.id);
      const message = to === "done" ? t("Marked as completed. Well done!") : to === "paused" ? t("Paused") : from === "want" ? t("Started learning") : from === "done" ? t("Learning again") : t("Resumed");
      toast.success(`${skill.name} · ${message}`, {
        action: {
          label: t("Undo"),
          onClick: async () => {
            await updateSkillAction(skill.id, stateInput(from));
            router.refresh();
            toast(`${skill.name} · ${t("Change undone")}`);
          },
        },
      });
    });
  }

  function remove() {
    const target = removing;
    if (!target) return;
    startTransition(async () => {
      const result = await deleteSkillAction(target.id);
      if (!result.success) return void toast.error(actionError(result.message, "Failed to remove skill", t, fmt));
      setRemoving(null);
      router.refresh();
      toast(`${target.name} · ${t("Skill deleted")}`, {
        action: {
          label: t("Undo"),
          onClick: async () => {
            const back = await restoreSkillAction(target.id);
            if (!back.success) return void toast.error(actionError(back.message, "Failed to bring the skill back", t, fmt));
            setHighlight(target.id);
            router.refresh();
            toast.success(`${target.name} · ${t("Skill restored")}`);
          },
        },
      });
    });
  }

  const deleteBody = (skill: Skill) => {
    const summary = summaries[skill.id];
    const parts = [
      summary?.sessions ? t(summary.sessions === 1 ? "{count} practice entry" : "{count} practice entries", { count: count(summary.sessions) }) : null,
      summary?.steps.total ? t(summary.steps.total === 1 ? "{count} roadmap step" : "{count} roadmap steps", { count: count(summary.steps.total) }) : null,
      summary?.notes ? t(summary.notes === 1 ? "{count} note" : "{count} notes", { count: count(summary.notes) }) : null,
      summary?.resources ? t(summary.resources === 1 ? "{count} resource" : "{count} resources", { count: count(summary.resources) }) : null,
    ].filter((part): part is string => !!part);
    const joined = parts.length > 1 ? `${parts.slice(0, -1).join(", ")}${t(" and ")}${parts[parts.length - 1]}` : (parts[0] ?? "");
    return parts.length ? t("will be removed, along with its {things}. You can undo it right after.", { things: joined }) : t("will be removed. You can undo it right after.");
  };

  const actions = (skill: Skill, compact: boolean) => {
    const state = stateOf(skill);
    const next = nextMove(state);
    const { color, dark } = skillColors(skill);
    const Icon = next.icon;
    const stop = (event: React.MouseEvent) => event.stopPropagation();
    return (
      <>
        {compact ? (
          <button type="button" onClick={(event) => {
              stop(event);
              move(skill, next.to);
            }} disabled={isPending} title={t(next.label)} aria-label={t(next.label)} className="flex size-7.5 items-center justify-center rounded-[8px] hover:bg-surface-sunken" style={next.tone ? undefined : { color: dark }}>
            <Icon className={cn("size-3.75", next.tone && "text-ink-soft")} fill={state === "done" ? "none" : "currentColor"} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              stop(event);
              move(skill, next.to);
            }}
            disabled={isPending}
            title={t(next.label)}
            className={cn("inline-flex h-7.5 min-w-0 items-center gap-1.5 overflow-hidden rounded-[8px] px-2.5 text-[12.5px] font-semibold whitespace-nowrap hover:brightness-96", next.tone)}
            style={next.tone ? undefined : { background: `color-mix(in srgb, ${color} 10%, var(--surface))`, color: dark }}
          >
            <Icon className="size-3.5 shrink-0" fill={state === "done" ? "none" : "currentColor"} aria-hidden="true" />
            <span className="truncate">{t(next.label)}</span>
          </button>
        )}
        {!compact && <span className="flex-1" />}
        {state !== "done" && (
          <button type="button" onClick={(event) => {
              stop(event);
              move(skill, "done");
            }} disabled={isPending} title={t("Mark completed")} aria-label={t("Mark completed")} className="flex size-7.5 items-center justify-center rounded-[8px] text-ink-muted hover:bg-surface-sunken hover:text-ink">
            <CircleCheck className="size-4" aria-hidden="true" />
          </button>
        )}
        <button type="button" onClick={(event) => {
            stop(event);
            setForm({ editing: skill });
          }} title={t("Edit")} aria-label={t("Edit")} className="flex size-7.5 items-center justify-center rounded-[8px] text-ink-muted hover:bg-surface-sunken hover:text-ink">
          <Pencil className="size-3.75" aria-hidden="true" />
        </button>
        <button type="button" onClick={(event) => {
            stop(event);
            setRemoving(skill);
          }} title={t("Delete")} aria-label={t("Delete")} className="flex size-7.5 items-center justify-center rounded-[8px] text-ink-muted hover:bg-expense-soft hover:text-expense">
          <Trash2 className="size-3.75" aria-hidden="true" />
        </button>
      </>
    );
  };

  const card = (skill: Skill) => {
    const state = stateOf(skill);
    const { color, dark } = skillColors(skill);
    const light = `color-mix(in srgb, ${color} 55%, var(--surface))`;
    const progress = progressOf(skill);
    const week = skillWeek(logsOf(logs, skill.id), today);
    const most = Math.max(1, ...week.map((day) => day.amount));
    const lastDay = summaries[skill.id]?.lastPractised ?? null;
    return (
      <div
        key={skill.id}
        role="link"
        tabIndex={0}
        onClick={() => router.push(skillHref(skill.id))}
        onKeyDown={(event) => event.key === "Enter" && router.push(skillHref(skill.id))}
        className={cn("relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-[14px] border bg-surface shadow-card transition-[transform,box-shadow] hover:-translate-y-0.75 hover:shadow-[0_12px_24px_-12px_rgba(15,23,42,0.28)] focus-visible:outline-2 focus-visible:outline-focus-ring", highlight === skill.id ? "border-primary ring-3 ring-primary/20" : "border-line")}
      >
        <span aria-hidden="true" className="h-1" style={{ background: `linear-gradient(90deg, ${color}, ${light})` }} />
        <div className="flex flex-1 flex-col gap-2.75 px-3.5 pt-3">
          <div className="flex min-w-0 items-center gap-2.75">
            <span aria-hidden="true" className="relative flex size-10.5 shrink-0 items-center justify-center rounded-[11px] text-white" style={{ background: `linear-gradient(140deg, ${color} 0%, ${dark} 100%)`, boxShadow: `0 6px 12px -6px ${color}` }}>
              <CategoryIcon category={skill.category} className="size-5" />
              {state === "done" && (
                <span className="absolute -right-1 -bottom-1 flex size-4.5 items-center justify-center rounded-full border-2 border-surface bg-success">
                  <Check className="size-2.5 text-white" strokeWidth={4} />
                </span>
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Link href={skillHref(skill.id)} onClick={(event) => event.stopPropagation()} className="truncate text-[15px] font-semibold text-ink hover:underline">
                {skill.name}
              </Link>
              <span className="flex min-w-0 items-center gap-1 text-[12.5px] text-ink-muted">
                {skill.source ? <MapPin className="size-3 shrink-0" aria-hidden="true" /> : <CategoryIcon category={skill.category} className="size-3 shrink-0" />}
                <span className="truncate">{skill.source || t(categoryOf(skill.category).label)}</span>
              </span>
            </span>
          </div>
          {state === "done" ? (
            <div className="flex h-6 max-w-full items-center gap-1.5 self-start rounded-full bg-success-soft px-2.25 text-[12px] font-bold text-tint-green-ink">
              <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
              <span className="truncate">{skill.completedAt ? t("Completed {date}", { date: longDay(skill.completedAt.slice(0, 10), fmt) }) : t(STATE_INFO.done.label)}</span>
            </div>
          ) : (
            <div className="flex h-6 items-center justify-between gap-2">
              <StateChip state={state} className="px-2.25 text-[12px]" />
              {(state === "learning" || state === "paused") && (
                <span title={t("Last 7 days")} aria-label={t("Practised on {count} of the last 7 days", { count: count(week.filter((day) => day.amount > 0).length) })} className="inline-flex items-end gap-0.75">
                  {week.map((day) => (
                    <span
                      key={day.date}
                      title={`${longDay(day.date, fmt)} · ${day.amount ? amountOf(skill.unit, day.amount, t, fmt) : t("no practice")}`}
                      className={cn("w-2.25 rounded-[3px]", !day.amount && "bg-line")}
                      style={{ height: day.amount ? `${Math.round(10 + (8 * day.amount) / most)}px` : "10px", ...(day.amount ? { background: color } : {}), ...(day.date === today ? { boxShadow: `0 0 0 1.5px var(--surface), 0 0 0 2.5px ${day.amount ? color : "var(--input)"}` } : {}) }}
                    />
                  ))}
                </span>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <span role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.pct} aria-label={t("Progress {pct}%", { pct: count(progress.pct) })} className="block h-2 overflow-hidden rounded-full bg-surface-sunken">
              <span className="block h-full rounded-full" style={{ width: `${Math.max(progress.pct, progress.pct ? 3 : 0)}%`, background: `linear-gradient(90deg, ${light}, ${color})` }} />
            </span>
            <span className="flex items-baseline justify-between gap-2 text-[12.5px]">
              <span className="truncate text-ink-soft tabular-nums">
                {doneText(skill, fmt)} / {totalText(skill, t, fmt)}
              </span>
              <span className={cn("font-bold tabular-nums", state === "done" ? "text-tint-green-ink" : !progress.pct && "text-ink-faint")} style={state !== "done" && progress.pct ? { color: dark } : undefined}>
                {count(progress.pct)}%
              </span>
            </span>
          </div>
          <span className={cn("flex min-w-0 items-center gap-1.5 text-[12.5px]", lastDay ? "text-ink-muted" : "text-ink-faint")}>
            <Clock className="size-3.25 shrink-0" aria-hidden="true" />
            <span className="truncate">{lastDay ? `${t("Last practised:")} ${agoText(lastDay, today, t, fmt)}` : t("No practice yet")}</span>
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1 border-t border-divider py-2 pr-2 pl-2.5">{actions(skill, false)}</div>
      </div>
    );
  };

  const sortHead = (key: "name" | "pct" | "last", label: string) => {
    const on = sort?.key === key;
    const Icon = on ? (sort?.dir === 1 ? ArrowUp : ArrowDown) : ChevronsUpDown;
    return (
      <span role="columnheader" aria-sort={on ? (sort?.dir === 1 ? "ascending" : "descending") : "none"}>
        <button type="button" onClick={() => setSort(on && sort ? { key, dir: sort.dir === 1 ? -1 : 1 } : { key, dir: key === "name" ? 1 : -1 })} className={cn("inline-flex items-center gap-1 rounded-[4px] hover:text-ink", on ? "text-emerald" : "text-ink-muted")}>
          {label}
          <Icon className="size-3" aria-hidden="true" />
        </button>
      </span>
    );
  };

  return (
    <PageFrame className="gap-3.5 leading-[normal] md:pt-5 md:pb-5.5 xl:min-h-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.75">
          <h1 className="text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("My skills")}</h1>
          <p className="truncate text-[14px] text-ink-muted">{t("Everything you are learning or want to learn, grouped by category.")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {skills.length > 0 && (
            <div role="radiogroup" aria-label={t("How to show skills")} className="inline-flex rounded-[10px] bg-surface-sunken p-0.75">
              {VIEWS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={view === value}
                  onClick={() => setView(value)}
                  className={cn("inline-flex h-8.5 items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-semibold", view === value ? "bg-surface text-emerald shadow-[0_1px_3px_rgba(15,23,42,0.12)]" : "text-ink-soft hover:text-ink")}
                >
                  {value === "board" ? <LayoutGrid className="size-3.75" aria-hidden="true" /> : <List className="size-3.75" aria-hidden="true" />}
                  {t(value === "board" ? "Board" : "List")}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setForm({ editing: null, category: category !== "all" ? category : undefined, state: tab !== "all" ? tab : undefined })} className={LB_PRIMARY}>
            <Plus className="size-4" strokeWidth={2.25} aria-hidden="true" />
            {t("Add skill")}
          </button>
        </div>
      </div>

      <section className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-[14px] border border-line bg-surface shadow-card">
        {skills.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_50%_0%,var(--emerald-soft)_0%,var(--surface)_60%)] p-9 text-center">
            <span aria-hidden="true" className="flex size-17 items-center justify-center rounded-[20px] bg-linear-140 from-primary to-forest text-white shadow-[0_12px_24px_-12px_var(--primary)]">
              <GraduationCap className="size-8" strokeWidth={1.9} />
            </span>
            <span className="text-[19px] font-semibold text-ink">{t("You have not added any skills yet")}</span>
            <span className="max-w-110 text-[14px] leading-[1.6] text-ink-muted">{t("Add something you are learning or want to learn, like a course, a language or the Quran. Then log a little practice every day.")}</span>
            <button type="button" onClick={() => setForm({ editing: null })} className={cn(LB_PRIMARY, "mt-1")}>
              <Plus className="size-4" strokeWidth={2.25} aria-hidden="true" />
              {t("Add your first skill")}
            </button>
            <span className="mt-3.5 text-[13px] font-semibold text-ink-soft">{t("Or start with a category")}</span>
            <div className="grid grid-cols-3 gap-2.5 max-md:grid-cols-2">
              {SKILL_CATEGORIES.map((cat) => (
                <button key={cat.id} type="button" onClick={() => setForm({ editing: null, category: cat.id })} className="flex h-13 w-52.5 items-center gap-2.5 rounded-[12px] border border-line bg-surface px-3 text-left text-[13.5px] font-semibold text-ink transition-transform hover:-translate-y-0.5 max-md:w-auto">
                  <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-[9px]", cat.tile)}>
                    <CategoryIcon category={cat.id} className={cn("size-4", cat.ink)} />
                  </span>
                  <span className="truncate">{t(cat.label)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 flex-wrap items-center gap-3.5 border-b border-line px-4.5 py-3">
              <div role="tablist" aria-label={t("Show skills by status")} className="inline-flex shrink-0 gap-0.5 rounded-full bg-surface-sunken p-0.75">
                {TABS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => setTab(value)}
                    className={cn("h-8.5 rounded-full px-3.25 text-[13.5px] font-semibold whitespace-nowrap", tab === value ? "bg-surface text-emerald shadow-[0_1px_3px_rgba(15,23,42,0.12)]" : "text-ink-soft hover:text-ink")}
                  >
                    {t(value === "all" ? "All" : STATE_INFO[value].label)} <span className={cn("ml-0.75 font-medium", tab === value ? "text-emerald" : "text-ink-faint")}>{count(counts[value])}</span>
                  </button>
                ))}
              </div>
              <div className="relative ml-auto max-w-85 min-w-50 flex-1 max-md:ml-0">
                <Search className="pointer-events-none absolute top-3 left-3 size-4 text-ink-muted" aria-hidden="true" />
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Escape" && setQuery("")} placeholder={t("Search by skill or where you learn")} aria-label={t("Search by skill or where you learn")} className={cn(LB_FIELD, "h-10 pl-9")} />
              </div>
            </div>
            <div role="group" aria-label={t("Categories")} className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-line px-4.5 py-2.5">
              {[{ id: "all" as const, label: "All categories" }, ...SKILL_CATEGORIES].map((chip) => {
                const on = category === chip.id;
                const cat = chip.id === "all" ? null : categoryOf(chip.id);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCategory(chip.id)}
                    className={cn("inline-flex h-8 shrink-0 items-center gap-1.75 rounded-full border pr-2.75 pl-1.75 text-[13px] font-semibold whitespace-nowrap", on ? (cat ? cn(cat.ring, cat.tile, cat.ink) : "border-ink-soft bg-surface-sunken text-ink") : "border-line bg-surface text-ink-2 hover:bg-hover")}
                  >
                    <span className={cn("inline-flex size-5 items-center justify-center rounded-[6px]", cat ? (on ? "bg-surface" : cat.tile) : "bg-surface-sunken")}>
                      {cat ? <CategoryIcon category={cat.id} className={cn("size-3", cat.ink)} strokeWidth={2.25} /> : <LayoutGrid className="size-3 text-ink-soft" aria-hidden="true" />}
                    </span>
                    {t(chip.label)}
                    <span className={cn("font-medium", on && cat ? cat.ink : "text-ink-faint")}>{count(catCount(chip.id))}</span>
                  </button>
                );
              })}
            </div>

            {view === "board" ? (
              <div className="min-h-0 flex-1 overflow-y-auto bg-page px-4.5 pt-4 pb-1">
                {noMatch ? (
                  <NoMatch query={query.trim()} onClear={clearFilters} />
                ) : (
                  groups.map(({ cat, mine }) => (
                    <section key={cat.id} aria-label={t(cat.label)} className="mb-5">
                      <div className="mb-2.5 flex items-center gap-2.5">
                        <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-[9px]", cat.tile)}>
                          <CategoryIcon category={cat.id} className={cn("size-4", cat.ink)} />
                        </span>
                        <h3 className="text-[15.5px] font-bold text-ink">{t(cat.label)}</h3>
                        <span className={cn("rounded-full px-2.25 py-0.5 text-[12px] font-bold", cat.tile, cat.ink)}>{t(mine.length === 1 ? "{count} skill" : "{count} skills", { count: count(mine.length) })}</span>
                        <span aria-hidden="true" className="ml-1 h-px flex-1 bg-line" />
                      </div>
                      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
                        {mine.map(card)}
                        <button
                          type="button"
                          onClick={() => setForm({ editing: null, category: cat.id })}
                          aria-label={t("Add a skill to {category}", { category: t(cat.label) })}
                          className={cn("flex flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed p-4 text-[13.5px] font-semibold transition-[transform,background] hover:-translate-y-0.5 hover:bg-surface", cat.ink, mine.length ? "" : "min-h-53.5")}
                          style={{ borderColor: "color-mix(in srgb, currentColor 33%, transparent)" }}
                        >
                          <span className="flex size-9 items-center justify-center rounded-full bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
                            <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                          </span>
                          {t("Add a skill here")}
                        </button>
                      </div>
                    </section>
                  ))
                )}
              </div>
            ) : (
              <div role="table" aria-label={t("My skills")} className="flex min-h-0 flex-1 flex-col overflow-x-auto">
                <div className="min-w-[1040px]">
                  <div role="row" className={cn("grid shrink-0 items-center gap-x-3 border-b border-line bg-page px-4.5 py-2.25 text-[12px] font-semibold text-ink-muted", LIST_COLUMNS)}>
                    {sortHead("name", t("Skill"))}
                    <span role="columnheader">{t("Category")}</span>
                    {sortHead("pct", t("Progress"))}
                    <span role="columnheader">{t("Status")}</span>
                    <span role="columnheader">{t("Started")}</span>
                    {sortHead("last", t("Last practised"))}
                    <span role="columnheader" className="text-right">
                      {t("Actions")}
                    </span>
                  </div>
                  {noMatch ? (
                    <NoMatch query={query.trim()} onClear={clearFilters} />
                  ) : (
                    listItems.map((skill) => {
                      const state = stateOf(skill);
                      const cat = categoryOf(skill.category);
                      const { color, dark } = skillColors(skill);
                      const light = `color-mix(in srgb, ${color} 55%, var(--surface))`;
                      const progress = progressOf(skill);
                      const lastDay = summaries[skill.id]?.lastPractised ?? null;
                      return (
                        <div key={skill.id} role="row" onClick={() => router.push(skillHref(skill.id))} className={cn("grid cursor-pointer items-center gap-x-3 border-b border-divider px-4.5 py-2.75 transition-colors hover:bg-hover", LIST_COLUMNS, highlight === skill.id && "bg-emerald-soft")}>
                          <span role="cell" className="flex min-w-0 items-center gap-3">
                            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-white" style={{ background: `linear-gradient(140deg, ${color} 0%, ${dark} 100%)` }}>
                              <CategoryIcon category={skill.category} className="size-4.5" />
                            </span>
                            <span className="flex min-w-0 flex-col gap-px">
                              <Link href={skillHref(skill.id)} onClick={(event) => event.stopPropagation()} className="truncate text-[14.5px] font-semibold text-ink hover:underline">
                                {skill.name}
                              </Link>
                              <span className={cn("truncate text-[12.5px]", skill.source ? "text-ink-muted" : "text-ink-faint")}>{skill.source || "–"}</span>
                            </span>
                          </span>
                          <span role="cell" className="flex min-w-0 items-center gap-1.75 text-[13px] text-ink-2">
                            <span className={cn("inline-flex size-5.5 shrink-0 items-center justify-center rounded-[6px]", cat.tile)}>
                              <CategoryIcon category={cat.id} className={cn("size-3", cat.ink)} strokeWidth={2.25} />
                            </span>
                            <span className="truncate">{t(cat.label)}</span>
                          </span>
                          <span role="cell" className="flex min-w-0 flex-col gap-1.25">
                            <span className="block h-1.75 overflow-hidden rounded-full bg-surface-sunken">
                              <span className="block h-full rounded-full" style={{ width: `${Math.max(progress.pct, progress.pct ? 3 : 0)}%`, background: `linear-gradient(90deg, ${light}, ${color})` }} />
                            </span>
                            <span className="truncate text-[12px] text-ink-soft tabular-nums">
                              {doneText(skill, fmt)} / {totalText(skill, t, fmt)} ·{" "}
                              <b className={cn(state === "done" ? "text-tint-green-ink" : !progress.pct && "text-ink-faint")} style={state !== "done" && progress.pct ? { color: dark } : undefined}>
                                {count(progress.pct)}%
                              </b>
                            </span>
                          </span>
                          <span role="cell">
                            <StateChip state={state} className="px-2.25 text-[12px]" />
                          </span>
                          <span role="cell" className={cn("truncate text-[13px]", skill.startedAt ? "text-ink-2" : "text-ink-faint")}>
                            {skill.startedAt ? dayText(skill.startedAt.slice(0, 10), fmt, "dayMonthYY") : "–"}
                          </span>
                          <span role="cell" className={cn("truncate text-[13px]", lastDay ? "text-ink-2" : "text-ink-faint")}>
                            {lastDay ? agoText(lastDay, today, t, fmt, "d MMM yy") : "–"}
                          </span>
                          <span role="cell" className="flex justify-end gap-0.5">
                            {actions(skill, true)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
            <div className="flex shrink-0 items-center gap-2.5 border-t border-line px-4.5 py-2.5 text-[12.5px] text-ink-muted">
              <span className="truncate">
                {t("{count} skills · {learning} learning now · {done} completed", { count: count(skills.length), learning: count(learningCount), done: count(doneCount) })}
              </span>
              <span className="flex-1" />
              <Link href={SKILLS_DASHBOARD_HREF} className="shrink-0 font-semibold text-emerald hover:underline">
                {t("See the dashboard")} →
              </Link>
            </div>
          </>
        )}
      </section>

      <SkillFormDialog
        open={form !== null}
        onClose={() => setForm(null)}
        editing={form?.editing ?? null}
        hasPractice={form?.editing ? (summaries[form.editing.id]?.sessions ?? 0) > 0 : false}
        skills={skills}
        startCategory={form?.category}
        startState={form?.state}
        reminders={reminders}
        today={today}
        onSaved={(saved) => {
          setHighlight(saved.id);
          setQuery("");
          if (tab !== "all" && tab !== stateOf(saved)) setTab("all");
          if (category !== "all" && category !== categoryOf(saved.category).id) setCategory("all");
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        onClose={() => !isPending && setRemoving(null)}
        onConfirm={remove}
        isPending={isPending}
        title={t("Delete this skill?")}
        description={
          removing ? (
            <>
              <b className="text-ink">{removing.name}</b> {deleteBody(removing)}
            </>
          ) : (
            ""
          )
        }
        confirmLabel={t("Delete skill")}
      />
    </PageFrame>
  );
}

function NoMatch({ query, onClear }: { query: string; onClear: () => void }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center gap-2.5 px-5 py-14 text-center">
      <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[16px] bg-surface-sunken">
        <Search className="size-6 text-ink-muted" />
      </span>
      <span className="text-[15px] font-semibold text-ink">{query ? t("No skill matches \"{query}\"", { query }) : t("No skills here yet")}</span>
      <span className="text-[13.5px] text-ink-muted">{t("Try another word, or clear the filters to see every skill.")}</span>
      <button type="button" onClick={onClear} className={cn(LB_OUTLINE, "h-9")}>
        {t("Clear filters")}
      </button>
    </div>
  );
}
