"use client";

import { Calendar, Check, ChevronLeft, ChevronRight, Flame, Sunrise, TrendingDown, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { monthName } from "@/lib/customer/insights";
import { hijriRange, MONTH_NAMES, monthInsights, monthSummary, prayerSummaries, type Insight } from "@/lib/customer/namazDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { withCheck } from "../trackerChecks";
import { PrayerSheet } from "./PrayerSheet";

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

// One month of the five prayers: the sheet with a box per prayer per day,
// the month's figures, each prayer on its own, and what stands out.
export function NamazSheetPageClient({ tracker, previous, next }: NamazSheetPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [sheet, applyCheck] = useOptimistic(tracker, (current, update: { day: number; item: string; checked: boolean }) => withCheck(current, update.day, update.item, update.checked));
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

  function toggle(day: number, item: string, checked: boolean) {
    startTransition(async () => {
      applyCheck({ day, item, checked });
      const result = await setHabitTrackerCheckAction(sheet.id, { day, item, checked });
      if (result.success) router.refresh();
      else toast.error(result.message ?? t("Failed to update"));
    });
  }

  const insightText = (i: Insight) => {
    switch (i.key) {
      case "nothingMissed":
        return `${i.n} ${t(i.n === 1 ? "day in and nothing missed." : "days in and nothing missed.")}`;
      case "mostMissed":
        return `${t(i.item ?? "")} ${t("was missed most")}: ${i.n} ${t(i.n === 1 ? "time." : "times.")}`;
      case "strongest":
        return `${t(i.item ?? "")} ${t("was the strongest")}: ${i.n} ${t("of")} ${i.of}.`;
      case "weekday":
        return `${i.n} ${t("of the")} ${i.of} ${t("missed prayers were on")} ${t(`${i.weekday}s`)}.`;
      case "run":
        return `${i.n} ${t("days in a row now with all five prayed.")}`;
      case "upFrom":
        return `${t("Up from")} ${i.previousPct}% ${t("in")} ${previous ? t(MONTH_NAMES[(previous.month ?? 1) - 1]) : ""}.`;
      case "downFrom":
        return `${t("Down from")} ${i.previousPct}% ${t("in")} ${previous ? t(MONTH_NAMES[(previous.month ?? 1) - 1]) : ""}.`;
    }
  };

  const stats = [
    { label: t("Prayed"), value: `${summary.prayed} ${t("of")} ${summary.due}`, sub: previousSummary && previousSummary.due > 0 ? `${summary.pct}% ${t("of the month")} · ${t(summary.pct >= previousSummary.pct ? "up from" : "down from")} ${previousSummary.pct}% ${t("in")} ${t(MONTH_NAMES[(previous?.month ?? 1) - 1])}` : current ? t("Every prayer on the days past") : `${summary.pct}% ${t("of the month")}`, tone: "text-ink" },
    { label: t("Perfect days"), value: String(summary.perfectDays), sub: t("All five prayed"), tone: "text-ink" },
    { label: t("Full days in a row"), value: String(summary.perfectRun), sub: current ? t("Counting up to today") : t("At the end of the month"), tone: "text-ink" },
    { label: t("Missed"), value: String(summary.missed), sub: summary.missed === 0 ? t("Nothing to make up") : t("Tap a pink box to fix a wrong mark"), tone: summary.missed === 0 ? "text-income" : "text-expense" },
  ];

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={
          <span className="flex flex-col gap-1">
            <Link href="/habit-tracker/habits?category=Namaz" className="flex items-center gap-1 text-small font-semibold text-ink-2 normal-case tracking-normal hover:text-ink">
              <ChevronLeft className="size-4" aria-hidden="true" />
              {t("All months")}
            </Link>
            <span>{t("Habits")}</span>
          </span>
        }
        tone="habits"
        title={monthName(key, locale, "long", true)}
        description={hijriRange(year, month, locale)}
        actions={
          <>
            {current && (
              <Chip tone="mint" className="h-8 gap-2 text-small">
                <span className="size-1.75 rounded-full bg-emerald" aria-hidden="true" />
                {t("This month, opened automatically")}
              </Chip>
            )}
            <div role="group" aria-label={t("Month")} className="flex overflow-hidden rounded-md border border-line-strong bg-surface">
              <Link href={previous ? `/habit-tracker/habits/namaz/${previous.id}` : "#"} aria-disabled={!previous} aria-label={t(MONTH_NAMES[(month + 10) % 12])} className={cn("flex size-9.5 items-center justify-center border-r border-line text-ink-2 hover:bg-cream", !previous && "pointer-events-none opacity-40")}>
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Link>
              <Link href={next ? `/habit-tracker/habits/namaz/${next.id}` : "#"} aria-disabled={!next} aria-label={t(MONTH_NAMES[month % 12])} className={cn("flex size-9.5 items-center justify-center text-ink-2 hover:bg-cream", !next && "pointer-events-none opacity-40")}>
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </>
        }
      />

      <Card padding="none" className="flex flex-col gap-4 px-5 pt-4 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-title font-semibold text-ink">{t("Prayer sheet")}</h2>
          <div className="flex flex-wrap items-center gap-4 text-small text-ink-2">
            <span className="flex items-center gap-2">
              <span className="flex size-4.5 items-center justify-center rounded-[5px] bg-emerald text-white">
                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              </span>
              {t("Prayed")}
            </span>
            <span className="flex items-center gap-2">
              <span className="flex size-4.5 items-center justify-center rounded-[5px] bg-expense-soft text-expense">
                <X className="size-2.5" strokeWidth={3} aria-hidden="true" />
              </span>
              {t("Missed")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-4.5 rounded-[5px] border-[1.5px] border-dashed border-emerald bg-surface" />
              {t("Today, not marked yet")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-4.5 rounded-[5px] border border-surface-sunken bg-cream" />
              {t("Not yet")}
            </span>
            <span className="border-l border-line pl-4 text-ink-muted">{t("Tap a box to change it")}</span>
          </div>
        </div>
        <PrayerSheet tracker={sheet} onToggle={toggle} totalsLabel={t("Prayed that day")} rowLabel={(item) => t(item)} />
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="none" className="flex flex-col gap-1 px-5 py-4">
            <span className="text-small font-medium text-ink-muted">{stat.label}</span>
            <span className={cn("text-[22px] leading-7 font-bold tracking-tight tabular-nums", stat.tone)}>{stat.value}</span>
            <span className="text-caption font-normal text-ink-muted">{stat.sub}</span>
          </Card>
        ))}
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
          <h2 className="text-title font-semibold text-ink">{t("Each prayer")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {prayers.map((p) => {
              const tag = summary.due > 0 && p.missed > 0 && p.item === worst?.item ? "most-missed" : summary.due > 0 && p.item === best?.item && p.prayed > 0 && best.item !== worst?.item ? "strongest" : null;
              return (
                <div key={p.item} className={cn("flex flex-col gap-2 rounded-md border bg-surface p-3", tag === "most-missed" ? "border-expense/25" : "border-line")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body font-semibold text-ink">{t(p.item)}</span>
                    {tag && (
                      <Chip tone={tag === "most-missed" ? "expense" : "mint"} size="sm">
                        {t(tag === "most-missed" ? "Most missed" : "Strongest")}
                      </Chip>
                    )}
                  </div>
                  <span className="text-[22px] leading-7 font-bold text-ink tabular-nums">
                    {p.prayed}
                    <span className="text-small font-medium text-ink-muted"> {t("of")} {p.due}</span>
                  </span>
                  <span className="flex h-2 overflow-hidden rounded-full bg-surface-sunken">
                    <span className="bg-emerald" style={{ width: `${p.due ? (p.prayed / p.due) * 100 : 0}%` }} />
                    <span className="bg-expense-soft" style={{ width: `${p.due ? (p.missed / p.due) * 100 : 0}%` }} />
                  </span>
                  <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-y-0.75 text-caption font-normal text-ink-2 tabular-nums">
                    <span>{t("Prayed")}</span>
                    <span className="font-semibold text-ink">{p.prayed}</span>
                    <span>{t("Missed")}</span>
                    <span className="font-semibold text-ink">{p.missed}</span>
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
    </PageFrame>
  );
}
