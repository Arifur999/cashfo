"use client";

import { ArrowRight, Check, ChevronRight, Clock, FileText, Flag, GraduationCap, Pause, Pencil, Play, Plus, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import PageFrame from "@/components/smartly/PageFrame";
import type { Reminder, Skill, SkillsOverview } from "@/lib/customer/api";
import { actionError, dayText } from "@/lib/customer/habitDisplay";
import { longDay } from "@/lib/customer/libraryBoard";
import { updateSkillAction } from "@/lib/customer/skillActions";
import {
  agoText,
  amountOf,
  categoryOf,
  daysAt,
  doneText,
  logsOf,
  MY_SKILLS_HREF,
  pace14,
  perDayToTarget,
  progressOf,
  skillHref,
  skillWeek,
  stateInput,
  stateOf,
  STATE_INFO,
  targetLine,
  totalText,
  weekStartDay,
} from "@/lib/customer/skillsBoard";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { weekStartOf } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInitial } from "@/lib/customer/libraryBoard";
import { LB_CARD, LB_PRIMARY, LB_SM } from "../Books/LibraryBits";
import { PracticeDialog } from "./PracticeDialog";
import { CategoryIcon, skillColors } from "./SkillBits";
import { SkillGoalDialog } from "./SkillGoalDialog";
import { QuickNoteDialog, TargetDialog } from "./SkillQuickDialogs";

interface SkillsHomePageClientProps {
  overview: SkillsOverview;
  today: string;
  // Reminders are set on a skill's page now; the route still reads them.
  reminders?: Reminder[] | null;
}

const UP_NEXT = 4;

