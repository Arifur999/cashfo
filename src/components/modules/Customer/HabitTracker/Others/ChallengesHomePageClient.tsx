"use client";

import { Check, Info, MoreVertical, Plus, Target, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import IconTile from "@/components/smartly/IconTile";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowLink } from "@/components/smartly/list";
import LoadMore from "@/components/smartly/LoadMore";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { CHALLENGE_PRESETS, challengeMark, challengeSummary, challengeWindow, dailyItems, DAY_ITEM, dayDone, MAX_STRIP_DAYS, stripTotals, ticksTheDay } from "@/lib/customer/challengeDisplay";
import { actionError, daysText, dayText } from "@/lib/customer/habitDisplay";
import { deleteChallengeAction, setChallengeDayAction } from "@/lib/customer/habitsActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CHECK_FOCUS } from "../Tracker/PanelParts";
import { withCheck } from "../trackerChecks";
import { NewChallengeDialog } from "./NewChallengeDialog";

interface ChallengesHomePageClientProps {
  trackers: HabitMonthTracker[];
  today: string;
  // ?new=1: opened from "Start a challenge", so the new-challenge dialog is up.
  openNew?: boolean;
}

const NOTICE_KEY = "smartly.challenges.renamed";
const NOTICE_EVENT = "smartly:challenges-notice";
const FINISHED_COLUMNS = "md:grid-cols-[minmax(0,1fr)_200px_240px_80px]";
const FINISHED_ID = "finished-challenges";
const STEP = 50;

// Whether the rename notice is still to be shown: read from the browser,
// false on the server and until the page has mounted.
const subscribeNotice = (onChange: () => void) => {
  window.addEventListener(NOTICE_EVENT, onChange);
  return () => window.removeEventListener(NOTICE_EVENT, onChange);
};
const readNotice = () => {
  try {
    return localStorage.getItem(NOTICE_KEY) !== "seen";
  } catch {
    return false;
  }
};

