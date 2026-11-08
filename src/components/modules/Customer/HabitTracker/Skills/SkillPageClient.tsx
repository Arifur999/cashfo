"use client";

import { ArrowLeft, CalendarDays, Check, ChevronDown, ChevronUp, CircleCheck, ExternalLink, FileText, Flame, Link2, List, ListChecks, MapPin, Pause, Pencil, Play, Plus, Quote, RotateCcw, Search, Target, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import PageFrame from "@/components/smartly/PageFrame";
import type { Reminder, Skill, SkillDetail, SkillNote, SkillResource } from "@/lib/customer/api";
import { actionError } from "@/lib/customer/habitDisplay";
import { longDay } from "@/lib/customer/libraryBoard";
import {
  addSkillNoteAction,
  addSkillResourceAction,
  addSkillStepAction,
  deleteSkillAction,
  logPracticeAction,
  moveSkillStepAction,
  removePracticeAction,
  removeSkillNoteAction,
  removeSkillResourceAction,
  removeSkillStepAction,
  restoreSkillAction,
  updateSkillAction,
  updateSkillStepAction,
} from "@/lib/customer/skillActions";
import {
  agoText,
  amountOf,
  calendarWeeks,
  categoryOf,
  daysAt,
  daysBetween,
  doneText,
  LEARNING_NOW_HREF,
  linkHost,
  MY_SKILLS_HREF,
  pace14,
  progressOf,
  RESOURCE_KINDS,
  type SkillState,
  STATE_INFO,
  stateInput,
  stateOf,
  streakOf,
  totalText,
  weekdayInitial,
} from "@/lib/customer/skillsBoard";
import { formatCount } from "@/lib/i18n/digits";
import { weekStartOf } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { LB_BTN, LB_CARD, LB_FIELD, LB_OUTLINE, LB_PRIMARY } from "../Books/LibraryBits";
import { useReminderBook } from "../Reminders";
import { PracticeDialog } from "./PracticeDialog";
import { CategoryIcon, RESOURCE_ICON, skillColors, StateChip } from "./SkillBits";
import { SkillFormDialog } from "./SkillFormDialog";
import { SkillCongratsDialog, SkillNoteFormDialog, SkillNoteViewDialog, SkillResourceDialog } from "./SkillPageDialogs";

type Tab = "log" | "roadmap" | "notes" | "resources";
const TABS: { id: Tab; label: string; icon: typeof CalendarDays }[] = [
  { id: "log", label: "Practice log", icon: CalendarDays },
  { id: "roadmap", label: "Roadmap", icon: ListChecks },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "resources", label: "Resources", icon: Link2 },
];
const STATE_INK: Record<SkillState, string> = { learning: "text-tint-blue-ink", want: "text-ink-soft", paused: "text-warning", done: "text-tint-green-ink" };
const ICON_BTN = "flex size-8 items-center justify-center rounded-[8px] text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent";

interface SkillPageClientProps {
  detail: SkillDetail;
  // Every skill, to keep one name to one skill in the edit popup.
  skills: Skill[];
  today: string;
  reminders: Reminder[] | null;
  startTab?: string;
}

// The status menu: what a skill in each state can move to.
const MENU: Record<SkillState, { to: SkillState; label: string; sub: string; icon: typeof Play; tone: string; message: string }[]> = {
  want: [
    { to: "learning", label: "Start learning", sub: "Move it to Learning now", icon: Play, tone: "bg-info-soft text-tint-blue-ink", message: "Started learning" },
    { to: "done", label: "Mark completed", sub: "You finished this skill", icon: CircleCheck, tone: "bg-success-soft text-tint-green-ink", message: "Marked as completed" },
  ],
  learning: [
    { to: "paused", label: "Pause", sub: "Take a break, keep the progress", icon: Pause, tone: "bg-warning-soft text-warning", message: "Paused" },
    { to: "done", label: "Mark completed", sub: "You finished this skill", icon: CircleCheck, tone: "bg-success-soft text-tint-green-ink", message: "Marked as completed" },
  ],
  paused: [
    { to: "learning", label: "Resume", sub: "Back to Learning now", icon: Play, tone: "bg-info-soft text-tint-blue-ink", message: "Resumed" },
    { to: "done", label: "Mark completed", sub: "You finished this skill", icon: CircleCheck, tone: "bg-success-soft text-tint-green-ink", message: "Marked as completed" },
  ],
  done: [{ to: "learning", label: "Not finished yet", sub: "Move it back to Learning", icon: RotateCcw, tone: "bg-surface-sunken text-ink-soft", message: "Moved back to Learning" }],
};

