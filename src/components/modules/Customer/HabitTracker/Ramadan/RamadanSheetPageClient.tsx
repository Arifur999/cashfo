"use client";

import { Check, MoonStar, MoreVertical, Plus, Star, Trash2 } from "lucide-react";
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
import { actionError, daysText, dayText, nextRamadan, WEEKDAY_MIN } from "@/lib/customer/habitDisplay";
import { deleteHabitTrackerAction, removeTrackerItemAction, setHabitTrackerCheckAction, setRamadanParasAction } from "@/lib/customer/habitsActions";
import { ASHRAS, ashraSummary, ramadanCell, ramadanDays, ramadanSummary, ramadanWindow, type SummaryNote, summaryNote, withParas } from "@/lib/customer/ramadanDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AddRowDialog } from "../Tracker/AddRowDialog";
import { RecordEyebrow } from "../Tracker/RecordEyebrow";
import { type BoxState, BoxSwatch, DayTotal, SheetBox } from "../Tracker/SheetBox";
import { useRovingGrid } from "../Tracker/useRovingGrid";
import { withCheck } from "../trackerChecks";
import { QuranKhatamCard } from "./QuranKhatamCard";
import { RamadanSetupDialog } from "./RamadanSetupDialog";
import { SehriIftarCard } from "./SehriIftarCard";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";

interface RamadanSheetPageClientProps {
  tracker: HabitMonthTracker;
  all: HabitMonthTracker[];
  today: string;
}

const SUGGESTIONS = ["Taraweeh", "Quran", "Zikr", "Sadaqah", "Tahajjud", "Dua", "Hadis"];
const ASHRA_TONE = { 1: "bg-pillar-insights-soft text-pillar-insights", 2: "bg-info-soft text-info", 3: "bg-warning-soft text-warning" } as const;
const STATUS_CHIP = { upcoming: "neutral", going: "mint", completed: "income" } as const;
const STATUS_LABEL = { upcoming: "Coming up", going: "Going on", completed: "Completed" } as const;
// The row names stay put while the days scroll under them.
const STICKY = "sticky left-0 z-10 shrink-0 border-r border-divider bg-surface pr-3";

const LEGEND: { state: BoxState; label: string }[] = [
  { state: "done", label: "Done" },
  { state: "missed", label: "Not done" },
  { state: "open", label: "Today, not marked yet" },
  { state: "locked", label: "Later" },
];

function noteText(note: SummaryNote, t: (key: string, values?: Record<string, string | number>) => string, count: (n: number) => string): string {
  if (!note) return "";
  if (note.kind === "everyDay") return t("Every day");
  if (note.kind === "makeUp") return t(note.fasts === 1 ? "{count} fast to make up before next Ramadan" : "{count} fasts to make up before next Ramadan", { count: count(note.fasts) });
  return t(note.nights ? "All of the last ten nights" : "Every day of the last ten");
}

// A tick, or a day's paras, layered over the server's sheet until it answers.
type SheetUpdate = { kind: "check"; day: number; item: string; checked: boolean } | { kind: "paras"; day: number; paras: number };

