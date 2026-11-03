"use client";

import { Check, Flame, MoreVertical, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { HabitMonthTracker, Reminder } from "@/lib/customer/api";
import { challengeMark, challengeSummary, challengeWindow, dailyItems, DAY_ITEM, dayDone, doneDays, ticksTheDay } from "@/lib/customer/challengeDisplay";
import { actionError, daysText, dayText } from "@/lib/customer/habitDisplay";
import { deleteChallengeAction, removeTrackerItemAction, setChallengeDayAction } from "@/lib/customer/habitsActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SavedReminderEditor, useReminderBook } from "../Reminders";
import { AddRowDialog } from "../Tracker/AddRowDialog";
import { CHECK_FOCUS } from "../Tracker/PanelParts";
import { RecordEyebrow } from "../Tracker/RecordEyebrow";
import { useRovingGrid } from "../Tracker/useRovingGrid";
import { withCheck } from "../trackerChecks";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import { ChallengeTile } from "./ChallengeTile";

interface ChallengeDetailPageClientProps {
  tracker: HabitMonthTracker;
  today: string;
  // Saved reminders (this challenge's is edited here); null when they
  // couldn't be read.
  reminders: Reminder[] | null;
}

type Tick = { day: number; items: string[]; checked: boolean };

// One challenge: where it stands, every day as a box (tap a past day to
// fix it), and today's items to tick.
export function ChallengeDetailPageClient({ tracker, today, reminders: savedReminders }: ChallengeDetailPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isPending, startSlow] = useTransition();
  const [sheet, applyTick] = useOptimistic(tracker, (current, update: Tick) => update.items.reduce((next, item) => withCheck(next, update.day, item, update.checked), current));
  const [addOpen, setAddOpen] = useState(false);
  const [busyDay, setBusyDay] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "remove-row"; item: string } | { kind: "delete" } | null>(null);
  const count = (n: number) => formatCount(n, fmt);
  const reminders = useReminderBook(savedReminders);

  const window = challengeWindow(sheet, today);
  const summary = challengeSummary(sheet, window);
  const items = dailyItems(sheet);
  const dayItself = ticksTheDay(sheet);
  const name = sheet.name ?? t("Challenge");
  const todayDone = window.status === "going" && dayDone(sheet, window.today);
  // Only the challenge's own items can be removed; the day itself is not one.
  const ownItems = sheet.items.filter((item) => !(dayItself && item === DAY_ITEM));
  // The days are one Tab stop (today's box first), walked with the arrow
  // keys: a long challenge no longer puts hundreds of boxes before today's items.
  const days = useRovingGrid(1, sheet.totalDays, { row: 0, col: Math.max(0, Math.min(window.today, window.lastDay) - 1) });
  const markWord = (mark: ReturnType<typeof challengeMark>) => t(mark === "done" ? "done" : mark === "missed" ? "missed" : mark === "today" ? "today" : mark === "notReached" ? "not reached" : "later");

  // Every tick goes through one call that stops at the first refusal, so a
  // half-saved day says so instead of passing in silence. One at a time:
  // while a tick is out the boxes say so (aria-disabled) but stay enabled,
  // so the focused one keeps the focus and the grid its Tab stop.
  function tick(update: Tick) {
    if (busyDay !== null) return;
    setBusyDay(update.day);
    startTransition(async () => {
      applyTick(update);
      const result = await setChallengeDayAction(sheet.id, { ...update, addDayItem: sheet.items.length === 0 });
      if (!result.success) toast.error(actionError(result.message, "Failed to update", t, fmt));
      router.refresh();
      setBusyDay(null);
    });
  }

  // A past day is fixed as a whole: every item on, or every item off.
  const toggleDay = (day: number) => tick({ day, items, checked: !dayDone(sheet, day) });

  function runConfirm() {
    if (!confirm) return;
    const action = confirm;
    startSlow(async () => {
      const result = action.kind === "delete" ? await deleteChallengeAction(sheet.id) : await removeTrackerItemAction(sheet.id, action.item);
      if (result.success) {
        toast.success(action.kind === "delete" ? t("Challenge removed") : t("Row removed"));
        setConfirm(null);
        if (action.kind === "delete") router.push("/habit-tracker/habits?category=Others");
        router.refresh();
      } else {
        toast.error(actionError(result.message, action.kind === "delete" ? "Failed to remove challenge" : "Failed to remove the row", t, fmt));
      }
    });
  }

  const statusLine =
    window.status === "upcoming"
      ? t("Starts tomorrow, {date}", { date: dayText(window.start, fmt, "dayMonth") })
      : window.ended
        ? t("Ended early on day {day} · {done} of {total} days done", { day: count(window.lastDay), done: count(summary.done), total: count(sheet.totalDays) })
        : window.status === "finished"
          ? t("Finished · {done} of {total} days done", { done: count(summary.done), total: count(sheet.totalDays) })
          : [t("Day {day} of {total}", { day: count(window.today), total: count(sheet.totalDays) }), summary.missed === 0 ? t("every day done so far") : t(summary.missed === 1 ? "{count} day missed" : "{count} days missed", { count: count(summary.missed) })].join(" · ");

  return (
    <PageFrame className="gap-5 md:pt-7">
      <TopbarExtras record={name} />
      <div className="flex flex-col gap-1">
        <RecordEyebrow href="/habit-tracker/habits?category=Others" back={t("All challenges")} />
        <PageHeader
          title={name}
          actions={
            <>
              <Button variant="secondary" onClick={() => setAddOpen(true)}>
                <Plus />
                {t("Add a row")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger aria-label={t("More")} className="flex size-10 items-center justify-center rounded-full border border-input bg-surface text-ink hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
                  <MoreVertical className="size-4.5" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                  {ownItems.map((item) => (
                    <DropdownMenuItem key={item} onSelect={() => setConfirm({ kind: "remove-row", item })} className="rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken pointer-coarse:min-h-11">
                      <Trash2 className="size-4" aria-hidden="true" />
                      {t("Remove the {name} row", { name: item })}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onSelect={() => setConfirm({ kind: "delete" })} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense pointer-coarse:min-h-11">
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t("Delete challenge")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />
      </div>

      <Card padding="none" className="flex flex-col gap-4 rounded-md px-5 py-4.5 md:flex-row md:items-center">
        <ChallengeTile name={sheet.name} size={48} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[12.5px] text-ink-muted">{t(window.status === "upcoming" ? "Starts {start} · ends {end}" : "Started {start} · ends {end}", { start: dayText(window.start, fmt, "short"), end: dayText(window.end, fmt, "short") })}</span>
          <span className="text-title text-ink">{statusLine}</span>
        </div>
        <div className="flex flex-wrap gap-6 text-center">
          <span className="flex flex-col gap-1">
            <span className="text-small text-ink-muted">{t("Streak")}</span>
            <span className="flex items-center justify-center gap-1 text-h2 whitespace-nowrap text-ink tabular-nums">
              <Flame className="size-4.5 text-orange-fill" strokeWidth={2.25} aria-hidden="true" />
              {daysText(summary.streak, t, fmt)}
            </span>
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-small text-ink-muted">{t("Done")}</span>
            <span className="text-h2 text-ink tabular-nums">{count(summary.pct)}%</span>
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-small text-ink-muted">{t("Days left")}</span>
            <span className="text-h2 text-ink tabular-nums">{count(window.daysLeft)}</span>
          </span>
        </div>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card padding="none" className="flex min-w-0 flex-col gap-4 rounded-md px-5 py-4.5">
          <div className="flex flex-col gap-0.5">
            <h2 id="challenge-days" className="text-title text-ink">
              {daysText(sheet.totalDays, t, fmt)}
            </h2>
            <span id="challenge-days-hint" className="text-[12.5px] text-ink-muted">
              {t("Tap a past day to fix it")}
            </span>
          </div>
          <div role="group" aria-labelledby="challenge-days" aria-describedby="challenge-days-hint" onKeyDown={days.onKeyDown} className="grid grid-cols-[repeat(auto-fill,44px)] gap-2.5">
            {Array.from({ length: sheet.totalDays }, (_, i) => i + 1).map((day) => {
              const mark = challengeMark(sheet, window, day);
              // A day that has come, up to the day it was ended.
              const past = day <= window.today && day <= window.lastDay;
              const cell = { row: 0, col: day - 1 };
              return (
                <button
                  key={day}
                  ref={days.ref(cell)}
                  tabIndex={days.tabIndex(cell)}
                  onFocus={() => days.setActive(cell)}
                  type="button"
                  disabled={!past}
                  aria-disabled={busyDay !== null || undefined}
                  onClick={() => toggleDay(day)}
                  aria-label={`${t("Day {day}", { day: count(day) })}: ${markWord(mark)}`}
                  title={`${t("Day {day}", { day: count(day) })}: ${markWord(mark)}`}
                  className={cn("flex size-11 items-center justify-center rounded-field text-body font-bold transition-colors", mark === "done" && "bg-emerald text-on-action", mark === "missed" && "bg-expense-soft text-expense", mark === "today" && "border-2 border-brand-ink bg-surface text-ink", mark === "later" && "cursor-not-allowed bg-surface-sunken text-ink-muted", mark === "notReached" && "cursor-not-allowed bg-surface-sunken text-ink-faint", day === window.today && mark === "done" && "ring-2 ring-brand-ink ring-offset-2 ring-offset-surface", busyDay === day && "opacity-60")}
                >
                  {mark === "done" ? <Check className="size-4.5" strokeWidth={3} aria-hidden="true" /> : count(day)}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-muted">
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-[4px] bg-emerald" /> {t("Done")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-[4px] bg-expense-soft" /> {t("Missed")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-[4px] border-2 border-brand-ink bg-surface" /> {t("Today")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-[4px] border border-line bg-surface-sunken" /> {t("Still to come")}
            </span>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card padding="none" className="flex flex-col gap-3 rounded-md px-5 py-4.5">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-title text-ink">{window.status === "finished" ? t(window.ended ? "Ended early" : "Finished") : window.status === "upcoming" ? t("Starts tomorrow") : t("Today · day {day}", { day: count(window.today) })}</h2>
              <span className="text-[12.5px] text-ink-muted">{dayText(today, fmt, "short")}</span>
            </div>
            {window.status === "going" &&
              items.map((item) => {
                const checked = sheet.checks.some((c) => c.day === window.today && c.item === item);
                return (
                  <label key={item} className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[9px] border px-3 py-2.5 text-body font-medium transition-colors", CHECK_FOCUS, checked ? "border-emerald-line bg-mint-50" : "border-line hover:border-line-strong")}>
                    <input type="checkbox" checked={checked} aria-disabled={busyDay !== null || undefined} onChange={() => tick({ day: window.today, items: [item], checked: !checked })} className="sr-only" />
                    <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-[6px]", checked ? "bg-emerald text-on-action" : "border-[1.5px] border-line-strong bg-surface")}>{checked && <Check className="size-3.25" strokeWidth={3.5} aria-hidden="true" />}</span>
                    <span className="min-w-0 wrap-break-word text-ink">{dayItself && item === DAY_ITEM ? t("Done for today") : item}</span>
                  </label>
                );
              })}
            {window.status === "going" && todayDone && (
              <div className="flex items-start gap-2.5 rounded-field bg-mint-50 px-3.5 py-2.5 text-small leading-snug text-brand-ink">
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{t(summary.streak === 1 ? "Done for today. {count} day in a row." : "Done for today. {count} days in a row.", { count: count(summary.streak) })}</span>
              </div>
            )}
            {window.status === "finished" && (
              <p className="text-small leading-relaxed text-ink-2">
                {t("{done} of {total} days done", { done: count(summary.done), total: count(sheet.totalDays) })} · {count(summary.pct)}%. {t("Start another from the challenges page.")}
              </p>
            )}
          </Card>

          {/* A finished challenge keeps its card only while a reminder is still on, to turn it off. */}
          {reminders.available && (window.status !== "finished" || reminders.find("CHALLENGE", sheet.id)?.enabled) && (
            <Card padding="none" className="rounded-md px-5 py-4.5">
              <SavedReminderEditor key={sheet.id} kind="CHALLENGE" targetKey={sheet.id} book={reminders} label={<span className="text-title">{t("Reminder")}</span>} description={t("A nudge to tick today's items. Skipped once they're ticked.")} />
            </Card>
          )}
        </div>
      </div>

      <AddRowDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        trackerId={sheet.id}
        existing={sheet.items}
        suggestions={[]}
        description={t("A daily item of this challenge. A day counts as done when every item is ticked.")}
        challenge={{ doneDays: doneDays(sheet, Math.min(window.today, sheet.totalDays)), replaceDayItem: dayItself && sheet.items.includes(DAY_ITEM) }}
      />
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => !isPending && setConfirm(null)}
        onConfirm={runConfirm}
        icon={<Trash2 />}
        title={confirm?.kind === "delete" ? t("Delete {name}?", { name }) : t("Remove {name}?", { name: confirm?.kind === "remove-row" ? confirm.item : "" })}
        description={confirm?.kind === "delete" ? t("Its days and ticks go with it. This can't be undone.") : t("Its ticks on this sheet go with it.")}
        confirmLabel={confirm?.kind === "delete" ? t("Delete challenge") : t("Remove")}
        isPending={isPending}
      />
    </PageFrame>
  );
}
