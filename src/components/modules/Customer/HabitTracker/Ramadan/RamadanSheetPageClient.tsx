"use client";

import { Check, ChevronLeft, MoonStar, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { nextRamadan, WEEKDAY_SHORT } from "@/lib/customer/habitDisplay";
import { removeTrackerItemAction, setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { ASHRAS, ashraSummary, oddNights, ramadanCell, ramadanDays, ramadanSummary, ramadanWindow } from "@/lib/customer/ramadanDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AddRowDialog } from "../Tracker/AddRowDialog";
import { DayTotal, SheetBox } from "../Tracker/SheetBox";
import { withCheck } from "../trackerChecks";
import { RamadanSetupDialog } from "./RamadanSetupDialog";

interface RamadanSheetPageClientProps {
  tracker: HabitMonthTracker;
  all: HabitMonthTracker[];
  today: string;
}

const SUGGESTIONS = ["Taraweeh", "Quran", "Zikr", "Sadaqah", "Tahajjud", "Dua", "Hadis"];
const ASHRA_TONE = { 1: "bg-pillar-insights-soft text-pillar-insights", 2: "bg-info-soft text-info", 3: "bg-warning-soft text-warning" } as const;
const STATUS_CHIP = { upcoming: "neutral", going: "mint", completed: "income" } as const;
const STATUS_LABEL = { upcoming: "Coming up", going: "Going on", completed: "Completed" } as const;

// One Ramadan: the sheet with its three ashras and the odd nights of the
// last ten marked, a summary of every row, the ashras and the odd nights.
export function RamadanSheetPageClient({ tracker, all, today }: RamadanSheetPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [sheet, applyCheck] = useOptimistic(tracker, (current, update: { day: number; item: string; checked: boolean }) => withCheck(current, update.day, update.item, update.checked));
  const [addOpen, setAddOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [isPending, startRemove] = useTransition();

  const window = ramadanWindow(sheet, today);
  const days = ramadanDays(sheet);
  const summary = ramadanSummary(sheet, window);
  const ashras = ashraSummary(sheet, window);
  const nights = oddNights(sheet, window);
  const next = nextRamadan(today);
  const hasNext = all.some((tr) => tr.year === Number(next.startsOn.slice(0, 4)));
  const title = `${t("Ramadan")} ${window.hijriYear ?? sheet.year}`;
  const counted = window.status === "completed" ? sheet.totalDays : (window.todayDay ?? 0);

  function toggle(day: number, item: string, checked: boolean) {
    startTransition(async () => {
      applyCheck({ day, item, checked });
      const result = await setHabitTrackerCheckAction(sheet.id, { day, item, checked });
      if (result.success) router.refresh();
      else toast.error(result.message ?? t("Failed to update"));
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
        toast.error(result.message ?? t("Failed to remove the row"));
      }
    });
  }

  const totals = days.map((d) => ({ day: d.day, count: d.day <= counted ? sheet.checks.filter((c) => c.day === d.day).length : null, open: d.day === window.todayDay }));

  return (
    <PageFrame className="gap-4">
      <PageHeader
        eyebrow={
          <span className="flex flex-col gap-1">
            <Link href="/habit-tracker/habits?category=Ramadan" className="flex items-center gap-1 text-small font-semibold text-ink-2 normal-case tracking-normal hover:text-ink">
              <ChevronLeft className="size-4" aria-hidden="true" />
              {t("All Ramadans")}
            </Link>
            <span>{t("Habits")}</span>
          </span>
        }
        tone="habits"
        title={
          <span className="flex items-center gap-3">
            {title}
            <Chip tone={STATUS_CHIP[window.status]} size="sm" className="gap-1">
              {window.status === "completed" && <Check className="size-3" aria-hidden="true" />}
              {t(STATUS_LABEL[window.status])}
            </Chip>
          </span>
        }
        description={window.start && window.end ? `${formatDate(window.start, "d MMM")} ${t("to")} ${formatDate(window.end, "d MMM yyyy")} · ${sheet.totalDays} ${t("days")}` : `${sheet.totalDays} ${t("days")}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(true)}>
              <Plus />
              {t("Add a row")}
            </Button>
            {!hasNext && window.status === "completed" && (
              <Button onClick={() => setSetupOpen(true)}>
                <MoonStar />
                {t("Set up Ramadan")} {next.year}
              </Button>
            )}
          </>
        }
      />

      {window.status !== "going" && (
        <div role="status" className="flex items-center gap-3 rounded-md border border-mint-200 bg-mint-50 px-4 py-3 text-body text-ink">
          <MoonStar className="size-5 shrink-0 text-emerald" aria-hidden="true" />
          <span>
            <b className="font-semibold">
              {t("Ramadan")} {next.year} {t("begins around")} {formatDate(next.startsOn, "d MMM yyyy")}, {t("in")} {next.daysToGo} {t("days")}.
            </b>{" "}
            {t("The exact day depends on the moon, so the date can move by one day.")}
          </span>
        </div>
      )}

      <Card padding="none" className="flex flex-col gap-3 px-5 pt-4 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-title font-semibold text-ink">{t("Ramadan sheet")}</h2>
          <div className="flex flex-wrap items-center gap-4 text-small text-ink-2">
            <span className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-[4px] bg-emerald text-white">
                <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
              </span>
              {t("Done")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-4 rounded-[4px] bg-expense-soft" />
              {t("Not done")}
            </span>
            <span className="flex items-center gap-2">
              <Star className="size-4 fill-warning text-warning" aria-hidden="true" />
              {t("Odd night of the last ten")}
            </span>
          </div>
        </div>
        <div role="grid" aria-label={`${title} ${t("sheet")}`} className="flex flex-col gap-0.75 overflow-x-auto pb-1">
          <div className="flex gap-0.75">
            <span className="w-30 shrink-0" />
            {ASHRAS.map((a) => {
              const count = days.filter((d) => d.ashra === a.n).length;
              const pct = ashras.find((x) => x.n === a.n)?.pct ?? 0;
              return (
                <span key={a.n} className={cn("flex h-7.5 shrink-0 items-center justify-between gap-2 rounded-sm px-3 text-caption", ASHRA_TONE[a.n])} style={{ width: `${count * 27 + (count - 1) * 3}px` }}>
                  <span>
                    <b className="font-bold">{t(a.name)}</b> · {t(a.meaning)}
                  </span>
                  <span className="font-bold tabular-nums">{pct}%</span>
                </span>
              );
            })}
          </div>
          <div role="row" className="my-0.75 flex items-end gap-0.75">
            <span className="w-30 shrink-0" />
            {days.map((d) => (
              <span key={d.day} role="columnheader" title={`${d.day} ${t("Ramadan")}${d.date ? `, ${formatDate(d.date, "d MMM")}` : ""}${d.oddNight ? ` · ${t("odd night")}` : ""}`} className={cn("flex w-6.75 shrink-0 flex-col items-center gap-px text-caption font-semibold tabular-nums", d.day === window.todayDay ? "rounded-sm bg-emerald text-white" : d.oddNight ? "text-warning" : "text-ink-muted")}>
                <Star className={cn("size-2.5", d.oddNight ? "fill-warning text-warning" : "invisible")} aria-hidden="true" />
                <span>{d.day}</span>
                <span className="text-[11px] opacity-80">{d.weekday !== null ? t(WEEKDAY_SHORT[d.weekday]).slice(0, 2) : ""}</span>
              </span>
            ))}
          </div>
          {sheet.items.map((item) => {
            const done = sheet.checks.filter((c) => c.item === item && c.day <= counted).length;
            return (
              <div key={item} role="row" className="group flex items-center gap-0.75">
                <span role="rowheader" className="flex w-30 shrink-0 items-baseline justify-between pr-3">
                  <span className="flex items-center gap-1 truncate text-body font-semibold text-ink">
                    {t(item)}
                    {item !== "Roza" && (
                      <button type="button" onClick={() => setRemoving(item)} aria-label={`${t("Remove")} ${t(item)}`} className="hidden size-5 items-center justify-center rounded-sm text-ink-muted hover:text-expense group-hover:flex">
                        <Trash2 className="size-3" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                  <span className="text-caption font-normal text-ink-muted tabular-nums">
                    {done}/{counted}
                  </span>
                </span>
                {days.map((d) => {
                  const state = ramadanCell(sheet, window, d.day, item);
                  return <SheetBox key={d.day} state={state} disabled={state === "locked"} onToggle={() => toggle(d.day, item, state !== "done")} label={`${t(item)}, ${d.day} ${t("Ramadan")}: ${t(state === "done" ? "done" : state === "missed" ? "not done" : state === "open" ? "not marked yet" : "not yet")}`} />;
                })}
              </div>
            );
          })}
          <div role="row" className="mt-1 flex items-center gap-0.75 border-t border-dashed border-line pt-2">
            <span role="rowheader" className="w-30 shrink-0 text-small font-semibold text-ink-2">
              {t("Done that day")}
            </span>
            {totals.map((total) => (
              <DayTotal key={total.day} count={total.count} of={sheet.items.length} open={total.open} title={`${total.count ?? 0} ${t("of")} ${sheet.items.length} ${t("done")}`} />
            ))}
          </div>
        </div>
      </Card>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title font-semibold text-ink">{t("Summary")}</h2>
            <span className="text-small font-bold text-emerald">
              {summary.pct}% {t("of everything")}
            </span>
          </div>
          {summary.items.map((row) => (
            <div key={row.item} className="grid grid-cols-[82px_minmax(0,1fr)_46px] items-center gap-3 text-small">
              <span className="truncate font-medium text-ink">{t(row.item)}</span>
              <span className="flex flex-col gap-0.75">
                <span className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <span className={cn("block h-full rounded-full", row.pct === 100 ? "bg-income" : "bg-emerald")} style={{ width: `${row.pct}%` }} />
                </span>
                <span className="text-caption font-normal text-ink-muted">{row.pct === 100 && row.of > 0 ? t("Every day") : row.of - row.done > 0 && row.item === "Roza" ? `${row.of - row.done} ${t(row.of - row.done === 1 ? "fast to make up" : "fasts to make up")}` : ""}</span>
              </span>
              <span className="text-right font-bold text-ink tabular-nums">
                {row.done}/{row.of}
              </span>
            </div>
          ))}
          {summary.items.length === 0 && <p className="text-small text-ink-muted">{t("Add a row to start.")}</p>}
        </Card>

        <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
          <h2 className="text-title font-semibold text-ink">{t("The three ashras")}</h2>
          {ASHRAS.map((a) => {
            const s = ashras.find((x) => x.n === a.n);
            return (
              <div key={a.n} className={cn("flex flex-col gap-1 rounded-md px-3 py-2.5", ASHRA_TONE[a.n])}>
                <span className="flex items-center justify-between text-small">
                  <span>
                    <b className="font-bold">{t(a.name)}</b> · {t(a.meaning)}
                  </span>
                  <span className="font-bold tabular-nums">{s?.pct ?? 0}%</span>
                </span>
                <span className="text-caption font-normal opacity-80">
                  {t("Days")} {a.n === 1 ? "1–10" : a.n === 2 ? "11–20" : `21–${sheet.totalDays}`} · {s?.done ?? 0} {t("of")} {s?.of ?? 0} {t("done")}
                </span>
              </div>
            );
          })}
        </Card>

        <Card padding="none" className="flex flex-col gap-3 bg-[linear-gradient(160deg,var(--warning-soft)_0%,var(--surface)_75%)] px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-title font-semibold text-ink">{t("The last ten nights")}</h2>
            <Chip tone="neutral" size="sm">
              {t("Odd nights")}
            </Chip>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {nights.map((n) => (
              <span key={n.day} title={`${n.day} ${t("Ramadan")}: ${t(!n.come ? "not yet" : n.full ? "everything done" : "something left")}`} className={cn("flex flex-col items-center gap-0.5 rounded-md border py-2", !n.come ? "border-line bg-surface text-ink-muted" : n.full ? "border-emerald bg-emerald text-white" : "border-warning/40 bg-warning-soft text-warning")}>
                <Star className={cn("size-3.5", n.come && n.full ? "fill-white" : n.come ? "fill-warning" : "")} aria-hidden="true" />
                <span className="text-body font-bold tabular-nums">{n.day}</span>
              </span>
            ))}
          </div>
          <span className="mt-auto text-small leading-relaxed text-ink-2">{t("Laylat al-Qadr is sought on these nights. A night is green when every row of that day is done.")}</span>
        </Card>
      </div>

      <AddRowDialog open={addOpen} onClose={() => setAddOpen(false)} trackerId={sheet.id} existing={sheet.items} suggestions={SUGGESTIONS} description={t("Something to keep up every day of Ramadan, like Taraweeh or a para of Quran.")} />
      <RamadanSetupDialog open={setupOpen} onClose={() => setSetupOpen(false)} existing={all} defaultYear={Number(next.startsOn.slice(0, 4))} />
      <ConfirmDialog open={removing !== null} onClose={() => !isPending && setRemoving(null)} onConfirm={removeRow} icon={<Trash2 />} title={`${t("Remove")} ${removing ? t(removing) : ""}?`} description={t("Its ticks on this sheet go with it.")} confirmLabel={t("Remove")} isPending={isPending} />
    </PageFrame>
  );
}
