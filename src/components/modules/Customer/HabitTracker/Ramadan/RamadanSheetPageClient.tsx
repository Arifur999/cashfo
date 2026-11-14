"use client";

import { ChevronDown, MoonStar, MoreVertical, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { actionError, daysText, dayText, nextRamadan, WEEKDAY_MIN } from "@/lib/customer/habitDisplay";
import { clockOf, prayerTimesFor } from "@/lib/customer/prayerTimes";
import { deleteHabitTrackerAction, removeTrackerItemAction, setHabitTrackerCheckAction, setRamadanParasAction } from "@/lib/customer/habitsActions";
import { ASHRAS, ashraSummary, fastsToMakeUp, isNightRow, quranItem, quranKhatam, ramadanCell, ramadanDays, ramadanSummary, ramadanWindow, type SummaryNote, summaryNote, withParas } from "@/lib/customer/ramadanDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AddRowDialog } from "../Tracker/AddRowDialog";
import { type BoxState, BoxSwatch, DayTotal, SheetBox } from "../Tracker/SheetBox";
import { useRovingGrid } from "../Tracker/useRovingGrid";
import { withCheck } from "../trackerChecks";
import { QuranKhatamCard } from "./QuranKhatamCard";
import { RamadanSetupDialog } from "./RamadanSetupDialog";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";

interface RamadanSheetPageClientProps {
  tracker: HabitMonthTracker;
  all: HabitMonthTracker[];
  today: string;
}

const SUGGESTIONS = ["Taraweeh", "Quran", "Zikr", "Sadaqah", "Tahajjud", "Dua", "Hadis"];
// Mercy in the brand's teal, forgiveness in sky blue, safety in amber.
const ASHRA_TONE = { 1: "bg-emerald-tint text-brand-ink", 2: "bg-info-soft text-info", 3: "bg-warning-soft text-warning-ink" } as const;
const STATUS_CHIP = { upcoming: "neutral", going: "mint", completed: "income" } as const;
const STATUS_LABEL = { upcoming: "Coming up", going: "Going on", completed: "Completed" } as const;
// The row names stay put while the days scroll under them.
const STICKY = "sticky left-0 z-10 shrink-0 border-r border-divider bg-surface pr-2.5";

// Done and not done, and while Ramadan is on, today's open box and the days
// to come.
const LEGEND: { state: BoxState; label: string; going?: boolean }[] = [
  { state: "done", label: "Done" },
  { state: "notDone", label: "Not done" },
  { state: "open", label: "Today, not marked yet", going: true },
  { state: "locked", label: "Later", going: true },
];

function noteText(note: SummaryNote, t: (key: string, values?: Record<string, string | number>) => string, count: (n: number) => string): string {
  if (!note) return "";
  if (note.kind === "everyDay") return t("Every day");
  if (note.kind === "makeUp") return t(note.fasts === 1 ? "{count} fast to make up before next Ramadan" : "{count} fasts to make up before next Ramadan", { count: count(note.fasts) });
  return t(note.nights ? "All of the last ten nights" : "Every day of the last ten");
}

// A tick, or a day's paras, layered over the server's sheet until it answers.
type SheetUpdate = { kind: "check"; day: number; item: string; checked: boolean } | { kind: "paras"; day: number; paras: number };

// Ramadan › Dashboard (the RamadanSheet board): one Ramadan's figures, the
// sheet with its three ashras and the odd nights of the last ten (a day's
// number ticks the whole day), each row, the Quran khatam and what stands
// out; the Ramadan to come with its Sehri and Iftar above. On a phone the
// sheet opens scrolled to today with the rows' names pinned; it is one Tab
// stop, its boxes reached with the arrow keys.
export function RamadanSheetPageClient({ tracker, all, today }: RamadanSheetPageClientProps) {
  const { t, fmt } = useLocale();
  const { settings } = usePrayerSettings();
  const { hijriAdjust } = settings;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [sheet, applyUpdate] = useOptimistic(tracker, (current, update: SheetUpdate) => (update.kind === "check" ? withCheck(current, update.day, update.item, update.checked) : withParas(current, update.day, update.paras)));
  const [savingParas, startParas] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startRemove] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const count = (n: number) => formatCount(n, fmt);
  const digits = (value: number | string | null) => toLocaleDigits(String(value ?? ""), fmt);

  const window = ramadanWindow(sheet, today, hijriAdjust);
  const days = ramadanDays(sheet, hijriAdjust);
  const summary = ramadanSummary(sheet, window);
  const ashras = ashraSummary(sheet, window);
  const next = nextRamadan(today, hijriAdjust);
  const hasNext = all.some((tr) => tr.year === Number(next.startsOn.slice(0, 4)));
  const title = t("Ramadan {year}", { year: digits(window.hijriYear ?? sheet.year) });
  const nextName = t("Ramadan {year}", { year: digits(next.year) });
  const counted = window.status === "completed" ? sheet.totalDays : (window.todayDay ?? 0);
  const deletable = sheet.checks.length === 0 && sheet.paras.length === 0;
  const removable = sheet.items.filter((item) => item !== "Roza");
  const startDay = window.todayDay ?? (window.status === "completed" ? 1 : 0);
  const grid = useRovingGrid(sheet.items.length, sheet.totalDays, { row: 0, col: Math.max(0, startDay - 1) });

  // Today in view, whatever the width. Measured against the scroller itself
  // (offsetLeft would count the sidebar and the page's gutters too, and push
  // today under the pinned row names), with today's column in the middle.
  useEffect(() => {
    const box = scroller.current;
    const head = box?.querySelector<HTMLElement>("[data-today]");
    if (!box || !head || box.scrollWidth <= box.clientWidth) return;
    const left = head.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
    box.scrollLeft = Math.max(0, left - box.clientWidth / 2 + head.offsetWidth / 2);
  }, []);

  function toggle(day: number, item: string, checked: boolean) {
    startTransition(async () => {
      applyUpdate({ kind: "check", day, item, checked });
      const result = await setHabitTrackerCheckAction(sheet.id, { day, item, checked });
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to update", t, fmt));
    });
  }

  function logParas(day: number, paras: number) {
    startParas(async () => {
      applyUpdate({ kind: "paras", day, paras });
      const result = await setRamadanParasAction(sheet.id, { day, paras });
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to save the paras", t, fmt));
    });
  }

  function removeRow() {
    if (!removing) return;
    const name = removing;
    startRemove(async () => {
      const result = await removeTrackerItemAction(sheet.id, name);
      if (result.success) {
        toast.success(t("Row removed"));
        setRemoving(null);
        router.refresh();
      } else {
        toast.error(actionError(result.message, "Failed to remove the row", t, fmt));
      }
    });
  }

  function deleteSheet() {
    startRemove(async () => {
      const result = await deleteHabitTrackerAction(sheet.id);
      if (result.success) {
        toast.success(t("Sheet deleted"));
        setConfirmDelete(false);
        router.push("/habit-tracker/habits?category=Ramadan");
      } else {
        toast.error(actionError(result.message, "Failed to remove month tracker", t, fmt));
      }
    });
  }

  const totals = days.map((d) => ({ day: d.day, count: d.day <= counted ? sheet.checks.filter((c) => c.day === d.day).length : null, open: d.day === window.todayDay }));
  const dateRange = window.start && window.end ? t("{from} to {to}", { from: dayText(window.start, fmt, "dayMonth"), to: dayText(window.end, fmt, "dayMonthYear") }) : null;
  const sorted = [...all].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const yearName = (tracker: HabitMonthTracker) => t("Ramadan {year}", { year: digits(ramadanWindow(tracker, today, hijriAdjust).hijriYear ?? tracker.year) });

  // The four figures: fasts kept, the second row (Taraweeh on the board),
  // the Quran and everything.
  const roza = summary.items.find((row) => row.item === "Roza");
  const second = summary.items.find((row) => row.item === "Taraweeh") ?? summary.items.find((row) => row.item !== "Roza" && !quranItem([row.item]));
  const byNight = second ? isNightRow(second.item) : false;
  const khatam = quranKhatam(sheet);
  const toMakeUp = fastsToMakeUp(sheet, window).left;
  const stats = [
    roza && {
      label: t("Fasts kept"),
      value: t("{done} of {total}", { done: count(roza.done), total: count(roza.of) }),
      sub: roza.of === 0 ? t("Nothing to count yet") : roza.done === roza.of ? t("Every fast kept") : toMakeUp > 0 ? t("{count} to make up before next Ramadan", { count: count(toMakeUp) }) : t("All made up"),
      tone: toMakeUp > 0 ? "text-warning-ink" : "text-ink",
    },
    second && {
      label: t(second.item),
      value: byNight ? t(second.done === 1 ? "{count} night" : "{count} nights", { count: count(second.done) }) : daysText(second.done, t, fmt),
      sub: t(byNight ? "of {count} nights" : "of {count} days", { count: count(second.of) }),
      tone: "text-ink",
    },
    quranItem(sheet.items) && { label: t("Quran"), value: t("{count} of 30 paras", { count: count(Math.min(30, khatam.read)) }), sub: khatam.finishedOn ? t("Khatam done") : t("{count} paras to go", { count: count(Math.max(0, 30 - khatam.read)) }), tone: khatam.finishedOn ? "text-income" : "text-ink" },
    { label: t("Overall"), value: `${count(summary.pct)}%`, sub: t("Of everything on the sheet"), tone: "text-ink" },
  ].filter((stat): stat is { label: string; value: string; sub: string; tone: string } => !!stat);

  // What stands out: the strongest and the hardest row, the last ten
  // nights, and the Ramadan before.
  const rows = summary.items.filter((row) => row.of > 0);
  const strongest = [...rows].sort((a, b) => b.pct - a.pct)[0];
  const hardest = [...rows].sort((a, b) => a.pct - b.pct)[0];
  const lastTen = days.filter((d) => d.day >= 21 && d.day <= counted);
  const lastTenOf = lastTen.length * sheet.items.length;
  const lastTenDone = sheet.checks.filter((c) => c.day >= 21 && c.day <= counted && sheet.items.includes(c.item)).length;
  const before = sorted.find((tracker) => (tracker.year ?? 0) < (sheet.year ?? 0));
  const beforeSummary = before ? ramadanSummary(before, ramadanWindow(before, today, hijriAdjust)) : null;
  const standsOut: { key: string; tone: string; text: string }[] = [];
  if (strongest) standsOut.push({ key: "strongest", tone: "bg-income", text: t("{name} was the strongest: {done} of {total}.", { name: t(strongest.item), done: count(strongest.done), total: count(strongest.of) }) });
  if (hardest && hardest !== strongest && hardest.pct < 100) standsOut.push({ key: "hardest", tone: "bg-expense", text: t("{name} was the hardest: {done} of {total}.", { name: t(hardest.item), done: count(hardest.done), total: count(hardest.of) }) });
  if (lastTenOf > 0) standsOut.push({ key: "lastTen", tone: "bg-warning-fill", text: t("Last ten nights: {pct}% done.", { pct: count(Math.round((lastTenDone / lastTenOf) * 100)) }) });
  if (beforeSummary && beforeSummary.of > 0 && summary.of > 0 && before) {
    const change = summary.pct - beforeSummary.pct;
    standsOut.push({ key: "before", tone: change >= 0 ? "bg-income" : "bg-expense", text: t(change >= 0 ? "Up {change}% from {name}." : "Down {change}% from {name}.", { change: count(Math.abs(change)), name: yearName(before) }) });
  }

  // A day's number ticks every row that day (or, all ticked, clears them):
  // shown at once, saved one row after another, one refresh at the end.
  function tickDay(day: number) {
    const ticked = (item: string) => sheet.checks.some((c) => c.day === day && c.item === item);
    const checked = !sheet.items.every(ticked);
    const changes = sheet.items.filter((item) => ticked(item) !== checked);
    if (changes.length === 0) return;
    startTransition(async () => {
      for (const item of changes) applyUpdate({ kind: "check", day, item, checked });
      for (const item of changes) {
        const result = await setHabitTrackerCheckAction(sheet.id, { day, item, checked });
        if (!result.success) {
          toast.error(actionError(result.message, "Failed to update", t, fmt));
          break;
        }
      }
      router.refresh();
    });
  }

  const times = prayerTimesFor(settings, window.status === "going" ? today : window.status === "upcoming" && window.start ? window.start : next.startsOn);

  return (
    <PageFrame className="gap-3.5 md:pt-4.5">
      <TopbarExtras record={title} />
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {title}
            <Chip tone={STATUS_CHIP[window.status]} className="h-6 gap-1.25 px-2.25 font-semibold tracking-normal">
              {t(STATUS_LABEL[window.status])}
            </Chip>
          </span>
        }
        description={[dateRange, daysText(sheet.totalDays, t, fmt)].filter(Boolean).join(" · ")}
        actions={
          <>
            {sorted.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-10 min-w-44 items-center justify-between gap-2.5 rounded-sm border border-input bg-surface px-3 text-body font-semibold text-ink hover:bg-surface-sunken pointer-coarse:h-11">
                  <span className="flex items-center gap-2">
                    <MoonStar className="size-4 text-ink-muted" aria-hidden="true" />
                    {title}
                  </span>
                  <ChevronDown className="size-4 text-ink-muted" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-md border border-line bg-surface p-1 shadow-overlay ring-0">
                  {sorted.map((tracker) => (
                    <DropdownMenuItem key={tracker.id} asChild className={cn("rounded-sm px-3 py-2 text-body pointer-coarse:min-h-11", tracker.id === sheet.id ? "bg-emerald-soft font-semibold text-emerald" : "text-ink")}>
                      <Link href={`/habit-tracker/habits/ramadan/${tracker.id}`} aria-current={tracker.id === sheet.id ? "page" : undefined}>
                        {yearName(tracker)}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="secondary" onClick={() => setAddOpen(true)} className="rounded-sm px-3.5">
              <Plus className="text-ink-soft" />
              {t("Add a row")}
            </Button>
            {!hasNext && window.status === "completed" && (
              <Button onClick={() => setSetupOpen(true)} className="rounded-sm">
                <Plus />
                {t("Set up {name}", { name: nextName })}
              </Button>
            )}
            {(removable.length > 0 || deletable) && (
              <DropdownMenu>
                <DropdownMenuTrigger aria-label={t("More")} className="flex size-10 items-center justify-center rounded-sm border border-input bg-surface text-ink hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
                  <MoreVertical className="size-4.5" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-md border border-line bg-surface p-1 shadow-overlay ring-0">
                  {removable.map((item) => (
                    <DropdownMenuItem key={item} onSelect={() => setRemoving(item)} className="rounded-sm px-3 py-2 text-body text-ink focus:bg-surface-sunken pointer-coarse:min-h-11">
                      <Trash2 className="size-4" aria-hidden="true" />
                      {t("Remove the {name} row", { name: t(item) })}
                    </DropdownMenuItem>
                  ))}
                  {deletable && (
                    <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="rounded-sm px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense pointer-coarse:min-h-11">
                      <Trash2 className="size-4" aria-hidden="true" />
                      {t("Delete this sheet")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      {/* The Ramadan to come (or today, during one), with its Sehri and Iftar. */}
      <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-linear-to-br from-emerald to-forest px-5 py-3 text-white dark:text-on-action">
        <MoonStar className="size-4.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 basis-80 text-small">
          {window.status === "going" ? (
            <b className="font-semibold">{t("Day {day} of {total} · {name}", { day: count(window.todayDay ?? 1), total: count(sheet.totalDays), name: title })}</b>
          ) : (
            <>
              <b className="font-semibold">{next.daysToGo === 0 ? t("{name} is going on now.", { name: nextName }) : t(next.daysToGo === 1 ? "{name} begins around {date} · in {count} day." : "{name} begins around {date} · in {count} days.", { name: nextName, date: dayText(next.startsOn, fmt, "full"), count: count(next.daysToGo) })}</b>{" "}
              {next.daysToGo > 0 && <span className="opacity-90">{t("The exact day depends on the moon.")}</span>}
            </>
          )}
        </span>
        <span className="text-small opacity-90">{window.status === "going" ? t("{city}, today:", { city: t(settings.city) }) : t("{city}, day 1:", { city: t(settings.city) })}</span>
        <span className="rounded-full bg-white/18 px-3 py-1 text-small font-semibold tabular-nums">{t("Sehri ends {time}", { time: timeLabel(clockOf(times.Fajr), t, fmt) })}</span>
        <span className="rounded-full bg-white/18 px-3 py-1 text-small font-semibold tabular-nums">{t("Iftar {time}", { time: timeLabel(clockOf(times.Maghrib), t, fmt) })}</span>
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="none" className="flex min-w-0 flex-col gap-0.5 rounded-md px-4 py-2.75">
            <span className="text-[12.5px] font-medium text-ink-muted">{stat.label}</span>
            <span className={cn("text-[22px] font-bold tracking-[-0.02em] tabular-nums", stat.tone)}>{stat.value}</span>
            <span className="text-caption text-ink-muted">{stat.sub}</span>
          </Card>
        ))}
      </div>

      <Card padding="none" className="flex min-w-0 flex-col gap-2.5 rounded-md px-4.5 pt-3 pb-3.5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[15px] font-semibold text-ink">{t("Ramadan sheet")}</h2>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-caption text-ink-2">
            {LEGEND.filter((entry) => !entry.going || window.status === "going").map((entry) => (
              <span key={entry.state} className="flex items-center gap-1.5">
                <BoxSwatch state={entry.state} />
                {t(entry.label)}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <Star className="size-3.5 fill-warning-fill text-warning-fill" strokeWidth={1.5} aria-hidden="true" />
              {t("Odd night of the last ten")}
            </span>
            {counted > 0 && <span className="border-l border-line pl-3.5 text-ink-muted">{t("Tap a day number to tick the whole day")}</span>}
          </div>
        </div>
        <div ref={scroller} role="grid" aria-label={t("{name} sheet", { name: title })} onKeyDown={grid.onKeyDown} className="flex flex-col gap-0.75 overflow-x-auto pb-1">
          <div className="flex gap-0.75">
            <span className={cn(STICKY, "w-30 self-stretch")} />
            {ASHRAS.map((a) => {
              const span = days.filter((d) => d.ashra === a.n).length;
              const pct = ashras.find((x) => x.n === a.n)?.pct ?? 0;
              return (
                <span key={a.n} className={cn("flex h-7.5 shrink-0 items-center justify-between gap-2 rounded-[7px] px-2.5 text-caption", ASHRA_TONE[a.n])} style={{ width: `${span * 27 + (span - 1) * 3}px` }}>
                  <span className="truncate">
                    <b className="font-bold">{t(a.name)}</b> · {t(a.meaning)}
                  </span>
                  <span className="font-bold tabular-nums">{count(pct)}%</span>
                </span>
              );
            })}
          </div>
          <div role="row" className="my-0.75 flex items-end gap-0.75">
            <span className={cn(STICKY, "w-30 self-stretch")} />
            {days.map((d) => {
              const isToday = d.day === window.todayDay;
              const label = [t("{day} Ramadan", { day: count(d.day) }), d.date ? dayText(d.date, fmt, "dayMonth") : null, d.oddNight ? t("odd night") : null].filter(Boolean).join(" · ");
              const head = (
                <>
                  <Star className={cn("size-2.75", d.oddNight ? "fill-warning-fill text-warning-fill" : "invisible")} strokeWidth={1.5} aria-hidden="true" />
                  <span>{count(d.day)}</span>
                  <span className={cn("text-[9.5px] leading-none", isToday ? "opacity-80" : "text-ink-faint")}>{d.weekday !== null ? t(WEEKDAY_MIN[d.weekday]) : ""}</span>
                </>
              );
              const headClass = cn("flex w-full flex-col items-center gap-px rounded-[6px] text-caption font-semibold tabular-nums", isToday ? "bg-emerald text-on-action" : d.oddNight ? "text-warning" : "text-ink-muted");
              return (
                <span key={d.day} role="columnheader" data-today={isToday || undefined} className="flex w-6.75 shrink-0">
                  {d.day <= counted ? (
                    <button type="button" tabIndex={-1} title={t("{day}: tick the whole day", { day: label })} aria-label={t("{day}: tick the whole day", { day: label })} onClick={() => tickDay(d.day)} className={cn(headClass, !isToday && "hover:bg-surface-sunken")}>
                      {head}
                    </button>
                  ) : (
                    <span title={label} className={headClass}>
                      {head}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          {sheet.items.map((item, row) => {
            const line = summary.items.find((i) => i.item === item);
            return (
              <div key={item} role="row" className="flex items-center gap-0.75">
                <span role="rowheader" className={cn(STICKY, "flex w-30 items-baseline justify-between gap-1")}>
                  <span className="truncate text-[13.5px] font-semibold text-ink">{t(item)}</span>
                  <span className="text-caption font-normal text-ink-muted tabular-nums">
                    {count(line?.done ?? 0)}/{count(line?.of ?? 0)}
                  </span>
                </span>
                {days.map((d) => {
                  const state = ramadanCell(sheet, window, d.day, item);
                  const cell = { row, col: d.day - 1 };
                  return (
                    <SheetBox
                      key={d.day}
                      ref={grid.ref(cell)}
                      state={state === "missed" ? "notDone" : state}
                      disabled={state === "locked"}
                      tabIndex={grid.tabIndex(cell)}
                      onFocus={() => grid.setActive(cell)}
                      onToggle={() => toggle(d.day, item, state !== "done")}
                      label={`${t(item)}, ${t("{day} Ramadan", { day: count(d.day) })}: ${t(state === "done" ? "done" : state === "missed" ? "not done" : state === "open" ? "not marked yet" : "not yet")}`}
                    />
                  );
                })}
              </div>
            );
          })}
          <div role="row" className="mt-1.25 flex items-center gap-0.75 border-t border-dashed border-line pt-2">
            <span role="rowheader" className={cn(STICKY, "w-30 text-[12.5px] font-semibold text-ink-soft")}>
              {t("Done that day")}
            </span>
            {totals.map((total) => (
              <DayTotal key={total.day} count={total.count} label={total.count === null ? undefined : count(total.count)} of={sheet.items.length} open={total.open} title={t("{done} of {total} done", { done: count(total.count ?? 0), total: count(sheet.items.length) })} />
            ))}
          </div>
        </div>
      </Card>

      <div className="grid items-stretch gap-3.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Card padding="none" className="flex min-w-0 flex-col gap-2.5 rounded-md px-4.5 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-ink">{t("Each row")}</h2>
            <span className="text-small font-bold text-emerald">{t("{pct}% of everything", { pct: count(summary.pct) })}</span>
          </div>
          {summary.items.map((row) => (
            <div key={row.item} className="grid grid-cols-[92px_minmax(0,1fr)_minmax(46px,auto)] items-center gap-2.5 text-small">
              <span className="truncate font-medium text-ink">{t(row.item)}</span>
              <span className="block h-2 overflow-hidden rounded-full bg-surface-sunken" title={noteText(summaryNote(sheet, window, row), t, count) || undefined}>
                <span className={cn("block h-full rounded-full", row.pct === 100 ? "bg-income" : "bg-emerald")} style={{ width: `${row.pct}%` }} />
              </span>
              <span className="text-right font-bold text-ink tabular-nums">
                {count(row.done)}/{count(row.of)}
              </span>
            </div>
          ))}
          {summary.items.length === 0 && <p className="text-small text-ink-muted">{t("Add a row to start.")}</p>}
        </Card>

        <QuranKhatamCard sheet={sheet} window={window} days={days} onParas={logParas} saving={savingParas} />

        <Card padding="none" className="flex min-w-0 flex-col gap-2.5 rounded-md px-4.5 py-3.5">
          <h2 className="text-[15px] font-semibold text-ink">{t("What stands out")}</h2>
          {standsOut.length === 0 ? (
            <p className="text-small text-ink-muted">{t("Tick a few days and the sheet starts to speak.")}</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {standsOut.map((item) => (
                <li key={item.key} className="flex items-start gap-2.5 text-small leading-[1.45] text-ink-2">
                  <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.tone)} />
                  {item.text}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <AddRowDialog open={addOpen} onClose={() => setAddOpen(false)} trackerId={sheet.id} existing={sheet.items} suggestions={SUGGESTIONS} description={t("Something to keep up every day of Ramadan, like Taraweeh or a para of Quran.")} />
      <RamadanSetupDialog open={setupOpen} onClose={() => setSetupOpen(false)} existing={all} defaultYear={Number(next.startsOn.slice(0, 4))} />
      <ConfirmDialog open={removing !== null} onClose={() => !isPending && setRemoving(null)} onConfirm={removeRow} icon={<Trash2 />} title={t("Remove {name}?", { name: removing ? t(removing) : "" })} description={t("Its ticks on this sheet go with it.")} confirmLabel={t("Remove")} isPending={isPending} />
      <ConfirmDialog open={confirmDelete} onClose={() => !isPending && setConfirmDelete(false)} onConfirm={deleteSheet} isPending={isPending} title={t("Delete {name}'s sheet?", { name: title })} description={t("Nothing is marked on it, so nothing is lost. You can set it up again later.")} confirmLabel={t("Delete sheet")} />
    </PageFrame>
  );
}
