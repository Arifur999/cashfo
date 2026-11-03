"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createElement, Fragment, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import IconTile from "@/components/smartly/IconTile";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { HabitMonthTracker, PrayerStatus, QazaSummary } from "@/lib/customer/api";
import { actionError } from "@/lib/customer/habitDisplay";
import { deleteHabitTrackerAction, setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { monthName } from "@/lib/customer/insights";
import { hijriRange, MONTH_NAMES, monthInsights, monthSummary, prayerSummaries } from "@/lib/customer/namazDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { RecordEyebrow } from "../Tracker/RecordEyebrow";
import { type BoxState, BoxSwatch } from "../Tracker/SheetBox";
import { StatCard } from "../Tracker/StatCard";
import { withCheck } from "../trackerChecks";
import { INSIGHT_ICON, insightText } from "./namazWords";
import { PrayerSheet } from "./PrayerSheet";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";

interface NamazSheetPageClientProps {
  tracker: HabitMonthTracker;
  // The sheets of the month before and after, if they exist.
  previous: HabitMonthTracker | null;
  next: HabitMonthTracker | null;
  // What is still owed, for the Missed figure; null when it couldn't be read.
  qaza?: QazaSummary | null;
}

const pad = (n: number) => String(n).padStart(2, "0");
// What each box means, in the order the menu offers them, drawn by the boxes'
// own looks. Today's open box is the dashed one in the brand.
const LEGEND: { state: BoxState; label: string }[] = [
  { state: "jamaat", label: "With jama'at" },
  { state: "onTime", label: "On time" },
  { state: "qaza", label: "Qaza" },
  { state: "missed", label: "Missed" },
  { state: "locked", label: "Not yet" },
];
// How a prayer's month splits, as its bar and its lines show it.
const SPLIT: { key: "jamaat" | "onTime" | "qaza" | "missed"; label: string; bar: string }[] = [
  { key: "jamaat", label: "With jama'at", bar: "bg-emerald" },
  { key: "onTime", label: "On time", bar: "bg-emerald-tint" },
  { key: "qaza", label: "Qaza", bar: "bg-warning-fill/70" },
  { key: "missed", label: "Missed", bar: "bg-expense-fill/40" },
];

// One month of the five prayers: the sheet with a box per prayer per day,
// the month's figures, each prayer on its own, and what stands out. An
// earlier month with nothing marked (added by mistake) can be deleted.
export function NamazSheetPageClient({ tracker, previous, next, qaza = null }: NamazSheetPageClientProps) {
  const { t, fmt } = useLocale();
  const { hijriAdjust } = usePrayerSettings().settings;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sheet, applyMark] = useOptimistic(tracker, (current, update: { day: number; item: string; status: PrayerStatus | null }) => withCheck(current, update.day, update.item, update.status !== null, update.status ?? undefined));
  const count = (n: number) => formatCount(n, fmt);
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
      else toast.error(actionError(result.message, "Failed to update", t, fmt));
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
        toast.error(actionError(result.message, "Failed to remove month tracker", t, fmt));
      }
    });
  }

  const prayedSub =
    previousSummary && previousSummary.due > 0
      ? t(summary.pct >= previousSummary.pct ? "{pct}% of the month, up from {previous}% in {month}" : "{pct}% of the month, down from {previous}% in {month}", { pct: count(summary.pct), previous: count(previousSummary.pct), month: monthWord(previous?.month ?? undefined) })
      : current
        ? t("Every prayer so far this month")
        : t("{pct}% of the month", { pct: count(summary.pct) });
  const jamaatShare = summary.prayedSoFar > 0 ? Math.round((summary.jamaat / summary.prayedSoFar) * 100) : 0;
  const missedSub = summary.missed === 0 ? t("Nothing new to make up") : qaza ? t("Added to qaza · {count} still to make up", { count: count(qaza.totalLeft) }) : t("Added to qaza");

  const monthLink = (target: HabitMonthTracker | null, label: string, icon: React.ReactNode, edge: boolean) =>
    target ? (
      <Link href={`/habit-tracker/habits/namaz/${target.id}`} aria-label={label} className={cn("flex size-9.5 items-center justify-center text-ink-soft hover:bg-surface-sunken pointer-coarse:size-11", edge && "border-r border-line")}>
        {icon}
      </Link>
    ) : (
      // No sheet that way: a dead button, out of the Tab order.
      <button type="button" disabled aria-label={label} className={cn("flex size-9.5 items-center justify-center text-input pointer-coarse:size-11", edge && "border-r border-line")}>
        {icon}
      </button>
    );

  return (
    <PageFrame className="gap-5">
      <TopbarExtras record={monthName(key, fmt, "long", true)} />
      <div className="flex flex-col gap-1">
        <RecordEyebrow href="/habit-tracker/habits?category=Namaz" back={t("All months")} />
        <PageHeader
          title={monthName(key, fmt, "long", true)}
          description={hijriRange(year, month, fmt, hijriAdjust, true)}
          actions={
            <>
              {current && (
                <Chip tone="mint" className="h-8 gap-1.5 px-3 text-small text-emerald">
                  <span className="size-1.75 rounded-full bg-emerald" aria-hidden="true" />
                  {t("This month, opened automatically")}
                </Chip>
              )}
              {deletable && (
                <Button variant="secondary" onClick={() => setConfirmDelete(true)} className="rounded-sm px-3.5 text-expense hover:text-expense">
                  <Trash2 />
                  {t("Delete this sheet")}
                </Button>
              )}
              <div role="group" aria-label={t("Month")} className="flex overflow-hidden rounded-sm border border-input bg-surface">
                {monthLink(previous, t(MONTH_NAMES[(month + 10) % 12]), <ChevronLeft className="size-4" aria-hidden="true" />, true)}
                {monthLink(next, t(MONTH_NAMES[month % 12]), <ChevronRight className="size-4" aria-hidden="true" />, false)}
              </div>
            </>
          }
        />
      </div>

      <Card padding="none" className="flex min-w-0 flex-col gap-3.5 rounded-md px-5 pt-4 pb-4.5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-title font-semibold text-ink">{t("Prayer sheet")}</h2>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[12.5px] text-ink-soft">
            {LEGEND.map((entry) => (
              <span key={entry.state} className="flex items-center gap-1.5">
                <BoxSwatch state={entry.state} />
                {t(entry.label)}
              </span>
            ))}
            <span className="text-ink-muted sm:border-l sm:border-line sm:pl-3.5">{t("Tap a box to change it")}</span>
          </div>
        </div>
        <PrayerSheet tracker={sheet} onMark={mark} totalsLabel={t("Prayed that day")} rowLabel={(item) => t(item)} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("Prayed")} value={t("{done} of {total}", { done: count(summary.prayed), total: count(summary.due) })} sub={prayedSub} />
        <StatCard label={t("With jama'at")} value={count(summary.jamaat)} sub={t("{pct}% of the prayers prayed", { pct: count(jamaatShare) })} />
        <StatCard label={t("Perfect days")} value={count(summary.perfectDays)} sub={t("All five on time or with jama'at")} />
        <StatCard label={t("Missed")} value={count(summary.missed)} sub={missedSub} tone={summary.missed === 0 ? "text-income" : "text-expense"} />
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card padding="none" className="flex min-w-0 flex-col gap-3 rounded-md px-5 py-4">
          <h2 className="text-title font-semibold text-ink">{t("Each prayer")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {prayers.map((p) => {
              const tag = summary.due > 0 && p.missed > 0 && p.item === worst?.item ? "most-missed" : summary.due > 0 && p.item === best?.item && p.prayed > 0 && best.item !== worst?.item ? "strongest" : null;
              return (
                <div key={p.item} className={cn("flex min-w-0 flex-col gap-2 rounded-[10px] border bg-surface p-3", tag === "most-missed" ? "border-expense/25" : "border-line")}>
                  <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1">
                    <span className="text-[13.5px] font-semibold text-ink">{t(p.item)}</span>
                    {tag && (
                      <Chip tone={tag === "most-missed" ? "expense" : "mint"} size="sm" className={cn("px-1.5 text-[10.5px]", tag === "strongest" && "text-emerald")}>
                        {t(tag === "most-missed" ? "Most missed" : "Strongest")}
                      </Chip>
                    )}
                  </div>
                  <span className="text-[12.5px] font-medium text-ink-muted tabular-nums">{fillNodes(t("{done} of {total}"), { done: <span className="text-[20px] leading-[normal] font-bold text-ink">{count(p.prayed)}</span>, total: count(p.due) })}</span>
                  <span className="flex h-2 overflow-hidden rounded-full bg-surface-sunken">
                    {SPLIT.map((part) => (
                      <span key={part.key} className={part.bar} style={{ width: `${p.due ? (p[part.key] / p.due) * 100 : 0}%` }} />
                    ))}
                  </span>
                  <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-y-0.75 text-caption font-normal text-ink-soft tabular-nums">
                    {SPLIT.map((part) => (
                      <Fragment key={part.key}>
                        <span>{t(part.label)}</span>
                        <span className="font-semibold text-ink">{count(p[part.key])}</span>
                      </Fragment>
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding="none" className="flex flex-col gap-3 rounded-md px-5 py-4">
          <h2 className="text-title font-semibold text-ink">{t("What stands out")}</h2>
          {insights.length === 0 && <p className="text-small text-ink-muted">{t("Mark a few days and the month starts to speak.")}</p>}
          <ul className="flex flex-col gap-3">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-2.5 text-small leading-[1.45] text-ink-2">
                <IconTile tone={insight.tone} size={32} className="size-6.5 rounded-[7px] [&_svg]:size-3.5">
                  {createElement(INSIGHT_ICON[insight.key])}
                </IconTile>
                <span className="pt-0.5">{insightText(insight, t, fmt)}</span>
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
        title={t("Delete {name}'s sheet?", { name: monthName(key, fmt, "long", true) })}
        description={t("Nothing is marked on it, so nothing is lost. You can add the month again later.")}
        confirmLabel={t("Delete sheet")}
      />
    </PageFrame>
  );
}
