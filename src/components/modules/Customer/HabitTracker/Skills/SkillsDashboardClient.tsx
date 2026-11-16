"use client";

import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GraduationCap, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import PageFrame from "@/components/smartly/PageFrame";
import type { Skill, SkillLogRow, SkillsOverview } from "@/lib/customer/api";
import { dayText } from "@/lib/customer/habitDisplay";
import { longDay } from "@/lib/customer/libraryBoard";
import {
  agoText,
  amountOf,
  calendarWeeks,
  categoryOf,
  daysBetween,
  doneText,
  LEARNING_NOW_HREF,
  MY_SKILLS_HREF,
  periodDays,
  periodParam,
  progressOf,
  readSkillsPeriod,
  type SkillsPeriod,
  SKILLS_DASHBOARD_HREF,
  skillHref,
  type SkillState,
  STATE_INFO,
  STATE_ORDER,
  stateOf,
  totalText,
  weekdayInitial,
} from "@/lib/customer/skillsBoard";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { langOf, weekStartOf } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { LB_CARD } from "../Books/LibraryBits";
import { CategoryIcon, skillColors } from "./SkillBits";

interface SkillsDashboardClientProps {
  overview: SkillsOverview;
  // Every day of practice in the period's year.
  yearLogs: SkillLogRow[];
  period: SkillsPeriod;
  today: string;
}

type Tab = "all" | SkillState;
const TABS: Tab[] = ["all", "learning", "want", "paused", "done"];
const pad = (n: number) => String(n).padStart(2, "0");