// Skills › a skill (the SkillDetail board): the skill with its progress,
// dates and streak, and four tabs -- every day of practice on a calendar and
// a list, the roadmap of steps, the notes and the resources.
export function SkillPageClient({ detail, skills, today, reminders: savedReminders, startTab }: SkillPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const reminders = useReminderBook(savedReminders);
  const { skill, logs, steps, notes, resources } = detail;
  const count = (n: number) => formatCount(n, fmt);
  const [tab, setTab] = useState<Tab>(TABS.some((item) => item.id === startTab) ? (startTab as Tab) : "log");
  const [menuOpen, setMenuOpen] = useState(false);
  const [practice, setPractice] = useState<{ day: string; lock: boolean } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [congrats, setCongrats] = useState(false);
  const [noteForm, setNoteForm] = useState<{ editing: SkillNote | null } | null>(null);
  const [viewNote, setViewNote] = useState<string | null>(null);
  const [resourceForm, setResourceForm] = useState<{ editing: SkillResource | null } | null>(null);
  const [newStep, setNewStep] = useState("");
  const [stepError, setStepError] = useState("");
  const [editStep, setEditStep] = useState<{ id: string; title: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const state = stateOf(skill);
  const cat = categoryOf(skill.category);
  const { color, dark, soft } = skillColors(skill);
  const progress = progressOf(skill);
  const asRows = logs.map((log) => ({ skillId: skill.id, date: log.date, amount: log.amount }));
  const pace = pace14(asRows, today);
  const days = daysAt(progress.left, pace);
  const streak = streakOf(logs.map((log) => log.date), today);
  const practisedToday = logs.some((log) => log.date === today);
  const started = skill.startedAt?.slice(0, 10) ?? null;
  const completed = skill.completedAt?.slice(0, 10) ?? null;
  const amount = (n: number) => amountOf(skill.unit, n, t, fmt);
  const dayWord = (n: number) => t(n === 1 ? "{count} day" : "{count} days", { count: count(n) });

  // Back to My skills a moment after a delete, unless it is undone.
  useEffect(() => {
    if (!deleted) return;
    const timer = window.setTimeout(() => router.push(MY_SKILLS_HREF), 5000);
    return () => window.clearTimeout(timer);
  }, [deleted, router]);

  function run(work: () => Promise<{ success: boolean; message?: string }>, fallback: string, done?: () => void) {
    startTransition(async () => {
      const result = await work();
      if (!result.success) return void toast.error(actionError(result.message, fallback, t, fmt));
      router.refresh();
      done?.();
    });
  }

  function moveTo(to: SkillState, message: string) {
    const from = state;
    setMenuOpen(false);
    run(
      () => updateSkillAction(skill.id, stateInput(to)),
      "Failed to save skill",
      () => {
        if (to === "done") setCongrats(true);
        toast.success(t(message), {
          action: {
            label: t("Undo"),
            onClick: async () => {
              await updateSkillAction(skill.id, stateInput(from));
              setCongrats(false);
              router.refresh();
            },
          },
        });
      },
    );
  }

  function removeSkill() {
    run(
      () => deleteSkillAction(skill.id),
      "Failed to remove skill",
      () => {
        setConfirmDelete(false);
        setDeleted(true);
      },
    );
  }

  function undoDelete() {
    run(
      () => restoreSkillAction(skill.id),
      "Failed to bring the skill back",
      () => setDeleted(false),
    );
  }

  // --- Hero numbers ---
  const leftText =
    state === "done"
      ? t("Completed on {date}", { date: completed ? longDay(completed, fmt) : "–" })
      : progress.left <= 0
        ? t("You reached the total. Mark it completed from Status.")
        : days && days <= 730
          ? t(days === 1 ? "{left} left · about {count} day at your pace" : "{left} left · about {count} days at your pace", { left: amount(progress.left), count: count(days) })
          : pace > 0
            ? t("{left} left · practise more often to finish sooner", { left: amount(progress.left) })
            : t("{left} left · log practice to see your pace", { left: amount(progress.left) });
  const targetSub = (() => {
    if (!skill.targetDate) return state === "done" ? null : { pill: false, text: t("Set one with Edit"), tone: "" };
    if (state === "done") return (completed ?? today) <= skill.targetDate ? { pill: true, text: t("Finished on time"), tone: "bg-success-soft text-tint-green-ink" } : { pill: true, text: t("Finished after target"), tone: "bg-warning-soft text-warning" };
    if (skill.targetDate < today) return { pill: true, text: t("Target passed · behind"), tone: "bg-expense-soft text-expense" };
    if (progress.left <= 0 || (days && daysBetween(today, skill.targetDate) >= days)) return { pill: true, text: t("On track"), tone: "bg-success-soft text-tint-green-ink" };
    if (days || pace > 0) return { pill: true, text: t("Behind · speed up a little"), tone: "bg-warning-soft text-warning" };
    return { pill: true, text: t("{days} to go · no pace yet", { days: dayWord(daysBetween(today, skill.targetDate)) }), tone: "bg-surface-sunken text-ink-soft" };
  })();
  const startedDays = started ? daysBetween(started, today) : 0;
  const tiles: { label: string; icon: typeof Play; iconTone: string; value: string; valueTone: string; sub: string; pill: string | null }[] = [
    { label: t("Started"), icon: Play, iconTone: "text-ink-muted", value: started ? longDay(started, fmt) : t("Not started"), valueTone: started ? "text-ink" : "text-ink-faint", sub: started ? (startedDays <= 0 ? t("Today") : t("{days} ago", { days: dayWord(startedDays) })) : t("Starts when you log practice"), pill: null },
    { label: t("Target date"), icon: Target, iconTone: "text-ink-muted", value: skill.targetDate ? longDay(skill.targetDate, fmt) : t("No target"), valueTone: skill.targetDate ? "text-ink" : "text-ink-faint", sub: targetSub?.text ?? "", pill: targetSub?.pill ? targetSub.tone : null },
    { label: t("Streak"), icon: Flame, iconTone: streak ? "text-orange-fill" : "text-ink-faint", value: dayWord(streak), valueTone: streak ? "text-orange" : "text-ink-faint", sub: practisedToday ? t("Practised today") : streak ? t("Practise today to keep it") : t("Start a new streak today"), pill: null },
    { label: t("Sessions"), icon: List, iconTone: "text-ink-muted", value: count(logs.length), valueTone: "text-ink", sub: logs.length ? `${t("Last:")} ${agoText(logs[0].date, today, t, fmt)}` : t("None yet"), pill: null },
  ];

  // --- The calendar: 12 weeks from the reader's first day ---
  const byDay = new Map(logs.map((log) => [log.date, log.amount]));
  const weeks = calendarWeeks(today, 12, weekStartOf(fmt));
  const levelFor = (v: number) => (skill.unit === "HOURS" ? (v >= 90 ? 4 : v >= 60 ? 3 : v >= 30 ? 2 : v > 0 ? 1 : 0) : v >= 4 ? 4 : v >= 3 ? 3 : v >= 2 ? 2 : v >= 1 ? 1 : 0);
  const shade = (level: number) => (level === 0 ? "var(--surface-sunken)" : `color-mix(in srgb, ${color} ${[0, 28, 52, 78, 100][level]}%, var(--surface))`);
  const cells = weeks.flat().filter((day): day is string => !!day);
  const total84 = cells.reduce((sum, day) => sum + (byDay.get(day) ?? 0), 0);
  const active84 = cells.filter((day) => (byDay.get(day) ?? 0) > 0).length;
  const best = cells.reduce<{ day: string; v: number } | null>((top, day) => ((byDay.get(day) ?? 0) > (top?.v ?? 0) ? { day, v: byDay.get(day) ?? 0 } : top), null);
  const longest = (() => {
    let run = 0;
    let most = 0;
    let previous: string | null = null;
    for (const day of [...byDay.keys()].sort()) {
      run = previous && daysBetween(previous, day) === 1 ? run + 1 : 1;
      most = Math.max(most, run);
      previous = day;
    }
    return most;
  })();
  const monthLabels = weeks.map((week, i) => {
    const first = week[0] ?? today;
    const before = i > 0 ? (weeks[i - 1][0] ?? today) : null;
    const show = i === 0 ? Number(first.slice(8, 10)) <= 7 : first.slice(5, 7) !== before?.slice(5, 7);
    return show ? new Intl.DateTimeFormat(fmt.locale === "bn" ? "bn-BD" : "en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${first}T00:00:00.000Z`)) : "";
  });

  const stepsDone = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done);

  function addStep() {
    const title = newStep.trim();
    if (!title) return setStepError(t("Write the step first."));
    run(
      () => addSkillStepAction(skill.id, { title }),
      "Failed to save the step",
      () => {
        setNewStep("");
        toast.success(t("Step added"));
      },
    );
  }

  function saveStepEdit() {
    if (!editStep) return;
    const title = editStep.title.trim();
    if (!title) return setEditStep({ ...editStep, error: true });
    const id = editStep.id;
    run(
      () => updateSkillStepAction(skill.id, id, { title }),
      "Failed to save the step",
      () => {
        setEditStep(null);
        toast.success(t("Step saved"));
      },
    );
  }

  const deleteNote = (note: SkillNote) => {
    const at = notes.findIndex((n) => n.id === note.id);
    run(
      () => removeSkillNoteAction(skill.id, note.id),
      "Failed to remove the note",
      () => {
        setViewNote(notes[at + 1]?.id ?? notes[at - 1]?.id ?? null);
        toast(t("Note deleted"), {
          action: {
            label: t("Undo"),
            onClick: async () => {
              await addSkillNoteAction(skill.id, { title: note.title, text: note.text, date: note.date });
              router.refresh();
            },
          },
        });
      },
    );
  };

  if (deleted) {
    return (
      <PageFrame className="min-h-[70dvh] gap-3.5 leading-[normal] md:pt-4 md:pb-5.5">
        <BackLink />
        <section className={cn(LB_CARD, "flex flex-1 flex-col items-center justify-center gap-3 rounded-[16px] p-8 text-center")}>
          <span aria-hidden="true" className="flex size-15 items-center justify-center rounded-[18px] bg-expense-soft">
            <Trash2 className="size-7 text-expense" strokeWidth={1.8} />
          </span>
          <span className="text-[18px] font-bold text-ink">{t("{name} was deleted", { name: skill.name })}</span>
          <span className="text-[14px] text-ink-muted">{t("Taking you back to My skills in a moment.")}</span>
          <div className="flex gap-2.5">
            <button type="button" onClick={undoDelete} disabled={isPending} className={LB_OUTLINE}>
              {t("Undo")}
            </button>
            <Link href={MY_SKILLS_HREF} className={LB_PRIMARY}>
              {t("Go now")}
            </Link>
          </div>
        </section>
      </PageFrame>
    );
  }

  return (
    <PageFrame className="gap-3.5 leading-[normal] md:pt-4 md:pb-5.5">
      <BackLink />

      <section className="relative rounded-[16px] border border-line shadow-card" style={{ background: `linear-gradient(115deg, ${soft} 0%, var(--surface) 42%)` }}>
        <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-4.5 px-5 pt-4.5 pb-4 max-lg:grid-cols-[56px_minmax(0,1fr)]">
          <span aria-hidden="true" className="flex size-19 items-center justify-center rounded-[20px] text-white max-lg:size-14" style={{ background: `linear-gradient(145deg, ${color} 0%, ${dark} 100%)`, boxShadow: `0 10px 22px ${color}55` }}>
            <CategoryIcon category={skill.category} className="size-9 max-lg:size-7" strokeWidth={1.9} />
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="min-w-0 truncate text-[25px] leading-[1.25] font-bold tracking-[-0.02em] text-ink">{skill.name}</h1>
              <StateChip state={state} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-[13px]">
              <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold", cat.tile, cat.ink)}>
                <CategoryIcon category={cat.id} className="size-3.25" strokeWidth={2.2} />
                {t(cat.label)}
              </span>
              {skill.source && (
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 font-medium text-ink-2">
                  <MapPin className="size-3.25 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="truncate">{skill.source}</span>
                </span>
              )}
              {skill.link && (
                <a href={skill.link} target="_blank" rel="noopener noreferrer" title={t("Open link")} className="inline-flex shrink-0 items-center gap-1.25 rounded-full border border-line bg-surface px-2.5 py-1 font-semibold text-emerald hover:border-emerald">
                  <ExternalLink className="size-3.25" strokeWidth={2.2} aria-hidden="true" />
                  {t("Open link")}
                </a>
              )}
            </div>
            {skill.why && (
              <div className="flex max-w-160 min-w-0 items-center gap-2 rounded-[0_10px_10px_0] border-l-3 px-3 py-1.75" style={{ borderLeftColor: color, background: `color-mix(in srgb, ${color} 6%, var(--surface))` }}>
                <Quote className="size-3.5 shrink-0 opacity-70" style={{ color }} fill="currentColor" aria-hidden="true" />
                <span className="truncate text-[13.5px] text-ink-2 italic">{skill.why}</span>
              </div>
            )}
          </div>
          <div className="relative flex flex-wrap items-center gap-2 self-start max-lg:col-span-2">
            <button type="button" onClick={() => setPractice({ day: today, lock: false })} className={LB_PRIMARY} style={{ boxShadow: "0 6px 16px color-mix(in srgb, var(--primary) 25%, transparent)" }}>
              <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
              {t("Log practice")}
            </button>
            <button type="button" onClick={() => setEditOpen(true)} className={LB_OUTLINE}>
              <Pencil className="size-3.75" aria-hidden="true" />
              {t("Edit")}
            </button>
            <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className={LB_OUTLINE}>
              {t("Status")}
              <ChevronDown className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} aria-label={t("Delete skill")} title={t("Delete skill")} className={cn(LB_BTN, "w-10 border border-expense-line bg-surface px-0 text-expense hover:bg-expense-soft")}>
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div role="menu" aria-label={t("Change status")} className="absolute top-12 right-12 z-41 flex w-62.5 flex-col gap-0.5 rounded-[12px] border border-line bg-surface p-1.5 shadow-overlay">
                  <span className="mb-1 border-b border-divider px-2.5 pt-1.5 pb-2 text-[12px] text-ink-muted">
                    {t("Now:")} <b className={STATE_INK[state]}>{t(STATE_INFO[state].label)}</b>
                  </span>
                  {MENU[state].map((item) => (
                    <button key={item.label} type="button" role="menuitem" onClick={() => moveTo(item.to, item.message)} disabled={isPending} className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13.5px] font-semibold text-ink hover:bg-hover">
                      <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-[8px]", item.tone)}>
                        <item.icon className="size-3.75" strokeWidth={2.2} aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-px">
                        <span>{t(item.label)}</span>
                        <span className="text-[12px] font-normal text-ink-muted">{t(item.sub)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1.55fr)_repeat(4,minmax(0,1fr))] border-t border-divider max-lg:grid-cols-2">
          <div className="flex min-w-0 items-center gap-3.5 px-5 py-3.5">
            <span className="relative size-16 shrink-0">
              <svg viewBox="0 0 36 36" className="size-16 -rotate-90" aria-hidden="true">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--surface-sunken)" strokeWidth="3.6" />
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round" strokeDasharray={`${progress.pct} 100`} strokeOpacity={progress.pct > 0 ? 1 : 0} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[14px] font-bold tabular-nums">{count(progress.pct)}%</span>
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-[17px] font-bold tabular-nums">
                {doneText(skill, fmt)} / {totalText(skill, t, fmt)} · {count(progress.pct)}%
              </span>
              <span className="line-clamp-2 text-[12.5px] leading-[1.45] text-ink-soft">{leftText}</span>
            </div>
          </div>
          {tiles.map((tile) => (
            <div key={tile.label} className="flex min-w-0 flex-col justify-center gap-1 border-l border-divider px-4 py-3.5">
              <span className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                <tile.icon className={cn("size-3.5", tile.iconTone)} aria-hidden="true" />
                {tile.label}
              </span>
              <span className={cn("truncate text-[15px] font-bold tabular-nums", tile.valueTone)}>{tile.value}</span>
              {tile.pill ? <span className={cn("max-w-full self-start truncate rounded-full px-2 py-px text-[11.5px] font-semibold", tile.pill)}>{tile.sub}</span> : tile.sub && <span className="truncate text-[11.5px] text-ink-muted">{tile.sub}</span>}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-line">
        <div role="tablist" aria-label={t("Skill sections")} className="flex gap-6.5 overflow-x-auto">
          {TABS.map((item) => {
            const on = tab === item.id;
            const n = item.id === "log" ? logs.length : item.id === "roadmap" ? steps.length : item.id === "notes" ? notes.length : resources.length;
            return (
              <button key={item.id} type="button" role="tab" aria-selected={on} onClick={() => setTab(item.id)} className={cn("inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-0.5 text-[14.5px] font-semibold whitespace-nowrap", on ? "border-primary text-emerald" : "border-transparent text-ink-muted hover:text-ink")}>
                <item.icon className="size-4" aria-hidden="true" />
                {t(item.id === "notes" ? "Notes@@book" : item.label)}
                <span className={cn("inline-flex h-5 min-w-5.5 items-center justify-center rounded-full px-1.75 text-[12px] tabular-nums", on ? "bg-emerald-soft text-emerald" : "bg-surface-sunken text-ink-muted")}>{count(n)}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2.5 pb-1.5">
          {tab === "notes" && (
            <button type="button" onClick={() => setNoteForm({ editing: null })} className={cn(LB_PRIMARY, "h-9")}>
              <Plus className="size-3.75" strokeWidth={2.5} aria-hidden="true" />
              {t("New note")}
            </button>
          )}
          {tab === "resources" && (
            <button type="button" onClick={() => setResourceForm({ editing: null })} className={cn(LB_PRIMARY, "h-9")}>
              <Plus className="size-3.75" strokeWidth={2.5} aria-hidden="true" />
              {t("Add resource")}
            </button>
          )}
          {tab === "log" && <span className="text-[12.5px] text-ink-muted">{t("Click any day to log or edit it")}</span>}
        </div>
      </div>

      {tab === "log" && (
        <div className="flex flex-col gap-3">
          <section className={cn(LB_CARD, "grid items-stretch max-xl:grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)]")}>
            <div className="overflow-x-auto py-3.5 pr-5 pl-4">
              <div className="grid w-max grid-cols-[22px_auto] gap-x-1.5 gap-y-1">
                <span />
                <div className="grid h-3.5 grid-cols-[repeat(12,16px)] gap-x-1">
                  {monthLabels.map((label, i) => (
                    <span key={i} className="overflow-visible text-[10.5px] leading-3.5 whitespace-nowrap text-ink-muted">
                      {label}
                    </span>
                  ))}
                </div>
                <div className="grid grid-rows-[repeat(7,16px)] gap-y-1">
                  {(weeks[0] ?? []).map((day, r) => (
                    <span key={r} className="text-right text-[10px] leading-4 text-ink-faint">
                      {weekdayInitial(weeks[weeks.length - 1][r] ?? day ?? today, fmt)}
                    </span>
                  ))}
                </div>
                <div className="relative grid auto-cols-[16px] grid-flow-col grid-rows-[repeat(7,16px)] gap-1">
                  {weeks.flat().map((day, i) => {
                    if (!day) return <span key={`f${i}`} aria-hidden="true" />;
                    const v = byDay.get(day) ?? 0;
                    const label = `${longDay(day, fmt)} · ${v ? amount(v) : t("No practice")}`;
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-label={label}
                        title={label}
                        onClick={() => setPractice({ day, lock: false })}
                        className={cn("size-4 rounded-[4px] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-focus-ring", day === today && "outline-2 outline-offset-1 outline-ink")}
                        style={{ background: shade(levelFor(v)) }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-col justify-between gap-3 border-l border-divider px-5 py-3.5 max-xl:border-t max-xl:border-l-0">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14.5px] font-bold text-ink">{t("Last 12 weeks")}</span>
                <span className="flex items-center gap-1 text-[11.5px] text-ink-muted">
                  {t("Less")}
                  {[0, 1, 2, 3, 4].map((level) => (
                    <span key={level} aria-hidden="true" className="size-3 rounded-[3px]" style={{ background: shade(level) }} />
                  ))}
                  {t("More")}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2.5 max-sm:grid-cols-2">
                {[
                  { label: t("Total practice"), value: amount(total84), sub: t("in 12 weeks"), tone: "", style: { background: soft, color: dark } },
                  { label: t("Days practised"), value: dayWord(active84), sub: t("out of 84"), tone: "bg-page text-ink" },
                  { label: t("Best day"), value: best ? amount(best.v) : "–", sub: best ? longDay(best.day, fmt) : t("No practice yet"), tone: "bg-page text-ink" },
                  { label: t("Longest streak"), value: dayWord(longest), sub: `${t("Now:")} ${dayWord(streak)}`, tone: "bg-orange-soft/60 text-orange" },
                ].map((stat) => (
                  <div key={stat.label} className={cn("flex min-w-0 flex-col gap-1 rounded-[12px] p-3", stat.tone)} style={stat.style}>
                    <span className="truncate text-[12px] text-ink-muted">{stat.label}</span>
                    <span className="truncate text-[18px] font-bold tabular-nums">{stat.value}</span>
                    <span className="truncate text-[11.5px] text-ink-faint">{stat.sub}</span>
                  </div>
                ))}
              </div>
              <span className="text-[12px] text-ink-faint">{t("Darker days mean more practice. Hover a day to see the amount.")}</span>
            </div>
          </section>

          <section className={cn(LB_CARD, "flex flex-col overflow-hidden")}>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2.5 p-6 text-center">
                <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[16px]" style={{ background: soft }}>
                  <CalendarDays className="size-6" style={{ color }} strokeWidth={1.9} />
                </span>
                <span className="text-[16px] font-semibold text-ink">{t("No practice logged yet")}</span>
                <span className="max-w-105 text-[13.5px] text-ink-muted">{t("Each time you practise, log it here. The calendar above fills up day by day.")}</span>
                <button type="button" onClick={() => setPractice({ day: today, lock: false })} className={LB_PRIMARY}>
                  {t("Log your first practice")}
                </button>
              </div>
            ) : (
              <>
                <div className="grid shrink-0 grid-cols-[210px_130px_minmax(0,1fr)_72px] gap-x-4 border-b border-line bg-page px-4.5 py-2.5 text-[12px] font-semibold text-ink-muted max-md:grid-cols-[1fr_100px_60px]">
                  <span>{t("Date")}</span>
                  <span>{t("Amount")}</span>
                  <span className="max-md:hidden">{t("What you learned")}</span>
                  <span />
                </div>
                {logs.map((log) => {
                  const ago = daysBetween(log.date, today);
                  return (
                    <div key={log.date} className="grid grid-cols-[210px_130px_minmax(0,1fr)_72px] items-center gap-x-4 border-b border-divider px-4.5 py-2.5 transition-colors hover:bg-hover max-md:grid-cols-[1fr_100px_60px]">
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className="truncate text-[14px] font-semibold text-ink">{longDay(log.date, fmt)}</span>
                        {ago < 7 && <span className="text-[12px] text-ink-faint">{agoText(log.date, today, t, fmt)}</span>}
                      </span>
                      <span className="justify-self-start rounded-full px-2.5 py-0.75 text-[13px] font-bold whitespace-nowrap tabular-nums" style={{ background: soft, color: dark }}>
                        +{amount(log.amount)}
                      </span>
                      {log.note ? <span className="truncate text-[13.5px] text-ink-2 max-md:hidden">{log.note}</span> : <span className="text-[13px] text-ink-faint italic max-md:hidden">{t("No note")}</span>}
                      <span className="flex justify-end gap-1">
                        <button type="button" onClick={() => setPractice({ day: log.date, lock: true })} aria-label={t("Edit this entry")} title={t("Edit this entry")} className={ICON_BTN}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            run(
                              () => removePracticeAction(skill.id, log.date),
                              "Failed to remove the practice",
                              () =>
                                toast(t("Entry deleted"), {
                                  action: {
                                    label: t("Undo"),
                                    onClick: async () => {
                                      await logPracticeAction(skill.id, log.date, { amount: log.amount, note: log.note, finish: false });
                                      router.refresh();
                                    },
                                  },
                                }),
                            )
                          }
                          aria-label={t("Delete this entry")}
                          title={t("Delete this entry")}
                          className={cn(ICON_BTN, "hover:bg-expense-soft hover:text-expense")}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </section>
        </div>
      )}

      {tab === "roadmap" && (
        <section className={cn(LB_CARD, "flex flex-col overflow-hidden")}>
          <div className="flex flex-wrap items-center gap-4.5 border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-bold whitespace-nowrap text-ink">{t("{done} of {total} steps done", { done: count(stepsDone), total: count(steps.length) })}</span>
            <span className="h-2 w-60 overflow-hidden rounded-full bg-surface-sunken max-sm:w-full">
              <span className="block h-full rounded-full" style={{ width: `${steps.length ? Math.round((stepsDone / steps.length) * 100) : 0}%`, background: `linear-gradient(90deg, ${color} 0%, ${dark} 100%)` }} />
            </span>
            {nextStep ? (
              <span className="min-w-0 truncate text-[13px] text-ink-soft">
                {t("Next:")} <b className="text-ink">{nextStep.title}</b>
              </span>
            ) : steps.length > 0 ? (
              <span className="text-[13px] font-semibold text-tint-green-ink">{t("All steps done. Well done!")}</span>
            ) : null}
          </div>
          <div>
            {steps.length === 0 ? (
              <div className="flex min-h-50 flex-col items-center justify-center gap-2.5 p-6 text-center">
                <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[16px]" style={{ background: soft }}>
                  <ListChecks className="size-6" style={{ color }} strokeWidth={1.9} />
                </span>
                <span className="text-[16px] font-semibold text-ink">{t("No steps yet")}</span>
                <span className="max-w-105 text-[13.5px] text-ink-muted">{t("Break the skill into small steps and tick them off one by one.")}</span>
              </div>
            ) : (
              steps.map((step, i) => {
                const editing = editStep?.id === step.id;
                return (
                  <div key={step.id} className="box-border grid min-h-13 grid-cols-[28px_26px_minmax(0,1fr)_auto_140px] items-center gap-x-3 border-b border-divider px-5 py-1.5 transition-colors hover:bg-hover max-md:grid-cols-[28px_26px_minmax(0,1fr)_auto]">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={step.done}
                      aria-label={(step.done ? t("Mark as not done: ") : t("Mark as done: ")) + step.title}
                      onClick={() => run(() => updateSkillStepAction(skill.id, step.id, { done: !step.done }), "Failed to save the step", () => !step.done && toast.success(`${t("Step done · ")}${longDay(today, fmt)}`))}
                      className={cn("flex size-6 items-center justify-center rounded-[7px] border-2", step.done ? "border-success bg-success" : "border-input bg-surface hover:border-emerald")}
                    >
                      {step.done && <Check className="size-3.5 text-white" strokeWidth={3.5} aria-hidden="true" />}
                    </button>
                    <span className={cn("flex size-6 items-center justify-center rounded-full text-[12px] font-bold tabular-nums", step.done && "bg-success-soft text-tint-green-ink")} style={step.done ? undefined : { background: soft, color: dark }}>
                      {count(i + 1)}
                    </span>
                    {editing && editStep ? (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <input
                          autoFocus
                          value={editStep.title}
                          maxLength={120}
                          onChange={(event) => setEditStep({ ...editStep, title: event.target.value, error: false })}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveStepEdit();
                            if (event.key === "Escape") setEditStep(null);
                          }}
                          aria-label={t("Edit step")}
                          aria-invalid={editStep.error || undefined}
                          className={cn(LB_FIELD, "h-9")}
                        />
                        <button type="button" onClick={saveStepEdit} aria-label={t("Save")} title={t("Save")} className={cn(ICON_BTN, "text-tint-green-ink")}>
                          <Check className="size-4.25" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => setEditStep(null)} aria-label={t("Cancel")} title={t("Cancel")} className={ICON_BTN}>
                          <X className="size-4" strokeWidth={2.2} aria-hidden="true" />
                        </button>
                      </span>
                    ) : (
                      <span className={cn("truncate text-[14.5px] font-medium", step.done ? "text-ink-muted line-through" : "text-ink")}>{step.title}</span>
                    )}
                    <span className="text-[12.5px] whitespace-nowrap text-tint-green-ink max-md:hidden">{step.done && step.doneOn ? t("Done · {date}", { date: longDay(step.doneOn, fmt) }) : ""}</span>
                    <span className="flex justify-end gap-0.5">
                      <button type="button" onClick={() => run(() => moveSkillStepAction(skill.id, step.id, "up"), "Failed to move the step")} disabled={i === 0 || isPending} aria-label={t("Move up")} title={t("Move up")} className={ICON_BTN}>
                        <ChevronUp className="size-4" strokeWidth={2.25} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => run(() => moveSkillStepAction(skill.id, step.id, "down"), "Failed to move the step")} disabled={i === steps.length - 1 || isPending} aria-label={t("Move down")} title={t("Move down")} className={ICON_BTN}>
                        <ChevronDown className="size-4" strokeWidth={2.25} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => setEditStep({ id: step.id, title: step.title, error: false })} aria-label={t("Edit step")} title={t("Edit step")} className={ICON_BTN}>
                        <Pencil className="size-3.75" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          run(
                            () => removeSkillStepAction(skill.id, step.id),
                            "Failed to remove the step",
                            () =>
                              toast(t("Step deleted"), {
                                action: {
                                  label: t("Undo"),
                                  onClick: async () => {
                                    await addSkillStepAction(skill.id, { title: step.title, position: i, done: step.done, ...(step.doneOn ? { doneOn: step.doneOn } : {}) });
                                    router.refresh();
                                  },
                                },
                              }),
                          )
                        }
                        aria-label={t("Delete step")}
                        title={t("Delete step")}
                        className={cn(ICON_BTN, "hover:bg-expense-soft hover:text-expense")}
                      >
                        <Trash2 className="size-3.75" aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex flex-col gap-1.5 border-t border-line bg-page px-5 py-3">
            <div className="flex gap-2.5">
              <span className="relative block flex-1">
                <Plus className="pointer-events-none absolute top-3.25 left-3 size-4 text-ink-faint" strokeWidth={2.5} aria-hidden="true" />
                <input
                  value={newStep}
                  maxLength={120}
                  onChange={(event) => {
                    setNewStep(event.target.value);
                    setStepError("");
                  }}
                  onKeyDown={(event) => event.key === "Enter" && addStep()}
                  placeholder={t("Add a step, then press Enter")}
                  aria-label={t("Add a step")}
                  aria-invalid={!!stepError || undefined}
                  className={cn(LB_FIELD, "pl-9")}
                />
              </span>
              <button type="button" onClick={addStep} disabled={isPending} className={LB_PRIMARY}>
                {t("Add")}
              </button>
            </div>
            {stepError && <span className="text-[12.5px] text-expense">{stepError}</span>}
          </div>
        </section>
      )}

      {tab === "notes" &&
        (notes.length === 0 ? (
          <section className={cn(LB_CARD, "flex min-h-65 flex-col items-center justify-center gap-2.5 p-6 text-center")}>
            <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[16px]" style={{ background: soft }}>
              <Pencil className="size-6" style={{ color }} strokeWidth={1.9} />
            </span>
            <span className="text-[16px] font-semibold text-ink">{t("No notes yet")}</span>
            <span className="max-w-105 text-[13.5px] text-ink-muted">{t("Write down what you learn so you can look back later.")}</span>
            <button type="button" onClick={() => setNoteForm({ editing: null })} className={LB_PRIMARY}>
              {t("Write your first note")}
            </button>
          </section>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {notes.map((note) => (
              <button key={note.id} type="button" onClick={() => setViewNote(note.id)} aria-label={t("Open note: {title}", { title: note.title })} className="relative box-border flex h-44 flex-col gap-2 overflow-hidden rounded-[14px] border border-line bg-surface px-4.5 py-4 text-left shadow-card transition-transform hover:-translate-y-0.5">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
                <span className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                  <CalendarDays className="size-3.25" aria-hidden="true" />
                  {longDay(note.date, fmt)}
                </span>
                <span className="truncate text-[15.5px] font-bold text-ink">{note.title}</span>
                <span className="line-clamp-4 text-[13.5px] leading-[1.6] text-ink-soft">{note.text}</span>
              </button>
            ))}
            <button type="button" onClick={() => setNoteForm({ editing: null })} className="flex h-44 flex-col items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-input text-[14px] font-semibold text-ink-muted transition-transform hover:-translate-y-0.5">
              <span className="flex size-10 items-center justify-center rounded-[12px]" style={{ background: soft }}>
                <Plus className="size-4.5" style={{ color }} strokeWidth={2.5} aria-hidden="true" />
              </span>
              {t("New note")}
            </button>
          </div>
        ))}

      {tab === "resources" && (
        <section className={cn(LB_CARD, "flex flex-col overflow-hidden")}>
          {resources.length === 0 ? (
            <div className="flex min-h-55 flex-col items-center justify-center gap-2.5 p-6 text-center">
              <span aria-hidden="true" className="flex size-13 items-center justify-center rounded-[16px]" style={{ background: soft }}>
                <Link2 className="size-6" style={{ color }} strokeWidth={1.9} />
              </span>
              <span className="text-[16px] font-semibold text-ink">{t("No resources yet")}</span>
              <span className="max-w-105 text-[13.5px] text-ink-muted">{t("Keep your courses, videos, books and links in one place.")}</span>
              <button type="button" onClick={() => setResourceForm({ editing: null })} className={LB_PRIMARY}>
                {t("Add your first resource")}
              </button>
            </div>
          ) : (
            <>
              {resources.map((resource) => {
                const Icon = RESOURCE_ICON[resource.kind];
                return (
                  <div key={resource.id} className="grid grid-cols-[42px_minmax(0,1fr)_110px_auto] items-center gap-x-3.5 border-b border-divider px-4.5 py-3 transition-colors hover:bg-hover max-sm:grid-cols-[42px_minmax(0,1fr)_auto]">
                    <span aria-hidden="true" className="flex size-10.5 items-center justify-center rounded-[12px]" style={{ background: soft }}>
                      <Icon className="size-5" style={{ color }} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[14.5px] font-semibold text-ink">{resource.title}</span>
                      {resource.url ? (
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="truncate text-[12.5px] text-emerald hover:underline">
                          {linkHost(resource.url)}
                        </a>
                      ) : (
                        <span className="text-[12.5px] text-ink-faint">{t("No link")}</span>
                      )}
                    </span>
                    <span className="justify-self-start rounded-full bg-surface-sunken px-2.5 py-0.75 text-[12px] font-semibold text-ink-soft max-sm:hidden">{t(RESOURCE_KINDS.find((kind) => kind.id === resource.kind)?.label ?? "Link")}</span>
                    <span className="flex justify-end gap-1">
                      {resource.url && (
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" aria-label={t("Open link")} title={t("Open link")} className={ICON_BTN}>
                          <ExternalLink className="size-4" aria-hidden="true" />
                        </a>
                      )}
                      <button type="button" onClick={() => setResourceForm({ editing: resource })} aria-label={t("Edit resource")} title={t("Edit resource")} className={ICON_BTN}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          run(
                            () => removeSkillResourceAction(skill.id, resource.id),
                            "Failed to remove the resource",
                            () =>
                              toast(t("Resource deleted"), {
                                action: {
                                  label: t("Undo"),
                                  onClick: async () => {
                                    await addSkillResourceAction(skill.id, { kind: resource.kind, title: resource.title, url: resource.url });
                                    router.refresh();
                                  },
                                },
                              }),
                          )
                        }
                        aria-label={t("Delete resource")}
                        title={t("Delete resource")}
                        className={cn(ICON_BTN, "hover:bg-expense-soft hover:text-expense")}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                );
              })}
              <button type="button" onClick={() => setResourceForm({ editing: null })} className="flex w-full items-center gap-3.5 px-4.5 py-3 text-left text-[14px] font-semibold text-ink-muted transition-colors hover:bg-hover">
                <span aria-hidden="true" className="box-border flex size-10.5 items-center justify-center rounded-[12px] border-[1.5px] border-dashed border-input">
                  <Plus className="size-4.5 text-ink-faint" strokeWidth={2.5} />
                </span>
                {t("Add resource")}
              </button>
            </>
          )}
        </section>
      )}

      <PracticeDialog open={practice !== null} onClose={() => setPractice(null)} skill={skill} entries={logs} pace={pace} today={today} day={practice?.day} lockDay={practice?.lock} onCompleted={() => setCongrats(true)} />
      <SkillFormDialog open={editOpen} onClose={() => setEditOpen(false)} editing={skill} hasPractice={logs.length > 0} skills={skills} reminders={reminders} today={today} onSaved={(saved) => saved.status === "COMPLETED" && skill.status !== "COMPLETED" && setCongrats(true)} />
      <SkillNoteFormDialog
        open={noteForm !== null}
        onClose={() => setNoteForm(null)}
        skill={skill}
        editing={noteForm?.editing ?? null}
        today={today}
        onSaved={(note, created) => {
          router.refresh();
          toast.success(t(created ? "Note saved" : "Note updated"));
          if (!created) setViewNote(note.id);
        }}
      />
      <SkillNoteViewDialog
        open={viewNote !== null && noteForm === null}
        onClose={() => setViewNote(null)}
        skill={skill}
        notes={notes}
        noteId={viewNote}
        onMove={setViewNote}
        onEdit={(note) => setNoteForm({ editing: note })}
        onDelete={deleteNote}
      />
      <SkillResourceDialog
        open={resourceForm !== null}
        onClose={() => setResourceForm(null)}
        skill={skill}
        editing={resourceForm?.editing ?? null}
        onSaved={(_, created) => {
          router.refresh();
          toast.success(t(created ? "Resource saved" : "Resource updated"));
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => !isPending && setConfirmDelete(false)}
        onConfirm={removeSkill}
        isPending={isPending}
        title={t("Delete this skill?")}
        description={
          <>
            <b className="text-ink">{skill.name}</b> {t("will be removed, along with its practice log, roadmap, notes and resources. You can undo it right after.")}
          </>
        }
        confirmLabel={t("Delete skill")}
      />
      <SkillCongratsDialog
        open={congrats}
        onClose={() => setCongrats(false)}
        skill={skill}
        stats={[
          { value: count(logs.length), label: t("Sessions") },
          { value: started ? dayWord(daysBetween(started, completed ?? today) + 1) : "–", label: t("Days taken") },
          { value: totalText(skill, t, fmt), label: t("Total") },
        ]}
        onNext={() => router.push(LEARNING_NOW_HREF)}
      />
    </PageFrame>
  );
}

function BackLink() {
  const { t } = useLocale();
  return (
    <Link href={MY_SKILLS_HREF} className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-semibold text-ink-soft hover:text-ink">
      <ArrowLeft className="size-4" strokeWidth={2.25} aria-hidden="true" />
      {t("My skills")}
    </Link>
  );
}

// A skill page whose skill is gone.
export function SkillMissing() {
  const { t } = useLocale();
  return (
    <PageFrame className="min-h-[70dvh] gap-3.5 leading-[normal] md:pt-4 md:pb-5.5">
      <BackLink />
      <section className={cn(LB_CARD, "flex flex-1 flex-col items-center justify-center gap-3 rounded-[16px] p-8 text-center")}>
        <span aria-hidden="true" className="flex size-15 items-center justify-center rounded-[18px] bg-surface-sunken">
          <Search className="size-7 text-ink-muted" strokeWidth={1.8} />
        </span>
        <span className="text-[18px] font-bold text-ink">{t("Skill not found")}</span>
        <span className="max-w-105 text-[14px] text-ink-muted">{t("It may have been deleted. Open My skills to see the rest.")}</span>
        <Link href={MY_SKILLS_HREF} className={LB_PRIMARY}>
          {t("Go to My skills")}
        </Link>
      </section>
    </PageFrame>
  );
}
