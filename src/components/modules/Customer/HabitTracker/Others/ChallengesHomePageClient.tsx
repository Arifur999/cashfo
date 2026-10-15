"use client";

import { Check, Info, MoreVertical, Plus, Target, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import IconTile from "@/components/smartly/IconTile";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { CHALLENGE_PRESETS, challengeMark, challengeSummary, challengeWindow, dayDone } from "@/lib/customer/challengeDisplay";
import { formatDate } from "@/lib/customer/date";
import { deleteHabitTrackerAction, setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { NewChallengeDialog } from "./NewChallengeDialog";

interface ChallengesHomePageClientProps {
  trackers: HabitMonthTracker[];
  today: string;
}

const NOTICE_KEY = "smartly.challenges.renamed";
const NOTICE_EVENT = "smartly:challenges-notice";

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
export function ChallengesHomePageClient({ trackers, today }: ChallengesHomePageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [dialog, setDialog] = useState<{ open: boolean; days: number | null }>({ open: false, days: null });
  const [removing, setRemoving] = useState<HabitMonthTracker | null>(null);
  const notice = useSyncExternalStore(subscribeNotice, readNotice, () => false);
  const [isPending, startTransition] = useTransition();

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
    startTransition(async () => {
      const result = await setHabitTrackerCheckAction(tracker.id, { day, item, checked });
      if (result.success) router.refresh();
      else toast.error(result.message ?? t("Failed to update"));
    });
  }

  function remove() {
    if (!removing) return;
    const target = removing;
    startTransition(async () => {
      const result = await deleteHabitTrackerAction(target.id);
      if (result.success) {
        toast.success(t("Challenge removed"));
        setRemoving(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove challenge"));
      }
    });
  }

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
        <div role="status" className="flex items-center gap-3 rounded-md bg-surface-sunken px-4 py-3 text-body text-ink-2">
          <Info className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="flex-1">
            <b className="font-semibold text-ink">{t("\"Others\" is now called Challenges.")}</b> {t("Everything you made there is here.")}
          </span>
          <button type="button" onClick={dismiss} aria-label={t("Dismiss")} className="flex size-7 items-center justify-center rounded-sm text-ink-muted hover:bg-line hover:text-ink">
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
              const summary = challengeSummary(tracker, window);
              const items = tracker.items.length > 0 ? tracker.items : ["done"];
              const todayDone = dayDone(tracker, window.today);
              const circumference = 2 * Math.PI * 48;
              return (
                <Card key={tracker.id} padding="none" className="flex flex-col gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <IconTile tone="habits" size={40}>
                      <Target />
                    </IconTile>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Link href={`/habit-tracker/habits/others/${tracker.id}`} className="truncate text-title font-semibold text-ink hover:text-emerald">
                        {tracker.name ?? t("Challenge")}
                      </Link>
                      <span className="text-small text-ink-muted">
                        {t("Started")} {formatDate(window.start, "d MMM")} · {t("ends")} {formatDate(window.end, "d MMM")}
                      </span>
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label={`${t("More for")} ${tracker.name ?? ""}`} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-cream data-open:bg-cream">
                        <MoreVertical className="size-4.5" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                        <DropdownMenuItem asChild className="rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                          <Link href={`/habit-tracker/habits/others/${tracker.id}`}>{t("Open")}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setRemoving(tracker)} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
                          <Trash2 className="size-4" aria-hidden="true" />
                          {t("Remove")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4">
                    <span role="img" aria-label={`${t("Day")} ${window.today} ${t("of")} ${tracker.totalDays}`} className="relative size-28">
                      <svg viewBox="0 0 112 112" className="size-28 -rotate-90">
                        <circle cx="56" cy="56" r="48" className="fill-none stroke-surface-sunken" strokeWidth="10" />
                        <circle cx="56" cy="56" r="48" className="fill-none stroke-emerald" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(window.today / tracker.totalDays) * circumference} ${circumference}`} />
                      </svg>
                      <span className="absolute inset-0 flex flex-col items-center justify-center gap-px">
                        <span className="text-[22px] leading-7 font-bold text-ink">
                          {t("Day")} {window.today}
                        </span>
                        <span className="text-caption font-normal text-ink-muted">
                          {t("of")} {tracker.totalDays}
                        </span>
                      </span>
                    </span>
                    <div className="flex flex-col gap-2">
                      <span className="text-small font-semibold text-ink-muted">{t("Today")}</span>
                      {items.map((item) => {
                        const checked = tracker.checks.some((c) => c.day === window.today && c.item === item);
                        return (
                          <label key={item} className={cn("flex h-9.5 cursor-pointer items-center gap-3 rounded-md border px-3 transition-colors", checked ? "border-mint-200 bg-mint-50" : "border-line bg-surface hover:border-line-strong")}>
                            <input type="checkbox" checked={checked} disabled={isPending} onChange={() => toggleToday(tracker, window.today, item, !checked)} className="sr-only" />
                            <span className={cn("flex size-5 items-center justify-center rounded-sm", checked ? "bg-emerald text-white" : "border-[1.5px] border-line-strong bg-surface")}>{checked && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}</span>
                            <span className="flex-1 text-body font-medium text-ink">{item === "done" && tracker.items.length === 0 ? t("Done for today") : item}</span>
                          </label>
                        );
                      })}
                      <span className="text-small text-ink-2">
                        {summary.missed > 0
                          ? `${summary.done} ${t("of")} ${window.today} ${t("days done.")} ${summary.missed} ${t(summary.missed === 1 ? "day was missed." : "days were missed.")}`
                          : todayDone
                            ? summary.done === 1
                              ? t("Day 1 done. Keep going.")
                              : `${t("All")} ${summary.done} ${t("days done so far. Keep going.")}`
                            : window.today === 1
                              ? t("Day 1 is today. Tick it off to begin.")
                              : `${summary.done} ${t("of")} ${window.today - 1} ${t("days done. Today is still open.")}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div role="img" aria-label={`${tracker.name}: ${t("day")} ${window.today} ${t("of")} ${tracker.totalDays}`} className="flex gap-0.75">
                      {Array.from({ length: tracker.totalDays }, (_, i) => i + 1).map((day) => {
                        const mark = challengeMark(tracker, window, day);
                        return <span key={day} title={`${t("Day")} ${day}: ${t(mark === "done" ? "done" : mark === "missed" ? "missed" : mark === "today" ? "today" : "still to come")}`} className={cn("h-3.5 flex-1 rounded-[3px]", mark === "done" ? "bg-emerald" : mark === "missed" ? "bg-expense-soft" : "bg-surface-sunken", day === window.today && "ring-2 ring-forest ring-inset")} />;
                      })}
                    </div>
                    <div className="flex justify-between text-caption font-normal text-ink-muted">
                      <span>{t("Day")} 1</span>
                      <span>
                        {window.daysLeft} {t("days to go")}
                      </span>
                      <span>
                        {t("Day")} {tracker.totalDays}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="ch-new" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="ch-new" className="text-title font-semibold text-ink">
            {t("Start a new one")}
          </h2>
          <span className="text-small text-ink-muted">{t("Pick a length. You can change the name and the daily items next.")}</span>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {CHALLENGE_PRESETS.map((p) => (
            <button key={p.days} type="button" onClick={() => setDialog({ open: true, days: p.days })} className="flex flex-col items-start gap-2 rounded-lg border border-line bg-surface p-4 text-left shadow-card transition-colors hover:border-emerald">
              <span className="flex items-baseline gap-1">
                <span className="text-h1 text-emerald">{p.days}</span>
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

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-title font-semibold text-ink">{t("Finished")}</h2>
          <span className="text-small text-ink-muted">
            {finished.length} {t(finished.length === 1 ? "challenge" : "challenges")}
          </span>
        </div>
        {finished.length === 0 && <p className="border-t border-surface-sunken px-5 py-6 text-center text-small text-ink-muted">{t("Nothing finished yet.")}</p>}
        {finished.map(({ tracker, window }) => {
          const summary = challengeSummary(tracker, window);
          return (
            <Link key={tracker.id} href={`/habit-tracker/habits/others/${tracker.id}`} className="grid min-h-15.5 grid-cols-[minmax(0,1fr)_auto] items-center gap-5 border-t border-surface-sunken px-5 py-2 text-ink hover:bg-cream md:grid-cols-[minmax(0,1fr)_220px_260px_90px]">
              <span className="flex min-w-0 items-center gap-3">
                <IconTile tone="habits" size={32}>
                  <Target />
                </IconTile>
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="truncate text-body font-semibold">{tracker.name ?? t("Challenge")}</span>
                  <span className="text-small text-ink-muted">
                    {tracker.totalDays} {t("days")}
                  </span>
                </span>
              </span>
              <span className="hidden text-small text-ink-2 md:block">
                {formatDate(window.start, "d MMM")} {t("to")} {formatDate(window.end, "d MMM")}
              </span>
              <span className="hidden items-center gap-3 md:flex">
                <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                  <span className={cn("block h-full rounded-full", summary.pct >= 80 ? "bg-income" : "bg-warning-fill")} style={{ width: `${summary.pct}%` }} />
                </span>
                <span className="text-small whitespace-nowrap text-ink-2 tabular-nums">
                  {summary.done} {t("of")} {tracker.totalDays} {t("days")}
                </span>
              </span>
              <span className={cn("flex items-center justify-end gap-1 text-body font-bold tabular-nums", summary.pct >= 80 ? "text-income" : "text-warning")}>
                <Check className="size-4" aria-hidden="true" />
                {summary.pct}%
              </span>
            </Link>
          );
        })}
      </Card>

      <NewChallengeDialog open={dialog.open} onClose={() => setDialog({ open: false, days: null })} presetDays={dialog.days === 0 ? 10 : dialog.days} />
      <ConfirmDialog open={removing !== null} onClose={() => !isPending && setRemoving(null)} onConfirm={remove} icon={<Trash2 />} title={`${t("Remove")} ${removing?.name ?? ""}?`} description={t("Its days and ticks go with it. This can't be undone.")} confirmLabel={t("Remove")} isPending={isPending} />
    </PageFrame>
  );
}