// Skills › Dashboard (the SkillsDashboard board): a month or a year in five
// figures, the year's practice days month by month by skill, the last half
// year of days, where the time went, and every skill in a table.
export function SkillsDashboardClient({ overview, yearLogs, period, today }: SkillsDashboardClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { skills, year: thisYear, goalTarget } = overview;
  const summaries = overview.summaries ?? {};
  const recentLogs = overview.logs ?? [];
  const count = (n: number) => formatCount(n, fmt);
  const dayWord = (n: number) => t(n === 1 ? "day" : "days");
  const [isSwitching, startSwitch] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(period.year);
  const [hover, setHover] = useState<{ day: string; c: number; r: number } | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const yearRows = yearLogs.filter((row) => byId.has(row.skillId));
  const { from, to } = periodDays(period);
  const periodRows = yearRows.filter((row) => row.date >= from && row.date <= to);
  const periodDayCount = new Set(periodRows.map((row) => row.date)).size;
  const end = to < today ? to : today;
  const span = from > today ? 0 : daysBetween(from, end) + 1;
  const monthLong = (y: number, m: number) => new Intl.DateTimeFormat(langOf(fmt) === "bn" ? "bn-BD" : "en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  const monthShort = (m: number) => new Intl.DateTimeFormat(langOf(fmt) === "bn" ? "bn-BD" : "en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2000, m - 1, 1)));
  const periodName = period.kind === "month" ? `${monthLong(period.year, period.month)} ${toLocaleDigits(String(period.year), fmt)}` : toLocaleDigits(String(period.year), fmt);
  const param = periodParam(period, today);
  const PRESETS: { id: "tm" | "lm" | "ty" | "ly"; label: string }[] = [
    { id: "tm", label: "This month" },
    { id: "lm", label: "Last month" },
    { id: "ty", label: "This year" },
    { id: "ly", label: "Last year" },
  ];
  const presetLabel = PRESETS.find((preset) => preset.id === param)?.label;
  const firstYear = Math.min(thisYear - 1, ...yearRows.concat(recentLogs).map((row) => Number(row.date.slice(0, 4))), ...skills.map((skill) => Number((skill.startedAt ?? skill.createdAt).slice(0, 4))));
  const monthsWith = new Set([...recentLogs, ...yearRows].map((row) => row.date.slice(0, 7)));

  function go(next: SkillsPeriod) {
    setPickerOpen(false);
    setHover(null);
    const value = periodParam(next, today);
    startSwitch(() => router.push(value === "tm" ? SKILLS_DASHBOARD_HREF : `${SKILLS_DASHBOARD_HREF}?period=${value}`, { scroll: false }));
  }

  // --- The five figures ---
  let minutes = 0;
  const counted = { LESSONS: 0, CHAPTERS: 0 };
  for (const row of periodRows) {
    const unit = byId.get(row.skillId)?.unit;
    if (unit === "HOURS") minutes += row.amount;
    else if (unit === "CHAPTERS") counted.CHAPTERS += row.amount;
    else counted.LESSONS += row.amount;
  }
  const countParts = [counted.LESSONS ? amountOf("LESSONS", counted.LESSONS, t, fmt) : null, counted.CHAPTERS ? amountOf("CHAPTERS", counted.CHAPTERS, t, fmt) : null].filter((part): part is string => !!part);
  const best = overview.bestStreak ?? 0;
  const doneThisYear = skills.filter((skill) => skill.status === "COMPLETED" && skill.completedYear === thisYear).length;
  const perSkill = skills
    .map((skill) => {
      const rows = periodRows.filter((row) => row.skillId === skill.id);
      return { skill, sessions: rows.length, amount: rows.reduce((sum, row) => sum + row.amount, 0) };
    })
    .filter((row) => row.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions || b.amount - a.amount);
  const top = perSkill[0] ?? null;
  const dayPct = span ? Math.round((periodDayCount / span) * 100) : 0;

  // --- Practice days by month in the period's year ---
  const chartMonths = Array.from({ length: 12 }, (_, i) => {
    const key = `${period.year}-${pad(i + 1)}`;
    const rows = yearRows.filter((row) => row.date.startsWith(key));
    const bySkill = new Map<string, number>();
    for (const row of rows) bySkill.set(row.skillId, (bySkill.get(row.skillId) ?? 0) + 1);
    return { month: i + 1, key, rows, days: new Set(rows.map((row) => row.date)).size, bySkill };
  });
  const mostDays = Math.max(1, ...chartMonths.map((month) => month.days));
  const yearDays = chartMonths.reduce((sum, month) => sum + month.days, 0);
  const legend = skills.filter((skill) => yearRows.some((row) => row.skillId === skill.id));

  // --- The last 26 weeks ---
  const weeks = calendarWeeks(today, 26, weekStartOf(fmt));
  const rowsOn = new Map<string, SkillLogRow[]>();
  for (const row of recentLogs) if (byId.has(row.skillId)) rowsOn.set(row.date, [...(rowsOn.get(row.date) ?? []), row]);
  const heatDays = weeks.flat().filter((day): day is string => !!day && (rowsOn.get(day)?.length ?? 0) > 0).length;
  const heatShade = (n: number) => (n === 0 ? "var(--surface-sunken)" : `color-mix(in srgb, var(--primary) ${[0, 28, 58, 100][Math.min(3, n)]}%, var(--surface))`);
  const heatMonths = weeks.map((week, i) => {
    const first = week[0] ?? today;
    const before = i > 0 ? weeks[i - 1][0] : null;
    return i === 0 ? (Number(first.slice(8, 10)) <= 7 ? monthShort(Number(first.slice(5, 7))) : "") : first.slice(5, 7) !== before?.slice(5, 7) ? monthShort(Number(first.slice(5, 7))) : "";
  });
  // Month names three columns apart at least, so they never run together.
  const heatLabels = heatMonths.reduce<{ labels: string[]; last: number }>(
    (acc, label, i) => (label && i - acc.last >= 3 ? { labels: [...acc.labels, label], last: i } : { labels: [...acc.labels, ""], last: acc.last }),
    { labels: [], last: -9 },
  ).labels;

  // --- All skills ---
  const needle = query.trim().toLowerCase();
  const lastOf = (skill: Skill) => summaries[skill.id]?.lastPractised ?? "";
  const rows = skills
    .filter((skill) => (tab === "all" || stateOf(skill) === tab) && (!needle || [skill.name, skill.source, t(categoryOf(skill.category).label), t(STATE_INFO[stateOf(skill)].label)].join(" ").toLowerCase().includes(needle)))
    .sort((a, b) => STATE_ORDER[stateOf(a)] - STATE_ORDER[stateOf(b)] || lastOf(b).localeCompare(lastOf(a)));

  const sub = periodRows.length
    ? t("{days} practice {dayWord} and {sessions} in {period}. Every skill you track is below.", { days: count(periodDayCount), dayWord: dayWord(periodDayCount), sessions: t(periodRows.length === 1 ? "{count} session" : "{count} sessions", { count: count(periodRows.length) }), period: periodName })
    : to >= today
      ? t("No practice in {period} yet. Every skill you track is below.", { period: periodName })
      : t("No practice in {period}. Every skill you track is below.", { period: periodName });

  const kpiBox = "flex min-w-0 items-center gap-3 rounded-[12px] border border-line bg-surface px-3.5 py-2.5 shadow-card";
  const kpiEmoji = "flex size-9.5 shrink-0 items-center justify-center rounded-[10px] text-[18px]";

  return (
    <PageFrame className="gap-2.5 leading-[normal] md:pt-4 md:pb-4.5 xl:min-h-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.75">
          <h1 className="text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Skills dashboard")}</h1>
          <p className="truncate text-[14px] text-ink-muted">{sub}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="relative z-10">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              disabled={isSwitching}
              onClick={() => {
                setPickerYear(period.year);
                setPickerOpen(!pickerOpen);
              }}
              className={cn("flex h-10 items-center gap-2 rounded-full border bg-surface px-3.5 text-[14px] font-semibold whitespace-nowrap text-ink", pickerOpen || param !== "tm" ? "border-primary" : "border-input")}
            >
              <CalendarDays className="size-4 text-ink-muted" aria-hidden="true" />
              {presetLabel ? t(presetLabel) : periodName}
              {pickerOpen ? <ChevronUp className="size-3.5 text-ink-muted" aria-hidden="true" /> : <ChevronDown className="size-3.5 text-ink-muted" aria-hidden="true" />}
            </button>
            {pickerOpen && (
              <>
                <div className="fixed inset-0 -z-10" onClick={() => setPickerOpen(false)} />
                <div className="absolute top-12 left-1/2 flex w-75 -translate-x-1/2 flex-col gap-0.5 rounded-[14px] border border-line bg-surface p-2 shadow-overlay max-sm:right-0 max-sm:left-auto max-sm:translate-x-0">
                  <div role="listbox" aria-label={t("Choose period")} className="flex flex-col gap-0.5">
                    {PRESETS.map((preset) => {
                      const value = readSkillsPeriod(preset.id, today);
                      const on = param === preset.id;
                      return (
                        <button key={preset.id} type="button" role="option" aria-selected={on} onClick={() => go(value)} className={cn("flex h-11.5 items-center justify-between gap-2.5 rounded-[9px] px-3 text-left", on ? "bg-emerald-soft" : "hover:bg-hover")}>
                          <span className="flex min-w-0 flex-col gap-px">
                            <span className={cn("text-[14px] font-semibold", on ? "text-emerald" : "text-ink")}>{t(preset.label)}</span>
                            <span className="text-[12px] text-ink-muted">{value.kind === "month" ? `${monthLong(value.year, value.month)} ${toLocaleDigits(String(value.year), fmt)}` : toLocaleDigits(String(value.year), fmt)}</span>
                          </span>
                          {on && <Check className="size-4 text-emerald" strokeWidth={2.5} aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mx-1 my-1.5 h-px bg-divider" />
                  <div className="flex items-center justify-between px-1.5 pt-0.5 pb-1">
                    <span className="text-[12px] font-semibold text-ink-muted">{t("Or pick a month")}</span>
                    <span className="flex items-center gap-1">
                      <button type="button" aria-label={t("Previous year")} disabled={pickerYear <= firstYear} onClick={() => setPickerYear(pickerYear - 1)} className="flex size-6.5 items-center justify-center rounded-[7px] border border-line bg-surface text-ink-2 disabled:opacity-40">
                        <ChevronLeft className="size-3.5" aria-hidden="true" />
                      </button>
                      <span className="min-w-10 text-center text-[13px] font-bold tabular-nums">{toLocaleDigits(String(pickerYear), fmt)}</span>
                      <button type="button" aria-label={t("Next year")} disabled={pickerYear >= thisYear} onClick={() => setPickerYear(pickerYear + 1)} className="flex size-6.5 items-center justify-center rounded-[7px] border border-line bg-surface text-ink-2 disabled:opacity-40">
                        <ChevronRight className="size-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 px-0.5 pb-0.5">
                    {Array.from({ length: 12 }, (_, i) => {
                      const key = `${pickerYear}-${pad(i + 1)}`;
                      const off = key > today.slice(0, 7);
                      const on = period.kind === "month" && period.year === pickerYear && period.month === i + 1;
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={on}
                          disabled={off}
                          onClick={() => go({ kind: "month", year: pickerYear, month: i + 1 })}
                          title={`${monthLong(pickerYear, i + 1)} ${pickerYear}`}
                          className={cn("relative h-8.5 rounded-[8px] text-[12.5px]", on ? "border-[1.5px] border-primary bg-emerald-soft font-bold text-emerald" : off ? "cursor-not-allowed border border-dashed border-line bg-page font-medium text-ink-faint" : "border border-line bg-surface font-medium text-ink-2 hover:bg-hover")}
                        >
                          {monthShort(i + 1)}
                          {monthsWith.has(key) && !on && <span aria-hidden="true" className="absolute bottom-1 left-1/2 -ml-0.5 size-1 rounded-full bg-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          <Link href={LEARNING_NOW_HREF} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-primary px-4 text-[14px] font-semibold whitespace-nowrap text-on-action shadow-[0_1px_2px_rgba(15,23,42,0.12)] hover:bg-emerald-hover">
            <GraduationCap className="size-4" aria-hidden="true" />
            {t("Learning now")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <div className={kpiBox}>
          <span aria-hidden="true" className={cn(kpiEmoji, "bg-sky-soft")}>
            📅
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-[12.5px] text-ink-muted">{t("Practice days")}</span>
            <span className="truncate text-[20px] leading-[1.3] font-bold tabular-nums">
              {count(periodDayCount)}
              <span className="ml-1.25 text-[13px] font-medium text-ink-muted">{t("of {count} {days}", { count: count(span), days: dayWord(span) })}</span>
            </span>
            <span className="truncate text-[12px] text-ink-muted">{!span ? t("This period has not started") : to >= today ? t("{pct}% of days so far", { pct: count(dayPct) }) : t("{pct}% of the days", { pct: count(dayPct) })}</span>
          </span>
        </div>
        <div className={kpiBox}>
          <span aria-hidden="true" className={cn(kpiEmoji, "bg-tint-violet")}>
            ⏱️
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-[12.5px] text-ink-muted">{t("Time practised")}</span>
            <span className="truncate text-[20px] leading-[1.3] font-bold tabular-nums">{minutes ? amountOf("HOURS", minutes, t, fmt) : t("0h")}</span>
            <span className="truncate text-[12px] text-ink-muted">{countParts.length ? t("+ {amount} done", { amount: countParts.join(" · ") }) : t("0 lessons done")}</span>
          </span>
        </div>
        <div className={kpiBox}>
          <span aria-hidden="true" className={cn(kpiEmoji, "bg-orange-soft")}>
            🔥
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-[12.5px] text-ink-muted">{t("Best streak ever")}</span>
            <span className="truncate text-[20px] leading-[1.3] font-bold tabular-nums">
              {count(best)}
              <span className="ml-1.25 text-[13px] font-medium text-ink-muted">{dayWord(best)}</span>
            </span>
            <span className="truncate text-[12px] text-ink-muted">{overview.streak ? t("Now {count} {days} in a row", { count: count(overview.streak), days: dayWord(overview.streak) }) : t("No streak right now")}</span>
          </span>
        </div>
        <div className={kpiBox}>
          <span aria-hidden="true" className={cn(kpiEmoji, "bg-success-soft")}>
            🏆
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-[12.5px] text-ink-muted">{t("Completed in {year}", { year: toLocaleDigits(String(thisYear), fmt) })}</span>
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="shrink-0 text-[20px] leading-[1.3] font-bold tabular-nums">
                {count(doneThisYear)}
                {goalTarget ? <span className="ml-1.25 text-[13px] font-medium text-ink-muted">{t("of {count}", { count: count(goalTarget) })}</span> : null}
              </span>
              {goalTarget ? (
                <span aria-hidden="true" className="h-1.5 min-w-6 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                  <span className="block h-full rounded-full bg-success" style={{ width: `${Math.min(100, Math.round((doneThisYear / goalTarget) * 100))}%` }} />
                </span>
              ) : null}
            </span>
            <span className="truncate text-[12px] text-ink-muted">{!goalTarget ? t("No yearly goal set") : doneThisYear >= goalTarget ? t("Goal reached, well done") : t("{count} more for the goal", { count: count(goalTarget - doneThisYear) })}</span>
          </span>
        </div>
        <div className={kpiBox}>
          <span aria-hidden="true" className={cn(kpiEmoji, "bg-warning-soft")}>
            ⭐
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-[12.5px] text-ink-muted">{t("Most practised")}</span>
            {top ? (
              <span className="flex min-w-0 items-center gap-1.75 leading-[1.3]">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: skillColors(top.skill).color, boxShadow: `0 0 0 3px ${skillColors(top.skill).line}` }} />
                <span className="truncate text-[16px] font-bold">{top.skill.name}</span>
              </span>
            ) : (
              <span className="text-[20px] leading-[1.3] font-bold">–</span>
            )}
            <span className="truncate text-[12px] text-ink-muted">{top ? `${t(top.sessions === 1 ? "{count} session" : "{count} sessions", { count: count(top.sessions) })} · ${amountOf(top.skill.unit, top.amount, t, fmt)}` : t("Nothing logged")}</span>
          </span>
        </div>
      </div>

      <section aria-labelledby="skb-ct" className={cn(LB_CARD, "box-border flex h-47.5 flex-col gap-1.25 px-4 pt-2.5 pb-2.25")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex shrink-0 items-center gap-2.5">
            <h2 id="skb-ct" className="text-[15px] font-semibold whitespace-nowrap text-ink">
              {t("Practice by month")}
            </h2>
            <span className="flex items-center gap-0.5 rounded-[8px] bg-surface-sunken p-0.5">
              <button type="button" aria-label={t("Previous year")} disabled={period.year <= firstYear} onClick={() => go({ kind: "year", year: period.year - 1 })} className="flex size-6 items-center justify-center rounded-[6px] text-ink-2 disabled:opacity-35">
                <ChevronLeft className="size-3.5" aria-hidden="true" />
              </button>
              <span className="min-w-9.5 text-center text-[13px] font-bold tabular-nums">{toLocaleDigits(String(period.year), fmt)}</span>
              <button type="button" aria-label={t("Next year")} disabled={period.year >= thisYear} onClick={() => go({ kind: "year", year: period.year + 1 })} className="flex size-6 items-center justify-center rounded-[6px] text-ink-2 disabled:opacity-35">
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          </div>
          <span className="min-w-0 truncate text-[12px] text-ink-muted">{yearDays ? t("{count} practice {days} in {year} · tap a month to see it", { count: count(yearDays), days: dayWord(yearDays), year: toLocaleDigits(String(period.year), fmt) }) : t("Tap a month to see it")}</span>
        </div>
        <div role="group" aria-label={t("Practice days each month in {year}", { year: toLocaleDigits(String(period.year), fmt) })} className="relative flex min-h-0 flex-1 items-end gap-2 border-b border-line max-sm:gap-1">
          {chartMonths.map((month) => {
            const future = month.key > today.slice(0, 7);
            const selected = period.kind === "month" && period.month === month.month;
            const dim = period.kind === "month" && !selected;
            const height = month.days ? Math.max(6, Math.round((month.days / mostDays) * 86)) : 0;
            const label = `${monthLong(period.year, month.month)} ${period.year} · ${count(month.days)} ${t("practice")} ${dayWord(month.days)}`;
            return (
              <button
                key={month.key}
                type="button"
                aria-label={label}
                aria-pressed={selected}
                disabled={future}
                title={label}
                onClick={() => go(selected ? { kind: "year", year: period.year } : { kind: "month", year: period.year, month: month.month })}
                className={cn("flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-0.75 rounded-t-[8px] disabled:cursor-default", selected ? "bg-emerald-soft" : !future && "hover:bg-hover")}
              >
                {month.days > 0 && height < 36 && <span className="text-[11.5px] font-bold text-ink-soft tabular-nums">{count(month.days)}</span>}
                <span className={cn("relative flex w-[58%] max-w-15 flex-col overflow-hidden rounded-t-[7px]", !month.days && !future && "bg-line")} style={{ height: month.days ? `${height}%` : future ? "0px" : "2px", opacity: dim ? 0.42 : 1 }}>
                  {skills
                    .filter((skill) => month.bySkill.has(skill.id))
                    .map((skill) => (
                      <span key={skill.id} className="block shadow-[inset_0_-1px_0_rgba(255,255,255,0.45)]" style={{ flex: `0 0 ${(((month.bySkill.get(skill.id) ?? 0) / month.rows.length) * 100).toFixed(2)}%`, background: skillColors(skill).color }} />
                    ))}
                  {height >= 36 && (
                    <span className="pointer-events-none absolute inset-x-0 top-1.5 flex flex-col items-center gap-px text-white [text-shadow:0_1px_2px_rgba(15,23,42,0.35)]">
                      <span className="text-[13px] leading-[1.1] font-bold tabular-nums">{count(month.days)}</span>
                      <span className="text-[10px] leading-[1.1] font-medium text-white/88">{dayWord(month.days)}</span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          {!yearDays && (
            <div className="pointer-events-none absolute inset-x-0 top-0 bottom-2 flex items-center justify-center">
              <span className="rounded-full border border-dashed border-input bg-page px-3.5 py-2 text-[13px] text-ink-muted">{t("No practice in {year}", { year: toLocaleDigits(String(period.year), fmt) })}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 max-sm:gap-1">
          {chartMonths.map((month) => {
            const selected = period.kind === "month" && period.month === month.month;
            const future = month.key > today.slice(0, 7);
            return (
              <span key={month.key} className={cn("min-w-0 flex-1 truncate text-center text-[11.5px]", selected ? "font-bold text-emerald" : future ? "font-medium text-input" : "font-medium text-ink-muted")}>
                {monthShort(month.month)}
              </span>
            );
          })}
        </div>
        <div className="flex min-h-4 items-center gap-3.5 overflow-hidden">
          {legend.length ? (
            legend.map((skill) => (
              <span key={skill.id} className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-ink-soft">
                <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: skillColors(skill).color }} />
                <span className="max-w-45 truncate">{skill.name}</span>
              </span>
            ))
          ) : (
            <span className="text-[12px] text-ink-faint">{t("Skills you practise show here")}</span>
          )}
        </div>
      </section>

      <div className="grid gap-3.5 lg:h-44 lg:grid-cols-2">
        <section aria-labelledby="skb-ht" className={cn(LB_CARD, "box-border flex min-h-0 min-w-0 flex-col gap-1.5 px-4 pt-2.5 pb-2.75")}>
          <div className="flex items-center justify-between gap-2.5">
            <span className="flex min-w-0 items-baseline gap-2">
              <h2 id="skb-ht" className="text-[15px] font-semibold whitespace-nowrap text-ink">
                {t("Year at a glance")}
              </h2>
              <span className="truncate text-[12px] text-ink-muted">{t("Last 26 weeks · {count} practice {days}", { count: count(heatDays), days: dayWord(heatDays) })}</span>
            </span>
            <span aria-hidden="true" className="flex shrink-0 items-center gap-0.75 text-[11px] text-ink-muted">
              {t("Less")}
              {[0, 1, 2, 3].map((n) => (
                <span key={n} className="size-2.75 rounded-[3px]" style={{ background: heatShade(n) }} />
              ))}
              {t("More")}
            </span>
          </div>
          <div role="img" aria-label={t("{count} practice days in the last 26 weeks", { count: count(heatDays) })} className="relative min-h-0 flex-1" onMouseLeave={() => setHover(null)}>
            <div className="grid h-3.5 grid-cols-[22px_repeat(26,minmax(0,1fr))] gap-x-0.75">
              <span />
              {heatLabels.map((label, i) => (
                <span key={i} className="overflow-visible text-[10.5px] leading-3.5 whitespace-nowrap text-ink-muted">
                  {label}
                </span>
              ))}
            </div>
            {Array.from({ length: 7 }, (_, r) => (
              <div key={r} className="mt-0.75 grid grid-cols-[22px_repeat(26,minmax(0,1fr))] gap-x-0.75">
                <span className="text-[10px] leading-3.25 text-ink-faint">{r % 2 === 1 ? weekdayInitial(weeks[weeks.length - 1][r] ?? weeks[0][r] ?? today, fmt) : ""}</span>
                {weeks.map((week, c) => {
                  const day = week[r];
                  const n = day ? (rowsOn.get(day)?.length ?? 0) : 0;
                  return (
                    <span
                      key={c}
                      onMouseEnter={() => (day ? setHover({ day, c, r }) : setHover(null))}
                      className="h-3.25 rounded-[3px]"
                      style={{ background: day ? heatShade(n) : "transparent", boxShadow: day === today ? "inset 0 0 0 1.5px color-mix(in srgb, var(--ink) 55%, transparent)" : undefined }}
                    />
                  );
                })}
              </div>
            ))}
            {hover && (
              <div
                role="tooltip"
                className="pointer-events-none absolute z-10 flex max-w-60 min-w-37.5 flex-col gap-1 rounded-[9px] bg-ink px-2.5 py-2 text-surface shadow-[0_8px_20px_rgba(15,23,42,0.3)]"
                style={{
                  left: `calc(25px + (100% - 25px) * ${((hover.c + 0.5) / 26).toFixed(4)})`,
                  top: hover.r < 2 ? `${14 + (hover.r + 1) * 16 + 6}px` : `${14 + hover.r * 16 + 1}px`,
                  transform: `translate(${hover.c < 5 ? "-14%" : hover.c > 20 ? "-86%" : "-50%"}, ${hover.r < 2 ? "0" : "-100%"})`,
                }}
              >
                <span className="text-[12px] font-bold whitespace-nowrap">{longDay(hover.day, fmt)}</span>
                {(rowsOn.get(hover.day) ?? []).map((row) => {
                  const skill = byId.get(row.skillId);
                  if (!skill) return null;
                  return (
                    <span key={row.skillId} className="flex min-w-0 items-center gap-1.5 text-[11.5px] opacity-90">
                      <span className="size-2 shrink-0 rounded-[2px]" style={{ background: skillColors(skill).color }} />
                      <span className="min-w-0 truncate">{skill.name}</span>
                      <span className="shrink-0 opacity-70">· {amountOf(skill.unit, row.amount, t, fmt)}</span>
                    </span>
                  );
                })}
                {!(rowsOn.get(hover.day) ?? []).length && <span className="text-[11.5px] opacity-70">{t("No practice this day")}</span>}
              </div>
            )}
          </div>
        </section>
        <section aria-labelledby="skb-wt" className={cn(LB_CARD, "box-border flex min-h-0 min-w-0 flex-col gap-1 px-4 pt-2.5 pb-1.5")}>
          <div className="flex items-baseline justify-between gap-2.5">
            <h2 id="skb-wt" className="text-[15px] font-semibold whitespace-nowrap text-ink">
              {t("Where your time went")}
            </h2>
            <span className="truncate text-[12px] text-ink-muted">{periodRows.length ? `${t(periodRows.length === 1 ? "{count} session" : "{count} sessions", { count: count(periodRows.length) })} · ${periodName}` : periodName}</span>
          </div>
          {perSkill.length ? (
            <div className="-mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
              {perSkill.map(({ skill, sessions, amount }) => {
                const { color } = skillColors(skill);
                const pct = Math.round((sessions / periodRows.length) * 100);
                return (
                  <Link key={skill.id} href={skillHref(skill.id)} title={t("Open {name}", { name: skill.name })} className="grid w-full shrink-0 grid-cols-[30px_minmax(0,1fr)_44px] items-center gap-2.5 rounded-[9px] px-2 py-1.25 hover:bg-hover">
                    <span aria-hidden="true" className="flex size-7.5 items-center justify-center rounded-[9px] text-white" style={{ background: `linear-gradient(145deg, color-mix(in srgb, ${color} 75%, white), color-mix(in srgb, ${color} 82%, black))` }}>
                      <CategoryIcon category={skill.category} className="size-3.75" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="flex min-w-0 items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink">{skill.name}</span>
                        <span className="max-w-[60%] shrink-0 truncate text-[12px] text-ink-muted">
                          {t(sessions === 1 ? "{count} session" : "{count} sessions", { count: count(sessions) })} · {amountOf(skill.unit, amount, t, fmt)}
                        </span>
                      </span>
                      <span className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                        <span className="block h-full rounded-full" style={{ width: `${Math.max(4, Math.round((sessions / perSkill[0].sessions) * 100))}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${color} 50%, white), ${color})` }} />
                      </span>
                    </span>
                    <span className="text-right text-[14px] font-bold tabular-nums" style={{ color }}>
                      {count(pct)}%
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mb-1 flex min-h-30 flex-1 flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-line bg-page/50 text-center">
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-[10px] bg-emerald-soft">
                <GraduationCap className="size-4.5 text-emerald" />
              </span>
              <span className="text-[14px] font-semibold text-ink-2">{t("No practice in {period}", { period: periodName })}</span>
              <span className="text-[12.5px] text-ink-muted">{t("Pick another period, or log a session on Learning now.")}</span>
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="skb-tt" className={cn(LB_CARD, "flex flex-1 flex-col gap-1.5 px-4 pt-2.5 pb-1")}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="skb-tt" className="text-[15px] font-semibold whitespace-nowrap text-ink">
            {t("All skills")}
          </h2>
          <div role="tablist" aria-label={t("Filter by status")} className="flex flex-wrap gap-0.5 rounded-[9px] bg-surface-sunken p-0.75">
            {TABS.map((value) => {
              const on = tab === value;
              const n = value === "all" ? skills.length : skills.filter((skill) => stateOf(skill) === value).length;
              return (
                <button key={value} type="button" role="tab" aria-selected={on} onClick={() => setTab(value)} className={cn("h-7 rounded-[7px] px-2.5 text-[12.5px] font-semibold whitespace-nowrap", on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(15,23,42,0.12)]" : "text-ink-muted hover:text-ink")}>
                  {t(value === "all" ? "All" : STATE_INFO[value].label)}
                  <span className="ml-1.25 font-medium text-ink-faint">{count(n)}</span>
                </button>
              );
            })}
          </div>
          <span className="flex-1" />
          <span className="relative flex items-center max-md:w-full">
            <Search className="pointer-events-none absolute left-2.5 size-3.75 text-ink-faint" aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search skills")} aria-label={t("Search skills")} className="h-8.5 w-62.5 rounded-[8px] border border-input bg-surface pr-3 pl-8 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-emerald focus:focus-halo max-md:w-full" />
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-[13px]">
            <thead className="sticky top-0 z-1 bg-surface">
              <tr className="text-left text-[12px] text-ink-muted">
                {[
                  ["Skill", "w-[20%]"],
                  ["Category", "w-[12%]"],
                  ["Status", "w-[10%]"],
                  ["Progress", "w-[14%]"],
                  ["Sessions", "w-[6%] text-right"],
                  ["Logged", "w-[9%] text-right"],
                  ["Started", "w-[14.5%]"],
                  ["Finished / last", "w-[14.5%]"],
                ].map(([label, width]) => (
                  <th key={label} className={cn("border-b border-line px-2 py-1.5 font-semibold whitespace-nowrap", width)}>
                    {t(label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((skill) => {
                const state = stateOf(skill);
                const { color } = skillColors(skill);
                const cat = categoryOf(skill.category);
                const progress = progressOf(skill);
                const summary = summaries[skill.id];
                const lastDay = summary?.lastPractised ?? null;
                const done = state === "done";
                return (
                  <tr key={skill.id} tabIndex={0} onClick={() => router.push(skillHref(skill.id))} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && router.push(skillHref(skill.id))} className="cursor-pointer border-b border-divider transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring">
                    <td className="px-2 py-1.5">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-[8px] text-white" style={{ background: `linear-gradient(145deg, color-mix(in srgb, ${color} 75%, white), color-mix(in srgb, ${color} 82%, black))`, boxShadow: `0 2px 6px -2px ${color}` }}>
                          <CategoryIcon category={skill.category} className="size-3.5" />
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <Link href={skillHref(skill.id)} onClick={(event) => event.stopPropagation()} className="truncate font-semibold text-ink hover:underline">
                            {skill.name}
                          </Link>
                          <span className="truncate text-[12px] text-ink-muted">{skill.source || "–"}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="flex min-w-0 items-center gap-1.75">
                        <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", cat.dot)} />
                        <span className="truncate text-ink-2">{t(cat.label)}</span>
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={cn("inline-flex h-5.5 max-w-full items-center truncate rounded-full px-2.25 text-[11.5px] font-bold", STATE_INFO[state].chip)}>{t(STATE_INFO[state].label)}</span>
                    </td>
                    <td className="px-2 py-1.5" title={`${doneText(skill, fmt)} / ${totalText(skill, t, fmt)}`}>
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                          <span className="block h-full rounded-full" style={{ width: `${progress.pct}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, white), ${color})` }} />
                        </span>
                        <span className="w-9 text-right text-[12px] font-semibold text-ink-2 tabular-nums">{count(progress.pct)}%</span>
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right text-ink-2 tabular-nums">{count(summary?.sessions ?? 0)}</td>
                    <td className="truncate px-2 py-1.5 text-right text-ink-2 tabular-nums">{summary?.logged ? amountOf(skill.unit, summary.logged, t, fmt) : "–"}</td>
                    <td className="truncate px-2 py-1.5 text-ink-2">{skill.startedAt ? dayText(skill.startedAt.slice(0, 10), fmt, "dayMonthYY") : "–"}</td>
                    <td className="px-2 py-1.5">
                      <span className={cn("flex min-w-0 items-center gap-1.25", done ? "font-semibold text-tint-green-ink" : lastDay ? "text-ink-2" : "text-ink-faint")}>
                        {done && <Check className="size-3.25 shrink-0" strokeWidth={3} aria-hidden="true" />}
                        <span className="truncate">{done ? (skill.completedAt ? dayText(skill.completedAt.slice(0, 10), fmt, "dayMonthYY") : t("Completed")) : lastDay ? agoText(lastDay, today, t, fmt) : "–"}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-5.5 text-center text-[13.5px] text-ink-muted">
              <span>{skills.length ? t("No skills match.") : t("You have no skills yet.")}</span>
              {!skills.length && (
                <Link href={`${MY_SKILLS_HREF}?add=1`} className="inline-flex h-8.5 items-center rounded-[8px] border border-input bg-surface px-3.5 text-[13px] font-semibold text-ink hover:bg-hover">
                  {t("Add your first skill")}
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </PageFrame>
  );
}
