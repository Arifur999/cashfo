"use client";

import { Bell, BellRing, Check, CheckCheck, Clock3, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import { useMinuteClock } from "@/hooks/useMinuteClock";
import type { HabitMonthTracker, PrayerStatus } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { shiftDay } from "@/lib/customer/habitDisplay";
import { type CellState, cellState, isPrayed, PRAYERS } from "@/lib/customer/namazDisplay";
import { clockOf, nextPrayer, prayerTimesFor, type TimeName } from "@/lib/customer/prayerTimes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { draftFromReminder, NAMAZ_KEYS, PRAYER_LABEL, type ReminderBook } from "../Reminders";

interface TodayPrayersCardProps {
  // This month's sheet; null while it opens.
  current: HabitMonthTracker | null;
  today: string;
  onMark: (prayer: string, status: PrayerStatus | null) => void;
  reminders: ReminderBook;
}

// The four ways a prayer is marked, as the board colours them.
const OPTIONS: { status: PrayerStatus; state: CellState; label: string; icon: typeof Check; on: string }[] = [
  { status: "JAMAAT", state: "jamaat", label: "Jama'at", icon: CheckCheck, on: "border-emerald bg-emerald text-white dark:text-on-action" },
  { status: "ON_TIME", state: "onTime", label: "On time", icon: Check, on: "border-emerald bg-emerald-tint text-emerald" },
  { status: "QAZA", state: "qaza", label: "Qaza", icon: Clock3, on: "border-warning-fill bg-warning-soft text-warning-ink" },
  { status: "MISSED", state: "missed", label: "Missed", icon: X, on: "border-expense bg-expense-soft text-expense" },
];

// A marked prayer's pill.
const PILL: Partial<Record<CellState, { label: string; className: string }>> = {
  jamaat: { label: "Jama'at", className: "bg-emerald text-white dark:text-on-action" },
  onTime: { label: "On time", className: "bg-emerald-tint text-emerald" },
  qaza: { label: "Qaza", className: "bg-warning-soft text-warning-ink" },
  missed: { label: "Missed", className: "bg-expense-soft text-expense" },
};

// When each prayer's time ends: the next one starts (Fajr ends at sunrise,
// Isha at tomorrow's Fajr).
const ENDS: Record<(typeof PRAYERS)[number], TimeName> = { Fajr: "Sunrise", Dhuhr: "Asr", Asr: "Maghrib", Maghrib: "Isha", Isha: "Fajr" };

// Today's prayers (the NamazHome board): each prayer's time, and once it has
// started, its four marks to tap (saved at once; tapping the mark again
// clears it). One still to come shows when it opens and a reminder switch.
export function TodayPrayersCard({ current, today, onMark, reminders }: TodayPrayersCardProps) {
  const { t, fmt } = useLocale();
  const { settings } = usePrayerSettings();
  const now = useMinuteClock();
  const [saving, setSaving] = useState<string | null>(null);
  const todayDay = Number(today.slice(8));
  const tomorrow = shiftDay(today, 1);
  const times = prayerTimesFor(settings, today);
  const tomorrowTimes = prayerTimesFor(settings, tomorrow);
  const next = now ? nextPrayer(settings, today, tomorrow, now) : null;
  const prayedToday = current ? PRAYERS.filter((prayer) => isPrayed(cellState(current, todayDay, prayer))).length : 0;
  const clock = (time: Date) => timeLabel(clockOf(time), t, fmt);

  async function toggleReminder(prayer: (typeof PRAYERS)[number]) {
    const key = NAMAZ_KEYS.find((k) => PRAYER_LABEL[k] === prayer);
    if (!key || saving) return;
    const draft = draftFromReminder("NAMAZ", reminders.find("NAMAZ", key));
    setSaving(prayer);
    const result = await reminders.saveDraft("NAMAZ", key, { ...draft, enabled: !draft.enabled });
    setSaving(null);
    if (!result.success) toast.error(t(result.message ?? "Failed to save the reminder"));
    else toast.success(t(draft.enabled ? "{prayer} reminder off" : "{prayer} reminder on", { prayer: t(prayer) }));
  }

  return (
    <section aria-labelledby="today-prayers-title" className="flex flex-col gap-3.5 rounded-[14px] border border-line-card bg-surface px-5 py-4.5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="today-prayers-title" className="text-[17px] font-semibold text-ink">
            {t("Today's prayers")}
          </h2>
          <span className="text-small text-ink-muted">{t("Tap how you prayed. It is saved right away.")}</span>
        </div>
        <span className="inline-flex h-7.5 items-center rounded-full bg-emerald-soft px-3 text-small font-semibold text-emerald">{t("{count} of 5 prayed", { count: formatCount(prayedToday, fmt) })}</span>
      </div>
      <div className="grid gap-3 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[1360px]:grid-cols-5">
        {PRAYERS.map((prayer) => {
          const start = times[prayer];
          const end = prayer === "Isha" ? tomorrowTimes.Fajr : times[ENDS[prayer]];
          const state = current ? cellState(current, todayDay, prayer) : "open";
          const marked = current?.checks.some((c) => c.day === todayDay && c.item === prayer) ?? false;
          const started = now === null || start <= now;
          const isNext = next?.prayer === prayer && next.at.getTime() === start.getTime();
          const pill = marked ? PILL[state] : undefined;
          const key = NAMAZ_KEYS.find((k) => PRAYER_LABEL[k] === prayer);
          const reminderOn = key ? !!reminders.find("NAMAZ", key)?.enabled : false;
          return (
            <div
              key={prayer}
              className={cn(
                "flex min-w-0 flex-col gap-2.5 rounded-[12px] p-3.5",
                isNext ? "border-[1.5px] border-emerald" : "border border-line",
                marked ? "bg-surface" : started ? "bg-warning-50" : "bg-surface",
              )}
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="text-[15px] leading-[normal] font-bold text-ink">{t(prayer)}</span>
                  <span className="text-[11.5px] leading-[normal] whitespace-nowrap text-ink-muted tabular-nums">
                    {clock(start)} – {clock(end)}
                  </span>
                </span>
                <span className={cn("inline-flex h-5.5 shrink-0 items-center rounded-full px-2 text-[11.5px] font-bold whitespace-nowrap", pill ? pill.className : started ? "bg-warning-soft text-warning-ink" : isNext ? "bg-emerald-soft text-emerald" : "bg-surface-sunken text-ink-muted")}>
                  {pill ? t(pill.label) : started ? t("Not marked") : isNext ? t("Next") : t("Later")}
                </span>
              </div>
              {started ? (
                <div role="radiogroup" aria-label={t(prayer)} className="grid grid-cols-2 gap-1.5">
                  {OPTIONS.map((option) => {
                    const on = marked && state === option.state;
                    return (
                      <button
                        key={option.status}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={!current}
                        onClick={() => onMark(prayer, on ? null : option.status)}
                        className={cn(
                          "flex h-8.5 items-center justify-center gap-1.25 rounded-sm border-[1.5px] px-1.5 text-caption font-semibold whitespace-nowrap transition-colors disabled:opacity-60 pointer-coarse:h-11",
                          on ? option.on : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink",
                        )}
                      >
                        <option.icon className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                        {t(option.label)}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-18.5 flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-line-strong bg-strip">
                  <span className="text-caption text-ink-muted">{t("Opens at {time}", { time: clock(start) })}</span>
                  {reminders.available && !reminders.readOnly && (
                    <button
                      type="button"
                      onClick={() => void toggleReminder(prayer)}
                      disabled={saving === prayer}
                      aria-pressed={reminderOn}
                      className={cn("flex h-7 items-center gap-1.25 rounded-full border px-2.5 text-caption font-semibold transition-colors disabled:opacity-60", reminderOn ? "border-emerald bg-emerald-soft text-emerald" : "border-line-strong bg-surface text-ink-soft hover:text-ink")}
                    >
                      {reminderOn ? <BellRing className="size-3.25" aria-hidden="true" /> : <Bell className="size-3.25" aria-hidden="true" />}
                      {t(reminderOn ? "Reminder on" : "Remind me")}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
