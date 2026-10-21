"use client";

import { Calendar, Check, ChevronLeft, ChevronRight, Flame, Sunrise, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import IconTile from "@/components/smartly/IconTile";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { HabitMonthTracker, PrayerStatus } from "@/lib/customer/api";
import { actionError, WEEKDAY_PLURAL } from "@/lib/customer/habitDisplay";
import { deleteHabitTrackerAction, setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { monthName } from "@/lib/customer/insights";
import { hijriRange, MONTH_NAMES, monthInsights, monthSummary, prayerSummaries, type Insight } from "@/lib/customer/namazDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { RecordEyebrow } from "../Tracker/RecordEyebrow";
import { type BoxState, BoxSwatch } from "../Tracker/SheetBox";
import { StatCard } from "../Tracker/StatCard";
import { withCheck } from "../trackerChecks";
import { PrayerSheet } from "./PrayerSheet";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";

interface NamazSheetPageClientProps {
  tracker: HabitMonthTracker;
  // The sheets of the month before and after, if they exist.
  previous: HabitMonthTracker | null;
  next: HabitMonthTracker | null;
}

const pad = (n: number) => String(n).padStart(2, "0");
const INSIGHT_ICON: Record<Insight["key"], React.ReactNode> = {
  nothingMissed: <Check />,
  mostMissed: <Sunrise />,
  strongest: <Check />,
  weekday: <Calendar />,
  run: <Flame />,
  upFrom: <TrendingUp />,
  downFrom: <TrendingDown />,
};

// What each box means, in the order the menu offers them, drawn by the boxes'
// own looks.
const LEGEND: { state: BoxState; label: string }[] = [
  { state: "jamaat", label: "Jama'at" },
  { state: "onTime", label: "On time" },
  { state: "qaza", label: "Qaza" },
  { state: "missed", label: "Not prayed" },
  { state: "open", label: "Today, not marked yet" },
  { state: "locked", label: "Later" },
];

// One month of the five prayers: the sheet with a box per prayer per day,
// the month's figures, each prayer on its own, and what stands out. An
// earlier month with nothing marked (added by mistake) can be deleted.
export function NamazSheetPageClient({ tracker, previous, next }: NamazSheetPageClientProps) {
  const { t, locale } = useLocale();
  const { hijriAdjust } = usePrayerSettings().settings;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sheet, applyMark] = useOptimistic(tracker, (current, update: { day: number; item: string; status: PrayerStatus | null }) => withCheck(current, update.day, update.item, update.status !== null, update.status ?? undefined));
  const count = (n: number) => formatCount(n, locale);
  const year = sheet.year as number;
  const month = sheet.month as number;
  const key = `${year}-${pad(month)}`;
  const current = sheet.todayDay !== null;
  const summary = monthSummary(sheet);
  const prayers = prayerSummaries(sheet);
  const previousSummary = previous ? monthSummary(previous) : null;
  const insights = monthInsights(sheet, previous);
  const worst = [...prayers].sort((a, b) => b.missed - a.missed)[0];
  const best = [...prayers].sort((a, b) => b.prayed - a.prayed)[0];
  const deletable = !current && sheet.checks.length === 0;
  const monthWord = (n: number | undefined) => t(MONTH_NAMES[(n ?? 1) - 1]);

  function mark(day: number, item: string, status: PrayerStatus | null) {
    startTransition(async () => {
      applyMark({ day, item, status });
      const result = await setHabitTrackerCheckAction(sheet.id, status ? { day, item, checked: true, status } : { day, item, checked: false });
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to update", t, locale));
    });
  }

  function remove() {
    startDelete(async () => {
      const result = await deleteHabitTrackerAction(sheet.id);
      if (result.success) {
        toast.success(t("Sheet deleted"));
        setConfirmDelete(false);
        router.push("/habit-tracker/habits?category=Namaz");
      } else {
        toast.error(actionError(result.message, "Failed to remove month tracker", t, locale));
      }
    });
  }

  const insightText = (i: Insight): string => {
    switch (i.key) {
      case "nothingMissed":
        return t(i.n === 1 ? "{count} day in and nothing missed." : "{count} days in and nothing missed.", { count: count(i.n ?? 0) });
      case "mostMissed":
        return t(i.n === 1 ? "{prayer} was missed most: {count} time." : "{prayer} was missed most: {count} times.", { prayer: t(i.item ?? ""), count: count(i.n ?? 0) });
      case "strongest":
        return t("{prayer} was the strongest: {done} of {total}.", { prayer: t(i.item ?? ""), done: count(i.n ?? 0), total: count(i.of ?? 0) });
      case "weekday":
        return t("{count} of the {total} missed prayers were on {weekday}.", { count: count(i.n ?? 0), total: count(i.of ?? 0), weekday: t(WEEKDAY_PLURAL[i.weekdayIndex ?? 0]) });
      case "run":
        return t("{count} days in a row now with all five prayed.", { count: count(i.n ?? 0) });
      case "upFrom":
        return t("Up from {pct}% in {month}.", { pct: count(i.previousPct ?? 0), month: monthWord(i.previousMonth) });
      case "downFrom":
        return t("Down from {pct}% in {month}.", { pct: count(i.previousPct ?? 0), month: monthWord(i.previousMonth) });
    }
  };

  const prayedSub =
    previousSummary && previousSummary.due > 0
      ? t(summary.pct >= previousSummary.pct ? "{pct}% of the month, up from {previous}% in {month}" : "{pct}% of the month, down from {previous}% in {month}", { pct: count(summary.pct), previous: count(previousSummary.pct), month: monthWord(previous?.month ?? undefined) })
      : current
        ? t("Every prayer on the days past")
        : t("{pct}% of the month", { pct: count(summary.pct) });

  const monthLink = (target: HabitMonthTracker | null, label: string, icon: React.ReactNode, edge: boolean) =>
    target ? (
      <Link href={`/habit-tracker/habits/namaz/${target.id}`} aria-label={label} className={cn("flex size-9.5 items-center justify-center text-ink-2 hover:bg-surface-sunken pointer-coarse:size-11", edge && "border-r border-line")}>
        {icon}
      </Link>
    ) : (
      // No sheet that way: a dead button, out of the Tab order.
      <button type="button" disabled aria-label={label} className={cn("flex size-9.5 items-center justify-center text-ink-faint pointer-coarse:size-11", edge && "border-r border-line")}>
        {icon}
      </button>
    );

  return (
    <PageFrame className="gap-5">
      <TopbarExtras record={monthName(key, locale, "long", true)} />
      <PageHeader
        eyebrow={<RecordEyebrow href="/habit-tracker/habits?category=Namaz" back={t("All months")} pillar={t("Habits")} />}
        tone="habits"
        title={monthName(key, locale, "long", true)}
        description={hijriRange(year, month, locale, hijriAdjust)}
        actions={
          <>
            {current && (
              <Chip tone="mint" className="h-8 gap-2 text-small">
                <span className="size-1.75 rounded-full bg-emerald" aria-hidden="true" />
                {t("This month, opened automatically")}
              </Chip>
            )}
            {deletable && (
              <Button variant="secondary" onClick={() => setConfirmDelete(true)} className="text-expense hover:text-expense">
                <Trash2 />
                {t("Delete this sheet")}
              </Button>
            )}
            <div role="group" aria-label={t("Month")} className="flex overflow-hidden rounded-md border border-line-strong bg-surface">
              {monthLink(previous, t(MONTH_NAMES[(month + 10) % 12]), <ChevronLeft className="size-4" aria-hidden="true" />, true)}
              {monthLink(next, t(MONTH_NAMES[month % 12]), <ChevronRight className="size-4" aria-hidden="true" />, false)}
            </div>
          </>
        }
      />

      <Card padding="none" className="flex min-w-0 flex-col gap-4 px-5 pt-4 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-title font-semibold text-ink">{t("Prayer sheet")}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-ink-2">
            {LEGEND.map((entry) => (
              <span key={entry.state} className="flex items-center gap-2">
                <BoxSwatch state={entry.state} />
                {t(entry.label)}
              </span>
            ))}
            <span className="text-ink-muted sm:border-l sm:border-line sm:pl-4">{t("Tap a box to change it")}</span>
          </div>
        </div>
        <PrayerSheet tracker={sheet} onMark={mark} totalsLabel={t("Prayed that day")} rowLabel={(item) => t(item)} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("Prayed")} value={t("{done} of {total}", { done: count(summary.prayed), total: count(summary.due) })} sub={prayedSub} />
        <StatCard label={t("Perfect days")} value={count(summary.perfectDays)} sub={t("All five on time")} />
        <StatCard label={t("Full days in a row")} value={count(summary.perfectRun)} sub={current ? t("All five prayed, counting up to today") : t("All five prayed, at the end of the month")} />
        <StatCard label={t("Missed")} value={count(summary.missed)} sub={summary.missed === 0 ? t("Nothing to make up") : t("Tap a missed box to fix a wrong mark")} tone={summary.missed === 0 ? "text-income" : "text-expense"} />
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card padding="none" className="flex min-w-0 flex-col gap-3 px-5 py-4">
          <h2 className="text-title font-semibold text-ink">{t("Each prayer")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {prayers.map((p) => {
              const tag = summary.due > 0 && p.missed > 0 && p.item === worst?.item ? "most-missed" : summary.due > 0 && p.item === best?.item && p.prayed > 0 && best.item !== worst?.item ? "strongest" : null;
              return (
                <div key={p.item} className={cn("flex min-w-0 flex-col gap-2 rounded-md border bg-surface p-3", tag === "most-missed" ? "border-expense/25" : "border-line")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-body font-semibold text-ink">{t(p.item)}</span>
                    {tag && (
                      <Chip tone={tag === "most-missed" ? "expense" : "mint"} size="sm">
                        {t(tag === "most-missed" ? "Most missed" : "Strongest")}
                      </Chip>
                    )}
                  </div>
                  <span className="text-small font-medium text-ink-muted tabular-nums">{fillNodes(t("{done} of {total}"), { done: <span className="text-h2 text-ink">{count(p.prayed)}</span>, total: count(p.due) })}</span>
                  <span className="flex h-2 overflow-hidden rounded-full bg-surface-sunken">
                    <span className="bg-emerald" style={{ width: `${p.due ? (p.prayed / p.due) * 100 : 0}%` }} />
                    <span className="bg-expense-soft" style={{ width: `${p.due ? (p.missed / p.due) * 100 : 0}%` }} />
                  </span>
                  <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-y-0.75 text-caption font-normal text-ink-2 tabular-nums">
                    <span>{t("Prayed")}</span>
                    <span className="font-semibold text-ink">{count(p.prayed)}</span>
                    <span>{t("Missed")}</span>
                    <span className="font-semibold text-ink">{count(p.missed)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
          <h2 className="text-title font-semibold text-ink">{t("What stands out")}</h2>
          {insights.length === 0 && <p className="text-small text-ink-muted">{t("Mark a few days and the month starts to speak.")}</p>}
          <ul className="flex flex-col gap-3">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-3 text-small leading-snug text-ink-2">
                <IconTile tone={insight.tone} size={32} className="rounded-sm [&_svg]:size-3.5">
                  {INSIGHT_ICON[insight.key]}
                </IconTile>
                <span className="pt-1">{insightText(insight)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => !isDeleting && setConfirmDelete(false)}
        onConfirm={remove}
        isPending={isDeleting}
        title={t("Delete {name}'s sheet?", { name: monthName(key, locale, "long", true) })}
        description={t("Nothing is marked on it, so nothing is lost. You can add the month again later.")}
        confirmLabel={t("Delete sheet")}
      />
    </PageFrame>
  );
}
