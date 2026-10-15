"use client";

import { ArrowRight, Check, Info, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { createHabitTrackerAction, setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { monthName } from "@/lib/customer/insights";
import { cellState, hijriRange, MONTH_NAMES, monthSummary, prayerSummaries, PRAYERS, trackerFor, yearSummary } from "@/lib/customer/namazDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { withCheck } from "../trackerChecks";
import { EarlierMonthDialog } from "./EarlierMonthDialog";
import { PrayerIcon } from "./PrayerIcon";

interface NamazHomePageClientProps {
  trackers: HabitMonthTracker[];
  // "YYYY-MM-DD" today in the platform timezone.
  today: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Habits › Namaz: today's five prayers to tap, this month at a glance, what
// was missed so far, the year so far, and every month's sheet. The current
// month's sheet opens on its own.
export function NamazHomePageClient({ trackers, today }: NamazHomePageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [year, month] = today.split("-").map(Number);
  const todayDay = Number(today.slice(8));
  const currentKey = today.slice(0, 7);
  const server = trackerFor(trackers, year, month);
  const [current, applyCheck] = useOptimistic(server, (tracker, update: { day: number; item: string; checked: boolean }) => (tracker ? withCheck(tracker, update.day, update.item, update.checked) : tracker));
  const [, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const creating = useRef(false);

  // No sheet for this month yet: open one, once.
  useEffect(() => {
    if (server || creating.current) return;
    creating.current = true;
    createHabitTrackerAction({ category: "Namaz", month, year }).then((result) => {
      if (result.success) router.refresh();
      else toast.error(result.message ?? t("Could not open this month's sheet"));
    });
  }, [server, month, year, router, t]);

  function toggle(item: string, checked: boolean) {
    if (!current) return;
    startTransition(async () => {
      applyCheck({ day: todayDay, item, checked });
      const result = await setHabitTrackerCheckAction(current.id, { day: todayDay, item, checked });
      if (result.success) router.refresh();
      else toast.error(result.message ?? t("Failed to update"));
    });
  }

  const summary = current ? monthSummary(current) : null;
  const prayers = current ? prayerSummaries(current) : [];
  const yesterdayDone = current && todayDay > 1 ? current.checks.filter((c) => c.day === todayDay - 1).length : null;
  const yearNow = yearSummary(trackers, year);
  const months = [...trackers].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.month ?? 0) - (a.month ?? 0));
  const bestId = yearNow.best?.tracker.id;
  const yearMax = Math.max(...yearNow.months.map((m) => m.pct), 1);

  return (
    <PageFrame className="gap-5">
      <PageHeader eyebrow={t("Habits")} tone="habits" title={t("Namaz")} description={t("The five daily prayers, month by month. Each new month opens on its own.")} />

      <section aria-label={t("Today's prayers")} className="grid items-center gap-6 rounded-lg bg-[linear-gradient(135deg,var(--forest)_0%,var(--emerald)_100%)] p-6 text-white shadow-[0_8px_24px_rgba(31,122,90,0.25)] md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <span className="text-small font-semibold opacity-85">{t("Today")}</span>
          <span className="flex items-baseline gap-3">
            <span className="text-display text-white">{summary ? summary.todayDone : 0}</span>
            <span className="text-[22px] font-semibold">{t("of")} 5 {t("prayed")}</span>
          </span>
          <span className="flex h-7 items-center gap-2 self-start rounded-full bg-white/18 px-3 text-small font-semibold">
            {summary && summary.todayDone === 5 ? <Check className="size-4" aria-hidden="true" /> : <Info className="size-4" aria-hidden="true" />}
            {summary && summary.todayDone === 5 ? t("All five prayed today") : t("Tap a prayer to mark it")}
          </span>
          <span className="mt-2 text-small opacity-90">
            {monthName(currentKey, locale, "long", true)} · {hijriRange(year, month, locale)}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {PRAYERS.map((item) => {
            const state = current ? cellState(current, todayDay, item) : "open";
            const prayed = state === "prayed";
            return (
              <button key={item} type="button" disabled={!current} onClick={() => toggle(item, !prayed)} aria-pressed={prayed} aria-label={`${t(item)}, ${t(prayed ? "prayed" : "not marked yet")}`} className={cn("flex flex-col gap-2 rounded-md border p-3 text-left transition-colors", prayed ? "border-white bg-white text-forest" : "border-white/18 bg-white/12 text-white hover:bg-white/20")}>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-small font-semibold opacity-90">{t(item)}</span>
                  <PrayerIcon item={item} className="size-4 opacity-80" />
                </span>
                <span className={cn("flex size-6.5 items-center justify-center rounded-sm", prayed ? "bg-forest text-white" : "border-[1.5px] border-dashed border-white/60")}>{prayed && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}</span>
                <span className="text-caption font-semibold whitespace-nowrap opacity-90">{t(prayed ? "Prayed" : "Not yet")}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-title font-semibold text-ink">{t("This month")}</h2>
            <Chip tone="mint" size="sm">
              {t("Opened automatically")}
            </Chip>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[22px] leading-7 font-bold text-ink">{monthName(currentKey, locale, "long", true)}</span>
            <span className="text-small text-ink-muted">
              {t("Day")} {todayDay} {t("of")} {current?.totalDays ?? new Date(Date.UTC(year, month, 0)).getUTCDate()}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {PRAYERS.map((item) => {
              const prayed = current ? cellState(current, todayDay, item) === "prayed" : false;
              return (
                <span key={item} className="flex flex-col items-center gap-1 text-caption font-medium text-ink-2">
                  <span className={cn("flex size-8.5 items-center justify-center rounded-md", prayed ? "bg-emerald text-white" : "border-[1.5px] border-dashed border-line-strong bg-surface")}>{prayed && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}</span>
                  {t(item)}
                </span>
              );
            })}
          </div>
          <ul className="flex flex-col gap-2 text-small text-ink-2">
            {yesterdayDone !== null && (
              <li className="flex items-center gap-2">
                <Check className={cn("size-4 shrink-0", yesterdayDone === 5 ? "text-income" : "text-ink-muted")} aria-hidden="true" />
                {t("Yesterday")}, {yesterdayDone === 5 ? t("all five prayed") : `${yesterdayDone} ${t("of")} 5 ${t("prayed")}`}
              </li>
            )}
            <li className="flex items-center gap-2">
              <Info className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              {t("Each month opens on the 1st. Nothing to set up.")}
            </li>
          </ul>
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-surface-sunken pt-3">
            <span className="text-small text-ink-2">
              <b className="font-bold text-ink">
                {summary?.prayedSoFar ?? 0} {t("of")} {(current?.elapsedDays ?? 0) * 5 + 5}
              </b>{" "}
              {t("prayed so far")}
            </span>
            {current && (
              <Link href={`/habit-tracker/habits/namaz/${current.id}`} className="flex h-8.5 items-center gap-2 rounded-md bg-emerald px-4 text-small font-semibold text-white hover:bg-emerald-hover">
                {t("Open")} {monthName(currentKey, locale)}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </Card>

        <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-title font-semibold text-ink">{t("Missed so far")}</h2>
            <span className="text-caption font-normal text-ink-muted">
              {t("Since")} 1 {monthName(currentKey, locale, "short")}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-h1 tabular-nums", (summary?.missed ?? 0) > 0 ? "text-warning" : "text-income")}>{summary?.missed ?? 0}</span>
            <span className="text-body text-ink-2">{t((summary?.missed ?? 0) === 1 ? "prayer missed" : "prayers missed")}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {prayers.map((p) => (
              <span key={p.item} className={cn("flex flex-col items-center gap-0.5 rounded-md border py-2", p.missed > 0 ? "border-warning/30 bg-warning-soft text-warning" : "border-line bg-cream text-ink-muted")}>
                <span className="text-body-lg font-bold tabular-nums">{p.missed}</span>
                <span className="text-caption font-normal">{t(p.item)}</span>
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-small text-ink-2">
              <span>
                {summary?.prayed ?? 0} {t("of")} {summary?.due ?? 0} {t("prayed on past days")}
              </span>
              <span className="font-semibold text-ink">{summary?.pct ?? 0}%</span>
            </div>
            <span role="progressbar" aria-label={t("Prayed this month")} aria-valuenow={summary?.pct ?? 0} aria-valuemin={0} aria-valuemax={100} className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <span className="block h-full rounded-full bg-emerald" style={{ width: `${summary?.pct ?? 0}%` }} />
            </span>
          </div>
          <span className="mt-auto border-t border-surface-sunken pt-3 text-small text-ink-muted">{t("A past day with no mark counts as missed. Tap it on the sheet to fix it.")}</span>
        </Card>

        <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-title font-semibold text-ink">
              {year} {t("so far")}
            </h2>
            {yearNow.months[0] && (
              <span className="text-caption font-normal text-ink-muted">
                {t("Since")} {t(MONTH_NAMES[yearNow.months[0].month - 1])}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-h1 text-ink tabular-nums">{yearNow.pct}%</span>
            <span className="text-body text-ink-2">
              {yearNow.prayed} {t("of")} {yearNow.due} {t("prayed")}
            </span>
          </div>
          <div role="img" aria-label={t("Share of prayers prayed each month")} className="flex h-21 items-end gap-4 border-b border-line px-1">
            {yearNow.months.map((m) => (
              <span key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-caption font-bold text-ink-2 tabular-nums">{m.pct}%</span>
                <span className={cn("w-full max-w-11 rounded-t-[5px]", m.month === month ? "bg-mint-300" : "bg-emerald")} style={{ height: `${Math.max(4, (m.pct / yearMax) * 60)}px` }} />
              </span>
            ))}
          </div>
          <div className="-mt-1.5 flex gap-4 px-1">
            {yearNow.months.map((m) => (
              <span key={m.month} className="flex-1 text-center text-caption font-normal text-ink-muted">
                {t(MONTH_NAMES[m.month - 1]).slice(0, 3)}
              </span>
            ))}
          </div>
          <span className="mt-auto text-small text-ink-2">
            {yearNow.best ? (
              <>
                {t("Best month")}: <b className="font-semibold text-ink">{t(MONTH_NAMES[yearNow.best.month - 1])}</b>.{" "}
              </>
            ) : null}
            {t(MONTH_NAMES[month - 1])} {t("has")} {todayDay} {t(todayDay === 1 ? "day so far." : "days so far.")}
          </span>
        </Card>
      </div>

      <section aria-labelledby="namaz-months" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="namaz-months" className="text-title font-semibold text-ink">
            {t("Months")}
          </h2>
          <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-2 text-small font-semibold text-emerald hover:text-emerald-hover">
            <Plus className="size-4" aria-hidden="true" />
            {t("Add an earlier month")}
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {months.map((tracker) => {
            const s = monthSummary(tracker);
            const now = tracker.id === current?.id;
            const key = `${tracker.year}-${pad(tracker.month ?? 1)}`;
            const perfect = s.perfectDays;
            return (
              <Link key={tracker.id} href={`/habit-tracker/habits/namaz/${tracker.id}`} className={cn("flex flex-col gap-3 rounded-lg border bg-surface px-5 py-4 text-ink shadow-card transition-colors hover:border-line-strong", now ? "border-emerald" : "border-line")}>
                <span className="flex items-start justify-between gap-2">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-title font-semibold">{monthName(key, locale, "long", true)}</span>
                    <span className="text-caption font-normal text-ink-muted">{hijriRange(tracker.year as number, tracker.month as number, locale)}</span>
                  </span>
                  {now ? (
                    <Chip tone="forest" size="sm">
                      {t("This month")}
                    </Chip>
                  ) : tracker.id === bestId ? (
                    <Chip tone="income" size="sm">
                      {t("Best")}
                    </Chip>
                  ) : null}
                </span>
                <span className="flex items-baseline justify-between">
                  <span className="text-[22px] leading-7 font-bold tabular-nums">{s.pct}%</span>
                  <span className="text-small text-ink-2 tabular-nums">
                    {s.prayed} {t("of")} {s.due}
                    {now ? ` ${t("so far")}` : ""}
                  </span>
                </span>
                <span className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <span className={cn("block h-full rounded-full", now ? "bg-mint-300" : "bg-emerald")} style={{ width: `${s.pct}%` }} />
                </span>
                <span className="flex justify-between text-caption font-normal text-ink-muted">
                  <span>{now ? `${t("Day")} ${todayDay} ${t("of")} ${tracker.totalDays}` : `${perfect} ${t(perfect === 1 ? "perfect day" : "perfect days")}`}</span>
                  <span>
                    {s.missed} {t("missed")}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <EarlierMonthDialog open={addOpen} onClose={() => setAddOpen(false)} existing={trackers} currentMonth={currentKey} />
    </PageFrame>
  );
}