// Habits › Challenges (what "Others" was): the ones going on with today's
// items to tick, ready-made lengths to start a new one, and the finished.
export function ChallengesHomePageClient({ trackers: serverTrackers, today, openNew = false }: ChallengesHomePageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [dialog, setDialog] = useState<{ open: boolean; days: number | null }>({ open: openNew, days: null });
  const [removing, setRemoving] = useState<HabitMonthTracker | null>(null);
  const [shownFinished, setShownFinished] = useState(STEP);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const notice = useSyncExternalStore(subscribeNotice, readNotice, () => false);
  const [isPending, startTransition] = useTransition();
  const [, startTick] = useTransition();
  // A tick shows at once; the server's copy replaces it when it lands.
  const [trackers, applyTick] = useOptimistic(serverTrackers, (current, update: { id: string; day: number; item: string; checked: boolean }) => current.map((tracker) => (tracker.id === update.id ? withCheck(tracker, update.day, update.item, update.checked) : tracker)));
  const count = (n: number) => formatCount(n, locale);

  // The dialog is already open; the URL loses ?new=1 so a refresh doesn't reopen it.
  useEffect(() => {
    if (openNew) router.replace("/habit-tracker/habits?category=Others", { scroll: false });
  }, [openNew, router]);

  function dismiss() {
    try {
      localStorage.setItem(NOTICE_KEY, "seen");
    } catch {
      // The notice simply shows again next time.
    }
    window.dispatchEvent(new Event(NOTICE_EVENT));
  }

  const rows = trackers.map((tracker) => ({ tracker, window: challengeWindow(tracker, today) }));
  const going = rows.filter((r) => r.window.status === "going");
  const finished = rows.filter((r) => r.window.status === "finished");

  function toggleToday(tracker: HabitMonthTracker, day: number, item: string, checked: boolean) {
    const key = `${tracker.id}:${item}`;
    if (busy.has(key)) return;
    setBusy((prev) => new Set(prev).add(key));
    startTick(async () => {
      applyTick({ id: tracker.id, day, item, checked });
      const result = await setChallengeDayAction(tracker.id, { day, items: [item], checked, addDayItem: tracker.items.length === 0 });
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to update", t, locale));
      setBusy((prev) => {
        const rest = new Set(prev);
        rest.delete(key);
        return rest;
      });
    });
  }

  function remove() {
    if (!removing) return;
    const target = removing;
    startTransition(async () => {
      const result = await deleteChallengeAction(target.id);
      if (result.success) {
        toast.success(t("Challenge removed"));
        setRemoving(null);
      } else {
        toast.error(actionError(result.message, "Failed to remove challenge", t, locale));
      }
      router.refresh();
    });
  }

  const progressLine = (tracker: HabitMonthTracker, window: ReturnType<typeof challengeWindow>) => {
    const summary = challengeSummary(tracker, window);
    const done = count(summary.done);
    if (summary.missed > 0) return t(summary.missed === 1 ? "{done} of {total} days done. {missed} day was missed." : "{done} of {total} days done. {missed} days were missed.", { done, total: count(window.today), missed: count(summary.missed) });
    if (dayDone(tracker, window.today)) return summary.done === 1 ? t("Day 1 done. Keep going.") : t("All {count} days done so far. Keep going.", { count: done });
    if (window.today === 1) return t("Day 1 is today. Tick it off to begin.");
    return t("{done} of {total} days done. Today is still open.", { done, total: count(window.today - 1) });
  };

  const visibleFinished = finished.slice(0, shownFinished);

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Habits")}
        tone="habits"
        title={t("Challenges")}
        description={t("Pick a number of days, then tick it off each day until you reach the end.")}
        actions={
          <Button onClick={() => setDialog({ open: true, days: null })}>
            <Plus strokeWidth={2.25} />
            {t("New challenge")}
          </Button>
        }
      />

      {notice && (
        // Its own box, not the shared Banner: the board draws it bordered and in the body size.
        <div role="note" className="flex items-center gap-3 rounded-md border border-line bg-strip px-4 py-3 text-body text-ink-2">
          <Info className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <b className="font-semibold text-ink">{t("\"Others\" is now called Challenges.")}</b> {t("Everything you made there is here.")}
          </span>
          <button type="button" onClick={dismiss} aria-label={t("Dismiss")} className="flex size-8 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <section aria-labelledby="ch-going" className="flex flex-col gap-3">
        <h2 id="ch-going" className="text-title font-semibold text-ink">
          {t("Going on now")}
        </h2>
        {going.length === 0 ? (
          <Card padding="none" className="flex flex-col items-center gap-2 px-5 py-8 text-center">
            <IconTile tone="habits" size={44}>
              <Target />
            </IconTile>
            <span className="text-body font-semibold text-ink">{t("Nothing going on right now")}</span>
            <span className="text-small text-ink-muted">{t("Pick a length below and start one today.")}</span>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {going.map(({ tracker, window }) => {
              const items = dailyItems(tracker);
              const dayItself = ticksTheDay(tracker);
              const circumference = 2 * Math.PI * 48;
              const name = tracker.name ?? t("Challenge");
              const long = tracker.totalDays > MAX_STRIP_DAYS;
              const totals = long ? stripTotals(tracker, window) : null;
              return (
                <Card key={tracker.id} padding="none" className="flex min-w-0 flex-col gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <IconTile tone="habits" size={40}>
                      <Target />
                    </IconTile>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Link href={`/habit-tracker/habits/others/${tracker.id}`} className="truncate text-title font-semibold text-ink hover:text-brand-ink">
                        {name}
                      </Link>
                      <span className="text-small text-ink-muted">{t("Started {start} · ends {end}", { start: dayText(window.start, locale, "dayMonth"), end: dayText(window.end, locale, "dayMonth") })}</span>
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label={t("More for {name}", { name })} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
                        <MoreVertical className="size-4.5" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                        <DropdownMenuItem asChild className="rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken pointer-coarse:min-h-11">
                          <Link href={`/habit-tracker/habits/others/${tracker.id}`}>{t("Open")}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setRemoving(tracker)} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense pointer-coarse:min-h-11">
                          <Trash2 className="size-4" aria-hidden="true" />
                          {t("Remove")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4 max-[380px]:grid-cols-1">
                    <span role="img" aria-label={t("Day {day} of {total}", { day: count(window.today), total: count(tracker.totalDays) })} className="relative size-28 max-[380px]:mx-auto">
                      <svg viewBox="0 0 112 112" className="size-28 -rotate-90">
                        <circle cx="56" cy="56" r="48" className="fill-none stroke-surface-sunken" strokeWidth="10" />
                        <circle cx="56" cy="56" r="48" className="fill-none stroke-emerald" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(window.today / tracker.totalDays) * circumference} ${circumference}`} />
                      </svg>
                      <span className="absolute inset-0 flex flex-col items-center justify-center gap-px">
                        <span className="text-h2 text-ink">{t("Day {day}", { day: count(window.today) })}</span>
                        <span className="text-caption font-normal text-ink-muted">{t("of {total}", { total: count(tracker.totalDays) })}</span>
                      </span>
                    </span>
                    <div className="flex min-w-0 flex-col gap-2">
                      <span className="text-small font-semibold text-ink-muted">{t("Today")}</span>
                      {items.map((item) => {
                        const checked = tracker.checks.some((c) => c.day === window.today && c.item === item);
                        return (
                          <label key={item} className={cn("flex min-h-9.5 cursor-pointer items-center gap-3 rounded-md border px-3 py-1.5 transition-colors pointer-coarse:min-h-11", CHECK_FOCUS, checked ? "border-mint-200 bg-mint-50" : "border-line bg-surface hover:border-line-strong")}>
                            <input type="checkbox" checked={checked} disabled={busy.has(`${tracker.id}:${item}`)} onChange={() => toggleToday(tracker, window.today, item, !checked)} className="sr-only" />
                            <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-sm", checked ? "bg-emerald text-on-action" : "border-[1.5px] border-line-strong bg-surface")}>{checked && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}</span>
                            <span className="min-w-0 flex-1 text-body font-medium wrap-break-word text-ink">{dayItself && item === DAY_ITEM ? t("Done for today") : item}</span>
                          </label>
                        );
                      })}
                      <span className="text-small text-ink-2">{progressLine(tracker, window)}</span>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col gap-2">
                    {totals ? (
                      // Too many days for a segment each: done, missed and still to come.
                      <div role="img" aria-label={t("{name}: {done} days done, {missed} missed, {left} still to come", { name, done: count(totals.done), missed: count(totals.missed), left: count(totals.toCome) })} className="flex h-3.5 overflow-hidden rounded-[3px] bg-surface-sunken">
                        <span className="bg-emerald" style={{ width: `${(totals.done / tracker.totalDays) * 100}%` }} />
                        <span className="bg-expense-soft" style={{ width: `${(totals.missed / tracker.totalDays) * 100}%` }} />
                      </div>
                    ) : (
                      <div role="img" aria-label={t("{name}: day {day} of {total}", { name, day: count(window.today), total: count(tracker.totalDays) })} className="flex min-w-0 gap-0.75 overflow-hidden">
                        {Array.from({ length: tracker.totalDays }, (_, i) => i + 1).map((day) => {
                          const mark = challengeMark(tracker, window, day);
                          return <span key={day} title={`${t("Day {day}", { day: count(day) })}: ${t(mark === "done" ? "done" : mark === "missed" ? "missed" : mark === "today" ? "today" : "still to come")}`} className={cn("h-3.5 min-w-0 flex-1 rounded-[3px]", mark === "done" ? "bg-emerald" : mark === "missed" ? "bg-expense-soft" : "bg-surface-sunken", day === window.today && "ring-2 ring-forest ring-inset dark:ring-emerald")} />;
                        })}
                      </div>
                    )}
                    <div className="flex justify-between gap-2 text-caption font-normal text-ink-muted">
                      <span>{t("Day {day}", { day: count(1) })}</span>
                      <span>{t(window.daysLeft === 1 ? "{count} day to go" : "{count} days to go", { count: count(window.daysLeft) })}</span>
                      <span>{t("Day {day}", { day: count(tracker.totalDays) })}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="ch-new" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="ch-new" className="text-title font-semibold text-ink">
            {t("Start a new one")}
          </h2>
          <span className="text-small text-ink-muted">{t("Pick a length. You can change the name and the daily items next.")}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CHALLENGE_PRESETS.map((p) => (
            <button key={p.days} type="button" onClick={() => setDialog({ open: true, days: p.days })} className="flex flex-col items-start gap-2 rounded-lg border border-line bg-surface p-4 text-left shadow-card transition-colors hover:border-emerald">
              <span className="flex items-baseline gap-1">
                <span className="text-h1 text-emerald">{count(p.days)}</span>
                <span className="text-small font-semibold text-ink-2">{t("days")}</span>
              </span>
              <span className="text-body font-semibold text-ink">{t(p.title)}</span>
              <span className="text-small leading-snug text-ink-muted">{t(p.sub)}</span>
            </button>
          ))}
          <button type="button" onClick={() => setDialog({ open: true, days: 0 })} className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-line-strong bg-surface p-4 text-left shadow-card transition-colors hover:border-emerald">
            <span className="text-h1 text-ink-2">+</span>
            <span className="text-body font-semibold text-ink">{t("Your own length")}</span>
            <span className="text-small leading-snug text-ink-muted">{t("Choose any number of days.")}</span>
          </button>
        </div>
      </section>

      <ListCard
        id={FINISHED_ID}
        label={t("Finished")}
        header={
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 md:px-6">
            <h2 className="text-title text-ink">{t("Finished")}</h2>
            <span className="text-small text-ink-muted">{t(finished.length === 1 ? "{count} challenge" : "{count} challenges", { count: count(finished.length) })}</span>
          </div>
        }
        footer={
          finished.length > STEP && (
            <ListFooter>
              <LoadMore shown={Math.min(shownFinished, finished.length)} total={finished.length} step={STEP} onMore={() => setShownFinished((value) => value + STEP)} onLess={shownFinished >= finished.length ? () => setShownFinished(STEP) : undefined} focusTargetId={FINISHED_ID} />
            </ListFooter>
          )
        }
      >
        {finished.length === 0 ? (
          <ListEmpty title={t("Nothing finished yet.")} />
        ) : (
          <>
            <ListHead columns={FINISHED_COLUMNS}>
              <ListHeadCell>{t("Challenge")}</ListHeadCell>
              <ListHeadCell>{t("Dates")}</ListHeadCell>
              <ListHeadCell>{t("Days done")}</ListHeadCell>
              <ListHeadCell align="end">{t("Done")}</ListHeadCell>
            </ListHead>
            {visibleFinished.map(({ tracker, window }) => {
              const summary = challengeSummary(tracker, window);
              return (
                <ListRow key={tracker.id} columns={FINISHED_COLUMNS} density="relaxed">
                  <ListCell className="flex min-w-0 items-center gap-3">
                    <IconTile tone="habits" size={32}>
                      <Target />
                    </IconTile>
                    <ListRowLink href={`/habit-tracker/habits/others/${tracker.id}`} className="flex min-w-0 flex-col gap-px">
                      <span className="truncate text-body font-semibold text-ink">{tracker.name ?? t("Challenge")}</span>
                      <span className="text-small text-ink-muted">{daysText(tracker.totalDays, t, locale)}</span>
                    </ListRowLink>
                  </ListCell>
                  <ListCell className="hidden text-small text-ink-2 md:block">{t("{from} to {to}", { from: dayText(window.start, locale, "dayMonth"), to: dayText(window.end, locale, "dayMonth") })}</ListCell>
                  <ListCell className="hidden items-center gap-3 md:flex">
                    <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                      <span className={cn("block h-full rounded-full", summary.pct >= 80 ? "bg-income" : "bg-warning-fill")} style={{ width: `${summary.pct}%` }} />
                    </span>
                    <span className="text-small whitespace-nowrap text-ink-2 tabular-nums">{t("{done} of {total} days", { done: count(summary.done), total: count(tracker.totalDays) })}</span>
                  </ListCell>
                  <ListCell align="end" className={cn("flex items-center justify-end gap-1 text-body font-bold tabular-nums", summary.pct >= 80 ? "text-income" : "text-warning")}>
                    <Check className="size-4" aria-hidden="true" />
                    {count(summary.pct)}%
                  </ListCell>
                </ListRow>
              );
            })}
          </>
        )}
      </ListCard>

      <NewChallengeDialog open={dialog.open} onClose={() => setDialog({ open: false, days: null })} presetDays={dialog.days === 0 ? 10 : dialog.days} />
      <ConfirmDialog open={removing !== null} onClose={() => !isPending && setRemoving(null)} onConfirm={remove} icon={<Trash2 />} title={t("Remove {name}?", { name: removing?.name ?? t("Challenge") })} description={t("Its days and ticks go with it. This can't be undone.")} confirmLabel={t("Remove")} isPending={isPending} />
    </PageFrame>
  );
}
