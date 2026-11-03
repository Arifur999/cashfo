"use client";

import { ArrowRight, Check, ChevronLeft, ChevronRight, LayoutDashboard, Moon, MoonStar, Plus, Sunset } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { HabitMonthTracker, RamadanPrep, RamadanPrepKey, Reminder } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { actionError, hijriDate, nextRamadan, shiftDay } from "@/lib/customer/habitDisplay";
import { saveRamadanPrepAction, setFastsMadeUpAction, setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { clockOf, prayerTimesFor } from "@/lib/customer/prayerTimes";
import { ASHRAS, countdown, dashboardSheet, fastsToMakeUp, goingRamadan, lastRamadan, quranItem, quranKhatam, ramadanSummary, type RamadanWindow, type SetupRange, setupYears } from "@/lib/customer/ramadanDisplay";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { useReminderBook } from "../Reminders";
import { withCheck } from "../trackerChecks";
import { RamadanRemindersCard } from "./RamadanReminders";
import { RamadanSetupDialog } from "./RamadanSetupDialog";

interface RamadanHomePageClientProps {
  trackers: HabitMonthTracker[];
  today: string;
  // Saved reminders (Sehri's and Iftar's are set here); null when they
  // couldn't be read.
  reminders: Reminder[] | null;
  // The "Get ready" steps ticked for the next Ramadan; null when they
  // couldn't be read.
  prep: RamadanPrep | null;
}

// The line under each row on the day card.
const ROW_HINT: Record<string, string> = {
  Roza: "Fast from Sehri to Iftar",
  Taraweeh: "After Isha",
  Zikr: "Morning and evening",
  Sadaqah: "Any amount",
  Tahajjud: "Before Sehri",
  Dua: "Before Iftar",
  Hadis: "One a day",
};
// The rows a Ramadan can keep, shown on the preview day before it has a sheet.
const PREVIEW_ROWS = ["Roza", "Taraweeh", "Quran", "Zikr", "Sadaqah", "Tahajjud"];
const PREP_STEPS: { key: RamadanPrepKey; text: string }[] = [
  { key: "intention", text: "Make an intention for {name}" },
  { key: "makeUp", text: "Keep the missed fast from last Ramadan" },
  { key: "quran", text: "Plan one para of Quran a day" },
  { key: "sadaqah", text: "Set aside Sadaqah for the month" },
  { key: "tahajjud", text: "Practise waking for Tahajjud once a week" },
];
const HERO_CHIP = "flex w-22 shrink-0 flex-col items-center gap-px rounded-md border border-white/18 bg-white/12 py-2.5";

// Ramadan › Today (the RamadanToday board): the countdown to the next
// Ramadan (or the day of it today), one day of Ramadan to tick (a preview
// before it begins), the fasts still to make up, getting ready, and the
// last Ramadan's sheet; Sehri and Iftar reminders below.
export function RamadanHomePageClient({ trackers, today, reminders: savedReminders, prep }: RamadanHomePageClientProps) {
  const { t, fmt } = useLocale();
  const { settings } = usePrayerSettings();
  const { hijriAdjust } = settings;
  const router = useRouter();
  const reminders = useReminderBook(savedReminders);
  const [, startTransition] = useTransition();
  const [savingFast, startFast] = useTransition();
  const [setupOpen, setSetupOpen] = useState(false);
  // Which Ramadan the dialog sets up: the next one, or another one (earlier
  // or later). Kept after it closes, so its years don't change while it
  // fades out.
  const [range, setRange] = useState<SetupRange>("next");
  const count = (n: number) => formatCount(n, fmt);
  const digits = (value: number | string | null) => toLocaleDigits(String(value ?? ""), fmt);
  const ramadanName = (year: number | string | null) => t("Ramadan {year}", { year: digits(year) });

  const next = nextRamadan(today, hijriAdjust);
  const nextYear = Number(next.startsOn.slice(0, 4));
  const nextName = ramadanName(next.year);
  const hasNext = trackers.some((tr) => tr.year === nextYear);
  const otherYears = setupYears(trackers, nextYear, "another");
  const going = goingRamadan(trackers, today, hijriAdjust);
  const last = lastRamadan(trackers, today, hijriAdjust);
  const dashboard = dashboardSheet(trackers, today, hijriAdjust);
  const upcoming = going ? null : (trackers.find((tr) => tr.year === nextYear) ?? null);

  // The day card: today's day during Ramadan, else day 1 of the next one
  // (a preview). Ticks show at once and are saved behind.
  const [sheet, applyCheck] = useOptimistic(going?.tracker ?? null, (current, u: { day: number; item: string; checked: boolean }) => (current ? withCheck(current, u.day, u.item, u.checked) : current));
  const todayDay = going?.window.todayDay ?? null;
  // The day of Ramadan today, sheet or not (null before it begins).
  const ramadanDay = todayDay ?? (next.daysToGo === 0 ? Math.round((Date.parse(today) - Date.parse(next.startsOn)) / 86400000) + 1 : null);
  const totalDays = sheet?.totalDays ?? upcoming?.totalDays ?? 30;
  const [picked, setPicked] = useState(ramadanDay ?? 1);
  const day = Math.min(Math.max(1, picked), totalDays);
  const start = going?.window.start ?? next.startsOn;
  const date = shiftDay(start, day - 1);
  const editable = sheet !== null && todayDay !== null && day <= todayDay;
  const rows = sheet?.items ?? upcoming?.items ?? PREVIEW_ROWS;
  const ticked = (item: string) => !!sheet?.checks.some((c) => c.day === day && c.item === item);
  const doneCount = rows.filter(ticked).length;
  const ashra = ASHRAS[day <= 10 ? 0 : day <= 20 ? 1 : 2];
  const oddNight = day >= 21 && day % 2 === 1;
  const times = prayerTimesFor(settings, date);
  const dayTitle = [t("Day {day}", { day: count(day) }), formatDay(date, "EEEE, d MMM", fmt), t(ashra.name), oddNight ? t("odd night") : null].filter(Boolean).join(" · ");
  const dayChip = sheet === null ? t("Preview") : todayDay !== null && day > todayDay ? t("Later") : null;
  const dayNote =
    sheet === null
      ? upcoming
        ? t("This is how each day of Ramadan will look. The boxes open on day 1.")
        : t("This is how each day of Ramadan can look. Set up {name} to tick it day by day.", { name: nextName })
      : day > (todayDay ?? 0)
        ? t("This day opens on {date}.", { date: formatDay(date, "d MMMM", fmt) })
        : day < (todayDay ?? 0)
          ? t("An earlier day: tick what you kept.")
          : t("Tap a box to tick it.");

  function setCheck(item: string, checked: boolean) {
    if (!sheet || !editable) return;
    startTransition(async () => {
      applyCheck({ day, item, checked });
      const result = await setHabitTrackerCheckAction(sheet.id, { day, item, checked });
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to update", t, fmt));
    });
  }

  // Every row of the day ticked: shown at once, saved one after another.
  function markAll() {
    if (!sheet || !editable) return;
    const changes = rows.filter((item) => !ticked(item));
    if (changes.length === 0) return;
    const on = day;
    startTransition(async () => {
      for (const item of changes) applyCheck({ day: on, item, checked: true });
      for (const item of changes) {
        const result = await setHabitTrackerCheckAction(sheet.id, { day: on, item, checked: true });
        if (!result.success) {
          toast.error(actionError(result.message, "Failed to update", t, fmt));
          break;
        }
      }
      router.refresh();
    });
  }

  // The fasts the last Ramadan still owes ("I kept one" makes one up).
  const [madeUp, setMadeUp] = useOptimistic(last?.tracker.fastsMadeUp ?? 0);
  const owed = last ? fastsToMakeUp({ ...last.tracker, fastsMadeUp: madeUp }, last.window) : { missedDays: [], left: 0 };
  const missed = owed.missedDays.length;
  const lastName = last ? ramadanName(last.window.hijriYear ?? last.tracker.year) : "";

  function saveMadeUp(to: number, undo: boolean) {
    if (!last) return;
    startFast(async () => {
      setMadeUp(to);
      const result = await setFastsMadeUpAction(last.tracker.id, to);
      if (!result.success) {
        toast.error(actionError(result.message, "Failed to save the fast", t, fmt));
        return;
      }
      router.refresh();
      if (!undo) return;
      const left = Math.max(0, missed - to);
      toast.success(left === 0 ? t("Qaza fast recorded. Nothing left to make up.") : t("Qaza fast recorded. {count} left to make up.", { count: count(left) }), {
        action: { label: t("Undo"), onClick: () => saveMadeUp(to - 1, false) },
      });
    });
  }

  const missedText =
    missed === 1
      ? t("day {day}", { day: count(owed.missedDays[0]) })
      : missed <= 4
        ? t("days {days}", { days: owed.missedDays.map(count).join(", ") })
        : t("{count} days missed", { count: count(missed) });
  const fastsLine = !last
    ? t("Missed fasts of your last Ramadan show here.")
    : missed === 0
      ? t("{name}: every fast kept.", { name: lastName })
      : owed.left === 0
        ? t("Every missed fast of {name} is made up.", { name: lastName })
        : going
          ? t("From {name} ({days}).", { name: lastName, days: missedText })
          : t("From {name} ({days}). Best kept before {next}.", { name: lastName, days: missedText, next: nextName });

  // Getting ready for the next Ramadan. Keeping the missed fast ticks
  // itself once nothing is left to make up.
  const [prepItems, setPrepItems] = useOptimistic(prep && prep.year === nextYear ? prep.items : []);
  const prepOn = (key: RamadanPrepKey) => (key === "makeUp" && owed.left === 0) || prepItems.includes(key);
  const prepDone = PREP_STEPS.filter((step) => prepOn(step.key)).length;

  function togglePrep(key: RamadanPrepKey) {
    const items = prepItems.includes(key) ? prepItems.filter((k) => k !== key) : [...prepItems, key];
    startTransition(async () => {
      setPrepItems(items);
      const result = await saveRamadanPrepAction(nextYear, items);
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to save the list", t, fmt));
    });
  }

  // A sheet in one line: how much is done, the fasts, the Quran.
  function sheetLine(tracker: HabitMonthTracker, window: RamadanWindow) {
    const summary = ramadanSummary(tracker, window);
    const roza = summary.items.find((row) => row.item === "Roza");
    const khatam = quranItem(tracker.items) ? quranKhatam(tracker) : null;
    return [
      t(window.status === "going" ? "{pct}% done so far" : "{pct}% done", { pct: count(summary.pct) }),
      roza ? t(roza.done === 1 ? "{count} fast" : "{count} fasts", { count: count(roza.done) }) : null,
      khatam ? (khatam.finishedOn ? t("Quran khatam") : t("{count} of 30 paras", { count: count(Math.min(30, khatam.read)) })) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const sheetCard = going ?? last;

  // The hero: the day of Ramadan today, or the countdown to the next one.
  const nextStart = prayerTimesFor(settings, next.startsOn);
  const todayTimes = prayerTimesFor(settings, today);
  const goingSummary = going && sheet ? ramadanSummary(sheet, going.window) : null;
  const goingFasts = goingSummary?.items.find((row) => row.item === "Roza");
  const left = countdown(next.daysToGo);
  const chips =
    next.daysToGo > 0
      ? [
          { value: left.days, label: left.days === 1 ? "day" : "days" },
          { value: left.weeks, label: left.weeks === 1 ? "week" : "weeks" },
          { value: left.months, label: left.months === 1 ? "month" : "months" },
        ].filter((chip, i) => i === 0 || chip.value > 0)
      : [
          { value: Math.max(0, totalDays - (ramadanDay ?? 1)), label: totalDays - (ramadanDay ?? 1) === 1 ? "day left" : "days left" },
          ...(goingFasts ? [{ value: goingFasts.done, label: goingFasts.done === 1 ? "fast kept" : "fasts kept" }] : []),
        ];

  function openSetup(which: SetupRange) {
    setRange(which);
    setSetupOpen(true);
  }

  return (
    <PageFrame className="gap-3.5 md:pt-6">
      <PageHeader
        title={t("Ramadan")}
        description={`${formatDay(today, "EEEE, d MMMM yyyy", fmt)} · ${hijriDate(today, fmt, hijriAdjust)}`}
        actions={
          <>
            {dashboard && (
              <Button variant="secondary" asChild className="rounded-sm px-3.5">
                <Link href={`/habit-tracker/habits/ramadan/${dashboard.id}`}>
                  <LayoutDashboard className="text-ink-soft" />
                  {t("Dashboard")}
                </Link>
              </Button>
            )}
            {/* Once the next Ramadan has its sheet, another can still be
                added: an earlier one (to log its fasts, or the ones to make
                up), or one after the next. */}
            {!hasNext ? (
              <Button onClick={() => openSetup("next")} className="rounded-sm">
                <Plus strokeWidth={2.25} />
                {t("Set up {name}", { name: nextName })}
              </Button>
            ) : (
              otherYears.length > 0 && (
                <Button variant="secondary" onClick={() => openSetup("another")} className="rounded-sm px-3.5">
                  <Plus className="text-ink-soft" />
                  {t("Add another Ramadan")}
                </Button>
              )
            )}
          </>
        }
      />

      <section aria-labelledby="ramadan-hero" className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-[14px] bg-linear-to-br from-emerald to-forest px-6 py-4.5 text-white shadow-[0_8px_24px_rgba(15,118,110,0.25)] dark:text-on-action">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-[14px] bg-white/14">
          <MoonStar className="size-6.5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 basis-72 flex-col gap-0.75">
          <span className="text-caption font-semibold tracking-[0.06em] uppercase opacity-85">{next.daysToGo > 0 ? nextName : [nextName, t(ASHRAS[(ramadanDay ?? 1) <= 10 ? 0 : (ramadanDay ?? 1) <= 20 ? 1 : 2].name)].join(" · ")}</span>
          <span id="ramadan-hero" className="text-[22px] leading-tight font-bold">
            {next.daysToGo > 0 ? t("Begins around {date}", { date: formatDay(next.startsOn, "EEEE, d MMMM yyyy", fmt) }) : t("Day {day} of {total}", { day: count(ramadanDay ?? 1), total: count(totalDays) })}
          </span>
          <span className="text-[12.5px] opacity-85">
            {next.daysToGo > 0
              ? t("It can move by a day with the moon. {city}, day 1: Sehri {sehri} · Iftar {iftar}", { city: t(settings.city), sehri: timeLabel(clockOf(nextStart.Fajr), t, fmt), iftar: timeLabel(clockOf(nextStart.Maghrib), t, fmt) })
              : t("{city}, today: Sehri ends {sehri} · Iftar {iftar}", { city: t(settings.city), sehri: timeLabel(clockOf(todayTimes.Fajr), t, fmt), iftar: timeLabel(clockOf(todayTimes.Maghrib), t, fmt) })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {chips.map((chip) => (
            <div key={chip.label} className={HERO_CHIP}>
              <span className="text-[26px] leading-tight font-bold tabular-nums">{count(chip.value)}</span>
              <span className="text-caption opacity-85">{t(chip.label)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card padding="none" className="flex min-w-0 flex-col gap-3 rounded-[14px] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 basis-80 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[17px] font-semibold text-ink">{dayTitle}</h2>
                {dayChip && (
                  <Chip tone="warning" size="sm" className="font-bold text-warning-ink">
                    {dayChip}
                  </Chip>
                )}
              </div>
              <span className="text-[13px] text-ink-muted">{dayNote}</span>
            </div>
            <div role="group" aria-label={t("Day")} className="flex h-9 shrink-0 items-center overflow-hidden rounded-sm border border-input pointer-coarse:h-11">
              <button type="button" aria-label={t("Previous day")} disabled={day <= 1} onClick={() => setPicked(day - 1)} className="flex h-full w-8.5 items-center justify-center text-ink-soft hover:bg-surface-sunken disabled:text-ink-faint disabled:hover:bg-transparent pointer-coarse:w-11">
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <span aria-live="polite" className="px-2.5 text-[13px] font-semibold whitespace-nowrap text-ink tabular-nums">
                {t("Day {day} of {total}", { day: count(day), total: count(totalDays) })}
              </span>
              <button type="button" aria-label={t("Next day")} disabled={day >= totalDays} onClick={() => setPicked(day + 1)} className="flex h-full w-8.5 items-center justify-center text-ink-soft hover:bg-surface-sunken disabled:text-ink-faint disabled:hover:bg-transparent pointer-coarse:w-11">
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex min-w-0 items-center gap-3 rounded-md border border-warning-line bg-warning-50 px-3.5 py-3">
              <Moon className="size-5.5 shrink-0 text-warning max-sm:hidden" aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                <span className="text-[12.5px] font-semibold text-warning-ink">{t("Sehri ends")}</span>
                <span className="text-[22px] leading-tight font-bold text-ink tabular-nums">{timeLabel(clockOf(times.Fajr), t, fmt)}</span>
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-3 rounded-md border border-emerald-line bg-mint-50 px-3.5 py-3">
              <Sunset className="size-5.5 shrink-0 text-emerald max-sm:hidden" aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                <span className="text-[12.5px] font-semibold text-emerald">{t("Iftar")}</span>
                <span className="text-[22px] leading-tight font-bold text-ink tabular-nums">{timeLabel(clockOf(times.Maghrib), t, fmt)}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {rows.map((item) => {
              const done = ticked(item);
              const hint = quranItem([item]) ? t("Para {count} of 30", { count: count(Math.min(30, day)) }) : item === "Tahajjud" && oddNight ? t("Odd night: seek Laylat al-Qadr") : ROW_HINT[item] ? t(ROW_HINT[item]) : null;
              return (
                <button
                  key={item}
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  disabled={!editable}
                  onClick={() => setCheck(item, !done)}
                  className={cn("flex min-h-28 min-w-0 flex-col items-start justify-between gap-3 rounded-[14px] border-[1.5px] px-4.5 py-4 text-left transition-colors", done ? "border-emerald bg-mint-50" : "border-line bg-surface", editable ? !done && "hover:border-emerald" : "cursor-default")}
                >
                  <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-[9px]", done ? "bg-emerald text-on-action" : "border-[1.5px] border-line-strong bg-surface")}>{done && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}</span>
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate text-[17px] font-bold text-ink">{t(item)}</span>
                    {hint && <span className="text-[12.5px] text-ink-muted">{hint}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold whitespace-nowrap text-ink tabular-nums">{t("{done} of {total} done", { done: count(doneCount), total: count(rows.length) })}</span>
            <span className="block h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
              <span className="block h-full rounded-full bg-emerald transition-[width]" style={{ width: `${rows.length ? Math.round((doneCount / rows.length) * 100) : 0}%` }} />
            </span>
            {editable && (
              <Button variant="secondary" size="sm" onClick={markAll} disabled={doneCount === rows.length} className="h-8.5 rounded-sm px-3 pointer-coarse:h-11">
                {t("Mark all done")}
              </Button>
            )}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-3.5">
          <Card padding="none" className="flex flex-col gap-2 rounded-[14px] px-4.5 py-3.5">
            <h2 className="text-[15px] font-semibold text-ink">{t("Fasts to make up")}</h2>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <span className="flex items-baseline gap-2">
                <span className={cn("text-[28px] leading-tight font-bold tabular-nums", owed.left > 0 ? "text-warning-ink" : "text-income")}>{count(owed.left)}</span>
                <span className="text-[13.5px] text-ink-2">{owed.left === 1 ? t("fast left to make up") : owed.left > 1 ? t("fasts left to make up") : missed > 0 ? t("All made up. Well done.") : t("Nothing to make up.")}</span>
              </span>
              {owed.left > 0 && (
                <Button variant="secondary" size="sm" onClick={() => saveMadeUp(madeUp + 1, true)} disabled={savingFast} className="h-8.5 rounded-sm border-warning bg-warning-50 px-3 text-warning-ink hover:bg-warning-soft pointer-coarse:h-11">
                  {t("I kept one")}
                </Button>
              )}
            </div>
            <span className="text-caption text-ink-muted">{fastsLine}</span>
          </Card>

          {!going && (
            <Card padding="none" className="flex flex-col gap-1 rounded-[14px] px-4.5 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-ink">{t("Get ready")}</h2>
                {prep && <span className="text-[12.5px] font-bold text-emerald tabular-nums">{t("{done} of {total}", { done: count(prepDone), total: count(PREP_STEPS.length) })}</span>}
              </div>
              {prep ? (
                PREP_STEPS.map((step) => {
                  const on = prepOn(step.key);
                  const auto = step.key === "makeUp" && owed.left === 0;
                  const text = step.key === "makeUp" && owed.left > 1 ? t("Keep the missed fasts from last Ramadan") : t(step.text, { name: nextName });
                  return (
                    <button key={step.key} type="button" role="checkbox" aria-checked={on} disabled={auto} title={auto ? t("Nothing left to make up") : undefined} onClick={() => togglePrep(step.key)} className="flex min-h-9 items-center gap-2.5 rounded-sm py-1.5 text-left disabled:cursor-default pointer-coarse:min-h-11">
                      <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-[6px]", on ? "bg-emerald text-on-action" : "border-[1.5px] border-line-strong bg-surface")}>{on && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}</span>
                      <span className={cn("text-[13.5px]", on ? "text-ink-muted line-through" : "text-ink")}>{text}</span>
                    </button>
                  );
                })
              ) : (
                <p className="py-1.5 text-small text-ink-muted">{t("Your list couldn't be loaded. Try again in a moment.")}</p>
              )}
            </Card>
          )}

          {sheetCard && (
            <Link href={`/habit-tracker/habits/ramadan/${sheetCard.tracker.id}`} className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-surface px-4.5 py-3 text-ink shadow-card transition-colors hover:border-line-strong">
              <span className="flex min-w-0 flex-col">
                <span className="text-[12.5px] text-ink-muted">{t(going ? "This Ramadan · {year}" : "Last Ramadan · {year}", { year: digits(sheetCard.window.hijriYear ?? sheetCard.tracker.year) })}</span>
                <span className="text-[15px] font-semibold">{sheetLine(going && sheet ? sheet : sheetCard.tracker, sheetCard.window)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-emerald">
                {t("See report")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </span>
            </Link>
          )}
        </div>
      </div>

      {reminders.available && <RamadanRemindersCard book={reminders} />}

      <RamadanSetupDialog open={setupOpen} onClose={() => setSetupOpen(false)} existing={trackers} defaultYear={nextYear} range={range} />
    </PageFrame>
  );
}