// One Ramadan: the sheet with its three ashras and the odd nights of the
// last ten marked, a summary of every row, the Quran khatam, and Sehri and
// Iftar times. On a phone the sheet opens scrolled to today with the rows'
// names pinned; it is one Tab stop, its boxes reached with the arrow keys.
export function RamadanSheetPageClient({ tracker, all, today }: RamadanSheetPageClientProps) {
  const { t, locale } = useLocale();
  const { hijriAdjust } = usePrayerSettings().settings;
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
  const todayHead = useRef<HTMLSpanElement>(null);
  const count = (n: number) => formatCount(n, locale);
  const digits = (value: number | string | null) => toLocaleDigits(String(value ?? ""), locale);

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
    const head = todayHead.current;
    if (!box || !head || box.scrollWidth <= box.clientWidth) return;
    const left = head.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
    box.scrollLeft = Math.max(0, left - box.clientWidth / 2 + head.offsetWidth / 2);
  }, []);

  function toggle(day: number, item: string, checked: boolean) {
    startTransition(async () => {
      applyUpdate({ kind: "check", day, item, checked });
      const result = await setHabitTrackerCheckAction(sheet.id, { day, item, checked });
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to update", t, locale));
    });
  }

  function logParas(day: number, paras: number) {
    startParas(async () => {
      applyUpdate({ kind: "paras", day, paras });
      const result = await setRamadanParasAction(sheet.id, { day, paras });
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to save the paras", t, locale));
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
        toast.error(actionError(result.message, "Failed to remove the row", t, locale));
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
        toast.error(actionError(result.message, "Failed to remove month tracker", t, locale));
      }
    });
  }

  const totals = days.map((d) => ({ day: d.day, count: d.day <= counted ? sheet.checks.filter((c) => c.day === d.day).length : null, open: d.day === window.todayDay }));
  const dateRange = window.start && window.end ? t("{from} to {to}", { from: dayText(window.start, locale, "dayMonth"), to: dayText(window.end, locale, "dayMonthYear") }) : null;

  return (
    <PageFrame className="gap-4">
      <TopbarExtras record={title} />
      <PageHeader
        eyebrow={<RecordEyebrow href="/habit-tracker/habits?category=Ramadan" back={t("All Ramadans")} pillar={t("Habits")} />}
        tone="habits"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {title}
            <Chip tone={STATUS_CHIP[window.status]} size="sm" className="gap-1">
              {window.status === "completed" && <Check className="size-3" aria-hidden="true" />}
              {t(STATUS_LABEL[window.status])}
            </Chip>
          </span>
        }
        description={[dateRange, daysText(sheet.totalDays, t, locale)].filter(Boolean).join(" · ")}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(true)}>
              <Plus />
              {t("Add a row")}
            </Button>
            {!hasNext && window.status === "completed" && (
              <Button onClick={() => setSetupOpen(true)}>
                <MoonStar />
                {t("Set up {name}", { name: nextName })}
              </Button>
            )}
            {(removable.length > 0 || deletable) && (
              <DropdownMenu>
                <DropdownMenuTrigger aria-label={t("More")} className="flex size-10 items-center justify-center rounded-md border border-line-strong bg-surface text-ink hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
                  <MoreVertical className="size-4.5" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                  {removable.map((item) => (
                    <DropdownMenuItem key={item} onSelect={() => setRemoving(item)} className="rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken pointer-coarse:min-h-11">
                      <Trash2 className="size-4" aria-hidden="true" />
                      {t("Remove the {name} row", { name: t(item) })}
                    </DropdownMenuItem>
                  ))}
                  {deletable && (
                    <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense pointer-coarse:min-h-11">
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

      {window.status !== "going" && (
        <div className="flex items-center gap-3 rounded-md border border-mint-200 bg-mint-50 px-4 py-3 text-body text-ink">
          <MoonStar className="size-5 shrink-0 text-emerald" aria-hidden="true" />
          <span>
            <b className="font-semibold">{next.daysToGo === 0 ? t("{name} is going on now.", { name: nextName }) : t(next.daysToGo === 1 ? "{name} begins around {date}, in {count} day." : "{name} begins around {date}, in {count} days.", { name: nextName, date: dayText(next.startsOn, locale, "dayMonthYear"), count: count(next.daysToGo) })}</b>{" "}
            {next.daysToGo > 0 && t("The exact day depends on the moon, so the date can move by one day.")}
          </span>
        </div>
      )}

      <Card padding="none" className="flex min-w-0 flex-col gap-3 px-5 pt-4 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-title font-semibold text-ink">{t("Ramadan sheet")}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-ink-2">
            {LEGEND.map((entry) => (
              <span key={entry.state} className="flex items-center gap-2">
                <BoxSwatch state={entry.state} />
                {t(entry.label)}
              </span>
            ))}
            <span className="flex items-center gap-2">
              <Star className="size-4 fill-warning text-warning" aria-hidden="true" />
              {t("Odd night of the last ten")}
            </span>
          </div>
        </div>
        <div ref={scroller} role="grid" aria-label={t("{name} sheet", { name: title })} onKeyDown={grid.onKeyDown} className="flex flex-col gap-0.75 overflow-x-auto pb-1">
          <div className="flex gap-0.75">
            <span className={cn(STICKY, "w-30 self-stretch")} />
            {ASHRAS.map((a) => {
              const span = days.filter((d) => d.ashra === a.n).length;
              const pct = ashras.find((x) => x.n === a.n)?.pct ?? 0;
              return (
                <span key={a.n} className={cn("flex h-7.5 shrink-0 items-center justify-between gap-2 rounded-sm px-3 text-caption", ASHRA_TONE[a.n])} style={{ width: `${span * 27 + (span - 1) * 3}px` }}>
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
              return (
                <span
                  key={d.day}
                  ref={isToday ? todayHead : undefined}
                  role="columnheader"
                  title={[t("{day} Ramadan", { day: count(d.day) }), d.date ? dayText(d.date, locale, "dayMonth") : null, d.oddNight ? t("odd night") : null].filter(Boolean).join(" · ")}
                  className={cn("flex w-6.75 shrink-0 flex-col items-center gap-px text-caption font-semibold tabular-nums", isToday ? "rounded-sm bg-emerald text-on-action" : d.oddNight ? "text-warning" : "text-ink-muted")}
                >
                  <Star className={cn("size-2.5", d.oddNight ? "fill-warning text-warning" : "invisible")} aria-hidden="true" />
                  <span>{count(d.day)}</span>
                  <span className="text-caption leading-none opacity-80">{d.weekday !== null ? t(WEEKDAY_MIN[d.weekday]) : ""}</span>
                </span>
              );
            })}
          </div>
          {sheet.items.map((item, row) => {
            const line = summary.items.find((i) => i.item === item);
            return (
              <div key={item} role="row" className="flex items-center gap-0.75">
                <span role="rowheader" className={cn(STICKY, "flex w-30 items-baseline justify-between gap-1")}>
                  <span className="truncate text-body font-semibold text-ink">{t(item)}</span>
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
                      state={state}
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
          <div role="row" className="mt-1 flex items-center gap-0.75 border-t border-dashed border-line pt-2">
            <span role="rowheader" className={cn(STICKY, "w-30 text-small font-semibold text-ink-2")}>
              {t("Done that day")}
            </span>
            {totals.map((total) => (
              <DayTotal key={total.day} count={total.count} label={total.count === null ? undefined : count(total.count)} of={sheet.items.length} open={total.open} title={t("{done} of {total} done", { done: count(total.count ?? 0), total: count(sheet.items.length) })} />
            ))}
          </div>
        </div>
      </Card>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Card padding="none" className="flex min-w-0 flex-col gap-3 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-title font-semibold text-ink">{t("Summary")}</h2>
            <span className="text-small font-bold text-brand-ink">{t("{pct}% of everything", { pct: count(summary.pct) })}</span>
          </div>
          {summary.items.map((row) => (
            <div key={row.item} className="grid grid-cols-[82px_minmax(0,1fr)_auto] items-center gap-3 text-small">
              <span className="truncate font-medium text-ink">{t(row.item)}</span>
              <span className="flex min-w-0 flex-col gap-0.75">
                <span className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <span className={cn("block h-full rounded-full", row.pct === 100 ? "bg-income" : "bg-emerald")} style={{ width: `${row.pct}%` }} />
                </span>
                <span className="text-caption font-normal text-ink-muted">{noteText(summaryNote(sheet, window, row), t, count)}</span>
              </span>
              <span className="text-right font-bold text-ink tabular-nums">
                {count(row.done)}/{count(row.of)}
              </span>
            </div>
          ))}
          {summary.items.length === 0 && <p className="text-small text-ink-muted">{t("Add a row to start.")}</p>}
        </Card>

        <QuranKhatamCard sheet={sheet} window={window} days={days} onParas={logParas} saving={savingParas} />
        <SehriIftarCard day={window.status === "going" ? today : window.status === "upcoming" && window.start ? window.start : next.startsOn} todayDay={window.todayDay} year={window.status === "completed" ? next.year : window.hijriYear} />
      </div>

      <AddRowDialog open={addOpen} onClose={() => setAddOpen(false)} trackerId={sheet.id} existing={sheet.items} suggestions={SUGGESTIONS} description={t("Something to keep up every day of Ramadan, like Taraweeh or a para of Quran.")} />
      <RamadanSetupDialog open={setupOpen} onClose={() => setSetupOpen(false)} existing={all} defaultYear={Number(next.startsOn.slice(0, 4))} />
      <ConfirmDialog open={removing !== null} onClose={() => !isPending && setRemoving(null)} onConfirm={removeRow} icon={<Trash2 />} title={t("Remove {name}?", { name: removing ? t(removing) : "" })} description={t("Its ticks on this sheet go with it.")} confirmLabel={t("Remove")} isPending={isPending} />
      <ConfirmDialog open={confirmDelete} onClose={() => !isPending && setConfirmDelete(false)} onConfirm={deleteSheet} isPending={isPending} title={t("Delete {name}'s sheet?", { name: title })} description={t("Nothing is marked on it, so nothing is lost. You can set it up again later.")} confirmLabel={t("Delete sheet")} />
    </PageFrame>
  );
}