// Skills › Learning now (the SkillsHome board): today's practice, the
// streak, this week and this year's goal; each skill being learned with its
// last seven days, its target date, its next roadmap step and its last
// note, practice a popup away; and the skills up next.
export function SkillsHomePageClient({ overview, today }: SkillsHomePageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { year, goalTarget, skills } = overview;
  const logs = overview.logs ?? [];
  const summaries = overview.summaries ?? {};
  const count = (n: number) => formatCount(n, fmt);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [practiceFor, setPracticeFor] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [targetFor, setTargetFor] = useState<string | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);

  const byId = (id: string | null) => (id ? (skills.find((skill) => skill.id === id) ?? null) : null);
  const learning = skills.filter((skill) => stateOf(skill) === "learning").sort((a, b) => (a.startedAt ?? a.createdAt).localeCompare(b.startedAt ?? b.createdAt));
  const upNext = [...skills.filter((skill) => stateOf(skill) === "paused"), ...skills.filter((skill) => stateOf(skill) === "want")];
  const doneThisYear = skills.filter((skill) => skill.status === "COMPLETED" && skill.completedYear === year).length;

  // Today, by unit; this week from the reader's first day.
  const todayRows = logs.filter((row) => row.date === today);
  const unitOf = (id: string) => skills.find((skill) => skill.id === id)?.unit ?? "LESSONS";
  const todayParts = (["LESSONS", "CHAPTERS", "HOURS"] as const)
    .map((unit) => ({ unit, total: todayRows.filter((row) => unitOf(row.skillId) === unit).reduce((sum, row) => sum + row.amount, 0) }))
    .filter((part) => part.total > 0)
    .map((part) => amountOf(part.unit, part.total, t, fmt));
  const weekFrom = weekStartDay(today, weekStartOf(fmt));
  const weekRows = logs.filter((row) => row.date >= weekFrom && row.date <= today);
  const weekDays = new Set(weekRows.map((row) => row.date)).size;

  function move(skill: Skill, state: "learning" | "paused" | "done", message: string) {
    if (busy) return;
    const before = stateOf(skill);
    setBusy(skill.id);
    startTransition(async () => {
      const result = await updateSkillAction(skill.id, stateInput(state));
      setBusy(null);
      router.refresh();
      if (!result.success) return void toast.error(actionError(result.message, "Failed to save skill", t, fmt));
      toast.success(message, {
        action: {
          label: t("Undo"),
          onClick: async () => {
            await updateSkillAction(skill.id, stateInput(before));
            router.refresh();
          },
        },
      });
    });
  }

  const kpis = [
    { emoji: "✅", tone: "bg-success-soft", label: t("Practised today"), value: todayParts.length ? todayParts.join(" · ") : t("Not yet"), sub: "" },
    { emoji: "🔥", tone: "bg-orange-soft", label: t("Practice streak"), value: t(overview.streak === 1 ? "{count} day" : "{count} days", { count: count(overview.streak) }), sub: "" },
    { emoji: "📅", tone: "bg-sky-soft", label: t("This week"), value: t("{count} / 7 days", { count: count(weekDays) }), sub: `· ${t(weekRows.length === 1 ? "{count} session" : "{count} sessions", { count: count(weekRows.length) })}` },
  ];

  const card = (skill: Skill) => {
    const { color, dark, soft } = skillColors(skill);
    const cat = categoryOf(skill.category);
    const mine = logsOf(logs, skill.id);
    const todayAmount = mine.filter((row) => row.date === today).reduce((sum, row) => sum + row.amount, 0);
    const progress = progressOf(skill);
    const pace = pace14(mine, today);
    const days = daysAt(progress.left, pace);
    const leftText = amountOf(skill.unit, progress.left, t, fmt);
    const week = skillWeek(mine, today);
    const weekTotal = week.reduce((sum, day) => sum + day.amount, 0);
    const summary = summaries[skill.id];
    const steps = summary?.steps ?? { done: 0, total: 0, next: null };
    const lastNote = summary?.lastNote ?? null;
    const target = targetLine(skill.targetDate, progress.left, pace, today, t, fmt);
    const toneInk = target.tone === "good" ? "text-tint-green-ink" : target.tone === "late" ? "text-expense" : target.tone === "behind" ? "text-warning" : "text-ink-muted";
    const waiting = busy === skill.id;
    const started = skill.startedAt ? t("started {date}", { date: dayText(skill.startedAt.slice(0, 10), fmt, "dayMonth") }) : t("not started");
    return (
      <section key={skill.id} aria-label={skill.name} className={cn("flex min-w-0 flex-col overflow-hidden rounded-[16px] border bg-surface shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.12)]", todayAmount > 0 ? "border-success-line/70" : "border-line")}>
        <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4.5 px-4.5 pt-4.5 pb-3.5 max-sm:grid-cols-[72px_minmax(0,1fr)] max-sm:gap-3.5">
          <Link
            href={skillHref(skill.id)}
            aria-label={t("Open {name}", { name: skill.name })}
            className="relative box-border flex min-h-33 w-24 flex-col items-start justify-between overflow-hidden rounded-[16px] px-3 pt-3.5 pb-3 text-white transition-transform hover:-translate-y-0.5 max-sm:w-18"
            style={{ background: `linear-gradient(155deg, ${color} 0%, ${dark} 100%)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 18px -8px ${color}99` }}
          >
            <span aria-hidden="true" className="absolute -top-5.5 -right-5.5 size-19 rounded-full bg-white/12" />
            <span aria-hidden="true" className="absolute -bottom-6.5 -left-4 size-16 rounded-full bg-black/10" />
            <span className="relative flex size-11.5 items-center justify-center rounded-[13px] bg-white/18">
              <CategoryIcon category={skill.category} className="size-6.5" />
            </span>
            <span className="relative flex w-full flex-col gap-1">
              <span className="text-[22px] leading-none font-bold tabular-nums">{count(progress.pct)}%</span>
              <span className="text-[10.5px] leading-[1.3] opacity-90">{t(cat.label)}</span>
            </span>
          </Link>
          <div className="flex min-w-0 flex-col gap-2.25">
            <div className="flex items-start justify-between gap-2.5 max-sm:flex-col">
              <span className="flex min-w-0 flex-col gap-0.5">
                <Link href={skillHref(skill.id)} className="truncate text-[18px] font-bold tracking-[-0.01em] text-ink hover:underline hover:underline-offset-3">
                  {skill.name}
                </Link>
                <span className="truncate text-[13px] text-ink-muted">{[skill.source, started].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap", todayAmount > 0 ? "bg-success-soft text-tint-green-ink" : "bg-warning-soft text-warning")}>
                {todayAmount > 0 ? <Check className="size-3.25" strokeWidth={2.5} aria-hidden="true" /> : <Clock className="size-3.25" strokeWidth={2.5} aria-hidden="true" />}
                {todayAmount > 0 ? t("Practised today · {amount}", { amount: amountOf(skill.unit, todayAmount, t, fmt) }) : t("Not practised today")}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] whitespace-nowrap text-ink-soft">
                  <b className="text-[22px] text-ink tabular-nums">{doneText(skill, fmt)}</b> / {totalText(skill, t, fmt)}
                </span>
                <span className="text-[14px] font-bold tabular-nums" style={{ color }}>
                  {count(progress.pct)}%
                </span>
              </div>
              <span role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.pct} aria-label={skill.name} className="block h-2 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full" style={{ width: `${progress.pct}%`, background: `linear-gradient(90deg, ${color}, ${dark})` }} />
              </span>
              <span className="truncate text-[12.5px] text-ink-muted">
                {progress.left <= 0
                  ? t("All done · mark it completed when you are ready")
                  : days
                    ? t(days === 1 ? "{left} left · about {count} day at your pace" : "{left} left · about {count} days at your pace", { left: leftText, count: count(days) })
                    : t("{left} left · practise to see your pace", { left: leftText })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTargetFor(skill.id)}
              title={skill.targetDate ? (perDayToTarget(skill.unit, progress.left, skill.targetDate, today, t, fmt) ?? undefined) : undefined}
              className="-mt-0.5 -ml-2 box-content flex h-7.5 w-full min-w-0 items-center gap-2 rounded-[8px] px-2 text-left text-[12.5px] hover:bg-hover"
            >
              <Target className={cn("size-3.5 shrink-0", toneInk)} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-ink-2">
                <span className="font-semibold">
                  {skill.targetDate ? (target.tone === "late" ? t("Target was {date}", { date: longDay(skill.targetDate, fmt) }) : t("Target {date}", { date: longDay(skill.targetDate, fmt) })) : t("No target date")}
                </span>
                {target.hint && (
                  <>
                    {" · "}
                    <span className={cn("font-semibold", toneInk)}>{target.hint}</span>
                  </>
                )}
              </span>
              <span className="shrink-0 text-[12px] font-semibold text-emerald">{t(skill.targetDate ? "Change" : "Set target")}</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 px-4.5 pb-3.5 max-sm:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-2 rounded-[12px] border border-divider bg-page px-3 py-2.5">
            <span className="flex items-baseline justify-between gap-1.5 text-[12px] whitespace-nowrap">
              <span className="font-semibold text-ink-muted">{t("Last 7 days")}</span>
              <span className="truncate font-semibold text-ink-2">{weekTotal ? amountOf(skill.unit, weekTotal, t, fmt) : t("none yet")}</span>
            </span>
            <span className="flex justify-between gap-1">
              {week.map((day) => {
                const hit = day.amount > 0;
                const isToday = day.date === today;
                return (
                  <span key={day.date} title={`${longDay(day.date, fmt)} · ${hit ? amountOf(skill.unit, day.amount, t, fmt) : t("no practice")}`} className="flex flex-col items-center gap-0.75">
                    <span
                      className={cn("flex size-6 items-center justify-center rounded-[7px] text-white", isToday ? "border-[1.5px]" : "border", !hit && "bg-surface", !hit && (isToday ? "border-ink-faint" : "border-line"))}
                      style={hit ? { background: color, borderColor: color } : undefined}
                    >
                      {hit && <Check className="size-2.75" strokeWidth={3.5} aria-hidden="true" />}
                    </span>
                    <span className={cn("text-[10.5px]", isToday ? "font-bold text-ink" : "font-medium text-ink-faint")}>{isToday ? t("Today") : dayInitial(day.date, fmt)}</span>
                  </span>
                );
              })}
            </span>
          </div>
          <Link href={skillHref(skill.id, "roadmap")} className="flex min-w-0 flex-col justify-between gap-1.5 rounded-[12px] border border-line bg-surface px-3 py-2.5 hover:bg-hover">
            <span className="flex w-full items-center justify-between gap-1.5 text-[12px] whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink-muted">
                <Flag className="size-3.25" strokeWidth={2.25} aria-hidden="true" />
                {t("Roadmap")}
              </span>
              <span className="font-semibold text-ink-faint tabular-nums">{steps.total ? `${count(steps.done)} / ${count(steps.total)}` : ""}</span>
            </span>
            <span className="flex w-full min-w-0 items-center gap-2">
              <span className="flex size-6.5 shrink-0 items-center justify-center rounded-[8px]" style={{ background: soft, color }}>
                {!steps.total ? <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" /> : steps.next ? <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" /> : <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[11.5px] text-ink-muted">{!steps.total ? t("No roadmap yet") : steps.next ? t("Next:") : t("Roadmap")}</span>
                <span className="truncate text-[13.5px] font-semibold text-ink">{!steps.total ? t("+ Add the steps") : (steps.next ?? t("All {count} steps done", { count: count(steps.total) }))}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
            </span>
          </Link>
        </div>
        <div className="px-4.5 pb-4">
          <button type="button" onClick={() => setPracticeFor(skill.id)} disabled={waiting} className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] bg-primary text-[14.5px] font-bold text-on-action shadow-[0_6px_14px_-6px_var(--primary)] transition-transform hover:-translate-y-px hover:bg-emerald-hover disabled:opacity-60">
            <Play className="size-4.5" aria-hidden="true" />
            {t("Start practice")}
          </button>
        </div>
        <div className="mt-auto flex flex-col gap-2.5 border-t border-divider bg-page/50 px-4.5 py-3">
          {lastNote ? (
            <Link href={skillHref(skill.id, "notes")} className="flex h-9 w-full items-center gap-2.5 rounded-[9px] border border-warning-soft bg-warning-50 px-2.5 hover:border-warning-line">
              <span className="shrink-0 text-[11.5px] font-bold text-warning-ink">{t("Note")}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                <b className="font-semibold">{lastNote.title}</b> <span className="text-ink-muted">{lastNote.text.startsWith(lastNote.title.replace(/…$/, "")) ? lastNote.text.slice(lastNote.title.replace(/…$/, "").length).trim() : lastNote.text}</span>
              </span>
              <span className="shrink-0 text-[11.5px] text-warning-ink">{agoText(lastNote.date, today, t, fmt)}</span>
            </Link>
          ) : (
            <button type="button" onClick={() => setNoteFor(skill.id)} className="flex h-9 w-full items-center gap-2.5 rounded-[9px] border border-dashed border-input bg-surface px-2.5 text-left text-[13px] text-ink-muted hover:border-emerald">
              <span className="shrink-0 text-[11.5px] font-bold text-ink-faint">{t("Note")}</span>
              <span className="min-w-0 flex-1 truncate">{t("No notes yet")}</span>
              <span className="shrink-0 text-[11.5px] font-semibold text-emerald">{t("+ Write the first one")}</span>
            </button>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setNoteFor(skill.id)} className={cn(LB_SM, "border-emerald-line bg-emerald-soft text-emerald hover:brightness-97")}>
              <Pencil className="size-3.75" aria-hidden="true" />
              {t("Notes@@write")}
            </button>
            <Link href={skillHref(skill.id)} className={cn(LB_SM, "border-input bg-surface text-ink hover:bg-hover")}>
              <FileText className="size-3.75" aria-hidden="true" />
              {t("Details")}
            </Link>
            <span className="flex-1" />
            <button type="button" onClick={() => move(skill, "done", t("{name} completed. Skill {count} of {total} this year!", { name: skill.name, count: count(doneThisYear + 1), total: count(goalTarget ?? doneThisYear + 1) }))} disabled={waiting} className={cn(LB_SM, "border-success-line/70 bg-note-green text-tint-green-ink hover:border-success")}>
              <Check className="size-3.5" strokeWidth={2.75} aria-hidden="true" />
              {t("Mark completed")}
            </button>
            <button type="button" onClick={() => move(skill, "paused", t("{name} paused. It is in Up next.", { name: skill.name }))} disabled={waiting} className={cn(LB_SM, "border-line bg-surface text-ink-muted hover:bg-hover")}>
              <Pause className="size-3.25" fill="currentColor" strokeWidth={1} aria-hidden="true" />
              {t("Pause")}
            </button>
          </div>
        </div>
      </section>
    );
  };

  const wants = upNext.slice(0, 3);

  return (
    <PageFrame className="gap-3.5 leading-[normal] md:pt-5 md:pb-5.5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.75">
          <h1 className="text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Learning now")}</h1>
          <p className="truncate text-[14px] text-ink-muted">{t("Practise a little every day. Log what you did and watch each skill grow.")}</p>
        </div>
        <Link href={`${MY_SKILLS_HREF}?add=1`} className={cn(LB_PRIMARY, "shadow-[0_1px_2px_rgba(15,23,42,0.10)]")}>
          <Plus className="size-4" strokeWidth={2.25} aria-hidden="true" />
          {t("Add skill")}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="flex min-w-0 items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-2.75 shadow-card">
            <KpiBody {...kpi} />
          </div>
        ))}
        <button type="button" onClick={() => setGoalOpen(true)} title={t(goalTarget ? "Change this year's goal" : "Set a goal for this year")} className="flex min-w-0 items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-2.75 text-left shadow-card hover:border-line-strong">
          <KpiBody
            emoji="🏆"
            tone="bg-warning-soft"
            label={t("{year} goal", { year: toLocaleDigits(String(year), fmt) })}
            value={goalTarget ? t("{done} of {total} skills", { done: count(doneThisYear), total: count(goalTarget) }) : count(doneThisYear)}
            sub={goalTarget ? t("completed") : t("completed · set a goal")}
          />
        </button>
      </div>

      {learning.length > 0 ? (
        <div className="grid items-stretch gap-3.5 lg:grid-cols-2">{learning.map(card)}</div>
      ) : (
        <section aria-labelledby="skh-empty" className={cn(LB_CARD, "flex min-h-90 flex-col items-center justify-center gap-3.5 rounded-[16px] px-8 py-9 text-center")}>
          <span aria-hidden="true" className="relative flex size-21 items-center justify-center rounded-[24px] bg-linear-155 from-primary to-emerald-hover shadow-[0_14px_28px_-12px_var(--primary)]">
            <GraduationCap className="size-10 text-white" strokeWidth={1.8} />
            <span className="absolute -top-1.5 -right-1.5 flex size-6.5 items-center justify-center rounded-full border-3 border-surface bg-warning-soft text-[12px]">✨</span>
          </span>
          <h2 id="skh-empty" className="mt-1 text-[20px] font-bold tracking-[-0.01em] text-ink">
            {t("You are not learning a skill right now")}
          </h2>
          <p className="max-w-130 text-[14px] leading-[1.6] text-ink-muted">{wants.length ? t("Pick one of the skills you want to learn and start today, or add a new one.") : t("Add a skill you want to learn, set a target and practise a little every day.")}</p>
          <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">
            {wants.map((skill) => {
              const { color, dark, ink, soft, line } = skillColors(skill);
              const resume = stateOf(skill) === "paused";
              return (
                <button key={skill.id} type="button" disabled={busy === skill.id} onClick={() => move(skill, "learning", t(resume ? "Resumed {name}. Welcome back!" : "Now learning {name}. Good luck!", { name: skill.name }))} className="inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-[14px] font-semibold" style={{ borderColor: line, background: soft, color: ink }}>
                  <span aria-hidden="true" className="flex size-5.5 items-center justify-center rounded-[7px] text-white" style={{ background: `linear-gradient(155deg, ${color} 0%, ${dark} 100%)` }}>
                    <CategoryIcon category={skill.category} className="size-3.25" strokeWidth={2.25} />
                  </span>
                  {t(resume ? "Resume {name}" : "Start {name}", { name: skill.name })}
                </button>
              );
            })}
            <Link href={`${MY_SKILLS_HREF}?add=1`} className={LB_PRIMARY}>
              <Plus className="size-4" strokeWidth={2.25} aria-hidden="true" />
              {t("Add a new skill")}
            </Link>
          </div>
        </section>
      )}

      <section aria-labelledby="skh-up" className={cn(LB_CARD, "flex flex-col gap-2.5 px-4 py-3.5")}>
        <div className="flex items-center justify-between gap-2.5">
          <span className="flex items-baseline gap-2">
            <h2 id="skh-up" className="text-[15px] font-semibold text-ink">
              {t("Up next")}
            </h2>
            {upNext.length > 0 && <span className="text-[12.5px] text-ink-faint">{count(upNext.length)}</span>}
          </span>
          <Link href={MY_SKILLS_HREF} className="text-[12.5px] font-semibold text-emerald hover:underline">
            {t("All skills")}
          </Link>
        </div>
        {upNext.length === 0 ? (
          <Link href={`${MY_SKILLS_HREF}?add=1`} className="flex h-14 items-center justify-center gap-2 rounded-[10px] border border-dashed border-input bg-surface text-[13px] text-ink-muted hover:bg-hover">
            <span>{t("Nothing waiting. Add a skill you want to learn.")}</span>
            <span className="font-semibold text-emerald">{t("+ Add skill")}</span>
          </Link>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {upNext.slice(0, UP_NEXT).map((skill) => {
              const { color, dark } = skillColors(skill);
              const resume = stateOf(skill) === "paused";
              return (
                <div key={skill.id} className="flex min-w-0 items-center gap-2.5 rounded-[10px] border border-divider p-2.5">
                  <Link href={skillHref(skill.id)} aria-label={t("Open {name}", { name: skill.name })} className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-white transition-transform hover:-translate-y-0.5" style={{ background: `linear-gradient(155deg, ${color} 0%, ${dark} 100%)` }}>
                    <CategoryIcon category={skill.category} className="size-4.5" />
                  </Link>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <Link href={skillHref(skill.id)} className="truncate text-[13px] font-semibold text-ink hover:underline">
                      {skill.name}
                    </Link>
                    <span className="truncate text-[11.5px] text-ink-muted" title={resume ? t("{done} of {total} done", { done: doneText(skill, fmt), total: totalText(skill, t, fmt) }) : undefined}>
                      {resume && <span className="font-semibold text-warning">{t(STATE_INFO.paused.label)} · </span>}
                      {resume ? `${doneText(skill, fmt)} / ${totalText(skill, t, fmt)}` : totalText(skill, t, fmt)}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={busy === skill.id}
                    onClick={() => move(skill, "learning", t(resume ? "Resumed {name}. Welcome back!" : "Now learning {name}. Good luck!", { name: skill.name }))}
                    className={cn("h-7.5 shrink-0 rounded-[8px] border px-2.5 text-[12.5px] font-semibold whitespace-nowrap disabled:opacity-50", resume ? "border-warning-line bg-warning-50 text-warning" : "border-input bg-surface text-ink hover:bg-hover")}
                  >
                    {t(resume ? "Resume" : "Start")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PracticeDialog open={practiceFor !== null} onClose={() => setPracticeFor(null)} skill={byId(practiceFor)} entries={null} pace={practiceFor ? pace14(logsOf(logs, practiceFor), today) : 0} today={today} removable />
      <QuickNoteDialog open={noteFor !== null} onClose={() => setNoteFor(null)} skill={byId(noteFor)} today={today} />
      <TargetDialog
        open={targetFor !== null}
        onClose={() => setTargetFor(null)}
        skill={byId(targetFor)}
        left={targetFor ? progressOf(byId(targetFor) ?? { progress: 0, target: 0, status: "LEARNING" }).left : 0}
        pace={targetFor ? pace14(logsOf(logs, targetFor), today) : 0}
        today={today}
      />
      <SkillGoalDialog open={goalOpen} onClose={() => setGoalOpen(false)} year={year} current={goalTarget} />
    </PageFrame>
  );
}

function KpiBody({ emoji, tone, label, value, sub }: { emoji: string; tone: string; label: string; value: string; sub: string }) {
  return (
    <>
      <span aria-hidden="true" className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-[10px] text-[18px]", tone)}>
        {emoji}
      </span>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="truncate text-[12.5px] text-ink-muted">{label}</span>
        <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
          <span className="truncate text-[20px] font-bold text-ink tabular-nums">{value}</span>
          {sub && <span className="truncate text-[12.5px] text-ink-muted">{sub}</span>}
        </span>
      </span>
    </>
  );
}
