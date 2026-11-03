"use client";

import { Check, ExternalLink, Flag, Info, MoreVertical, Plus, RotateCcw, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import LoadMore from "@/components/smartly/LoadMore";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { HabitMonthTracker, Reminder } from "@/lib/customer/api";
import {
  type ChallengeMark,
  challengeMark,
  type ChallengeOutcome,
  challengeOutcome,
  type ChallengeSummary,
  challengeSummary,
  challengeWindow,
  type ChallengeWindow,
  COMPLETED_PCT,
  dailyItems,
  DAY_ITEM,
  dayDone,
  MAX_STRIP_DAYS,
  stripTotals,
  successRate,
  ticksTheDay,
} from "@/lib/customer/challengeDisplay";
import { actionError, dayText, shiftDay } from "@/lib/customer/habitDisplay";
import { deleteChallengeAction, endChallengeAction, restartChallengeAction, setChallengeDayAction } from "@/lib/customer/habitsActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { useReminderBook } from "../Reminders";
import { CHECK_FOCUS, CloseButton } from "../Tracker/PanelParts";
import { withCheck } from "../trackerChecks";
import { ChallengeTile } from "./ChallengeTile";
import { NewChallengeDialog } from "./NewChallengeDialog";

interface ChallengesHomePageClientProps {
  trackers: HabitMonthTracker[];
  today: string;
  // ?new=1: opened from "Start a challenge", so the new-challenge dialog is up.
  openNew?: boolean;
  // Saved reminders, for a new challenge's; null when they couldn't be read.
  reminders: Reminder[] | null;
}

type Tab = "going" | "completed" | "notCompleted" | "all";
type Row = { tracker: HabitMonthTracker; window: ChallengeWindow; summary: ChallengeSummary; outcome: ChallengeOutcome };
type Confirm = { kind: "end" | "restart" | "remove"; row: Row } | null;

const NOTICE_KEY = "smartly.challenges.renamed";
const NOTICE_EVENT = "smartly:challenges-notice";
// The board's list and day panel side by side; narrower, the panel opens
// over the list.
const SIDE_PANEL = "(min-width: 1280px)";
const STEP = 20;
const TAG: Record<ChallengeOutcome, { label: string; tone: string }> = {
  going: { label: "Going now", tone: "bg-mint-50 text-brand-ink" },
  completed: { label: "Completed", tone: "bg-income-soft text-income" },
  notCompleted: { label: "Not completed", tone: "bg-expense-soft text-expense" },
};
// A day on a card's strip, and on the panel's grid.
const STRIP: Record<ChallengeMark, string> = {
  done: "bg-emerald",
  missed: "bg-expense-fill/55",
  today: "bg-surface ring-[1.5px] ring-emerald ring-inset",
  later: "bg-line",
  notReached: "bg-surface-sunken",
};
const GRID: Record<ChallengeMark, string> = {
  done: "bg-emerald text-on-action",
  missed: "bg-expense-soft text-expense",
  today: "border-[1.5px] border-dashed border-emerald bg-surface text-emerald",
  later: "border border-line bg-surface text-ink-faint",
  notReached: "bg-surface-sunken text-ink-faint/60",
};
const MARK_WORD: Record<ChallengeMark, string> = { done: "done", missed: "missed", today: "today, not ticked yet", later: "still to come", notReached: "not reached" };
const EMPTY: Record<Tab, string> = {
  going: "No challenge going now. Start one with New challenge.",
  completed: "Nothing completed yet.",
  notCompleted: "Nothing here. Every finished challenge was completed.",
  all: "No challenges yet.",
};

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

// Habits › Challenges (the ChallengesHome board; what "Others" was): how
// many were taken, are going, completed and not, as tiles that filter the
// list; every challenge as a card with its days in a strip and today's tick;
// and the one picked, day by day, to fix a past day, restart, end early or
// try again.
export function ChallengesHomePageClient({ trackers: serverTrackers, today, openNew = false, reminders: savedReminders }: ChallengesHomePageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery(SIDE_PANEL);
  const reminders = useReminderBook(savedReminders);
  const notice = useSyncExternalStore(subscribeNotice, readNotice, () => false);
  const [dialog, setDialog] = useState<{ open: boolean; days: number | null; name: string }>({ open: openNew, days: null, name: "" });
  const [tab, setTab] = useState<Tab>("going");
  const [picked, setPicked] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shown, setShown] = useState(STEP);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [, startTick] = useTransition();
  // A tick shows at once; the server's copy replaces it when it lands.
  const [trackers, applyTick] = useOptimistic(serverTrackers, (current, update: { id: string; day: number; items: string[]; checked: boolean }) =>
    current.map((tracker) => (tracker.id === update.id ? update.items.reduce((sheet, item) => withCheck(sheet, update.day, item, update.checked), tracker) : tracker)),
  );
  const count = (n: number) => formatCount(n, fmt);
  const short = (day: string) => dayText(day, fmt, "dayMonth");

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

  const rows: Row[] = trackers.map((tracker) => {
    const window = challengeWindow(tracker, today);
    return { tracker, window, summary: challengeSummary(tracker, window), outcome: challengeOutcome(tracker, window) };
  });
  const of = (outcome: ChallengeOutcome) => rows.filter((row) => row.outcome === outcome);
  const going = of("going");
  const completed = of("completed");
  const notCompleted = of("notCompleted");
  const finished = completed.length + notCompleted.length;
  const rate = finished > 0 ? Math.round((completed.length / finished) * 100) : null;
  const daysDone = rows.reduce((sum, row) => sum + row.summary.done, 0);
  // Going ones first on All.
  const list = tab === "all" ? [...going, ...completed, ...notCompleted].sort((a, b) => Number(b.outcome === "going") - Number(a.outcome === "going")) : tab === "going" ? going : tab === "completed" ? completed : notCompleted;
  const visible = list.slice(0, shown);
  const selected = list.find((row) => row.tracker.id === picked) ?? list[0] ?? null;

  const stats: { key: Tab | null; label: string; value: string; sub: string; dot: string }[] = [
    { key: "all", label: t("All taken"), value: count(rows.length), sub: t(daysDone === 1 ? "{count} day done in total" : "{count} days done in total", { count: count(daysDone) }), dot: "bg-ink-muted" },
    { key: "going", label: t("Going now"), value: count(going.length), sub: t("Tick today to keep going"), dot: "bg-emerald" },
    { key: "completed", label: t("Completed"), value: count(completed.length), sub: rate === null ? "—" : t("{pct}% of finished ones", { pct: count(rate) }), dot: "bg-income" },
    { key: "notCompleted", label: t("Not completed"), value: count(notCompleted.length), sub: t("Ended early or under {pct}%", { pct: count(COMPLETED_PCT) }), dot: "bg-expense-fill" },
    { key: null, label: t("Success rate"), value: rate === null ? "—" : `${count(rate)}%`, sub: t("{done} of {total} finished", { done: count(completed.length), total: count(finished) }), dot: "bg-warning-fill" },
  ];

  function pickTab(next: Tab) {
    setTab(next);
    setShown(STEP);
  }

  function select(row: Row) {
    setPicked(row.tracker.id);
    if (!wide) setSheetOpen(true);
  }

  // Ticks a day's items (all of them, or one) on or off.
  function tick(row: Row, day: number, items: string[], checked: boolean) {
    const key = `${row.tracker.id}:${day}`;
    if (busy.has(key)) return;
    setBusy((prev) => new Set(prev).add(key));
    startTick(async () => {
      applyTick({ id: row.tracker.id, day, items, checked });
      const result = await setChallengeDayAction(row.tracker.id, { day, items, checked, addDayItem: row.tracker.items.length === 0 });
      if (result.success) {
        router.refresh();
        if (checked && day === row.window.today && items.length === dailyItems(row.tracker).length) toast.success(t("{name}: day {day} done", { name: row.tracker.name ?? t("Challenge"), day: count(day) }));
      } else {
        toast.error(actionError(result.message, "Failed to update", t, fmt));
      }
      setBusy((prev) => {
        const rest = new Set(prev);
        rest.delete(key);
        return rest;
      });
    });
  }

  function runConfirm() {
    if (!confirm) return;
    const { kind, row } = confirm;
    const name = row.tracker.name ?? t("Challenge");
    startTransition(async () => {
      const result = kind === "end" ? await endChallengeAction(row.tracker.id) : kind === "restart" ? await restartChallengeAction(row.tracker.id) : await deleteChallengeAction(row.tracker.id);
      if (!result.success) {
        toast.error(actionError(result.message, kind === "end" ? "Failed to end the challenge" : kind === "restart" ? "Failed to restart the challenge" : "Failed to remove challenge", t, fmt));
        return;
      }
      setConfirm(null);
      if (kind === "end") {
        toast.success(t("{name} ended. It moves to Not completed.", { name }));
        setTab("notCompleted");
      } else if (kind === "restart") {
        toast.success(t("{name} restarted from day 1 today.", { name }));
      } else {
        toast.success(t("Challenge removed"));
      }
      router.refresh();
    });
  }

  const dateRange = (row: Row, withYear = false) => t("{from} to {to}", { from: short(row.window.start), to: withYear ? dayText(row.window.end, fmt, "dayMonthYear") : short(row.window.end) });

  const card = (row: Row) => {
    const { tracker, window, summary, outcome } = row;
    const name = tracker.name ?? t("Challenge");
    const on = selected?.tracker.id === tracker.id;
    const upcoming = window.status === "upcoming";
    const todayDone = window.status === "going" && dayDone(tracker, window.today);
    const long = tracker.totalDays > MAX_STRIP_DAYS;
    const totals = long ? stripTotals(tracker, window) : null;
    const left = upcoming ? tracker.totalDays : window.ended ? tracker.totalDays - window.lastDay : window.status === "going" ? tracker.totalDays - window.today : 0;
    const tag = upcoming ? { label: "Starts tomorrow", tone: "bg-surface-sunken text-ink-soft" } : TAG[outcome];
    const dates = [t(tracker.totalDays === 1 ? "{count} day" : "{count} days", { count: count(tracker.totalDays) }), dateRange(row), window.ended ? t("ended on day {day}", { day: count(window.lastDay) }) : null].filter(Boolean).join(" · ");
    return (
      <div key={tracker.id} className={cn("relative grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2.5 rounded-md border-[1.5px] px-4 py-3.5 transition-colors", on && (wide || sheetOpen) ? "border-emerald bg-mint-50/40" : "border-line bg-surface hover:border-line-strong")}>
        <ChallengeTile name={tracker.name} size={44} />
        <span className="flex min-w-0 flex-col gap-0.75">
          <span className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => select(row)}
              aria-pressed={wide ? on : undefined}
              aria-haspopup={wide ? undefined : "dialog"}
              className="min-w-0 truncate text-left text-[15px] font-semibold text-ink after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-focus-ring"
            >
              {name}
            </button>
            <span className={cn("inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-bold", tag.tone)}>{t(tag.label)}</span>
          </span>
          <span className="truncate text-[12.5px] text-ink-muted">{dates}</span>
        </span>
        {window.status === "going" ? (
          <button
            type="button"
            onClick={() => tick(row, window.today, dailyItems(tracker), !todayDone)}
            disabled={busy.has(`${tracker.id}:${window.today}`)}
            aria-pressed={todayDone}
            aria-label={todayDone ? t("{name}: done today. Tap to undo", { name }) : t("Tick today for {name}", { name })}
            className={cn("relative z-10 flex h-10 items-center gap-1.75 rounded-full border-[1.5px] border-emerald px-3.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors disabled:opacity-70 max-sm:px-2.5 pointer-coarse:h-11", todayDone ? "bg-emerald text-on-action" : "bg-surface text-emerald hover:bg-mint-50")}
          >
            <Check className="size-3.75" strokeWidth={3} aria-hidden="true" />
            <span className="max-sm:sr-only">{t(todayDone ? "Done today" : "Tick today")}</span>
          </button>
        ) : upcoming ? (
          <span className="text-[12.5px] font-semibold text-ink-soft">{short(window.start)}</span>
        ) : (
          <span className={cn("text-[20px] font-bold tabular-nums", outcome === "completed" ? "text-income" : "text-expense")}>{count(summary.pct)}%</span>
        )}
        <span className="col-span-full flex min-w-0 flex-col gap-1.5 sm:col-start-2">
          {totals ? (
            // Too many days for a segment each: done, missed and still to come.
            <span role="img" aria-label={t("{name}: {done} days done, {missed} missed, {left} still to come", { name, done: count(totals.done), missed: count(totals.missed), left: count(totals.toCome) })} className="flex h-2.5 overflow-hidden rounded-[3px] bg-line">
              <span className="bg-emerald" style={{ width: `${(totals.done / tracker.totalDays) * 100}%` }} />
              <span className="bg-expense-fill/55" style={{ width: `${(totals.missed / tracker.totalDays) * 100}%` }} />
            </span>
          ) : (
            <span role="img" aria-label={t("{name} day by day", { name })} className="flex h-2.5 min-w-0 gap-0.5">
              {Array.from({ length: tracker.totalDays }, (_, i) => i + 1).map((day) => {
                const mark = challengeMark(tracker, window, day);
                return <span key={day} title={`${t("Day {day}", { day: count(day) })} · ${short(shiftDay(window.start, day - 1))}: ${t(MARK_WORD[mark])}`} className={cn("min-w-0 flex-1 rounded-[2px]", STRIP[mark])} />;
              })}
            </span>
          )}
          <span className="flex flex-wrap gap-x-3.5 gap-y-0.5 text-[12.5px] text-ink-2">
            <span>
              <b className="font-bold text-income tabular-nums">{count(summary.done)}</b> {t("done@@days")}
            </span>
            <span>
              <b className="font-bold text-expense tabular-nums">{count(summary.missed)}</b> {t("missed@@days")}
            </span>
            <span>
              <b className="font-bold text-ink tabular-nums">{count(left)}</b> {t(window.status === "finished" ? "days not reached" : "days left")}
            </span>
            <span className="ml-auto text-ink-muted">{window.status === "finished" ? t("{done} of {total} days", { done: count(summary.done), total: count(tracker.totalDays) }) : upcoming ? t("Starts {date}", { date: short(window.start) }) : t("Day {day} of {total}", { day: count(window.today), total: count(tracker.totalDays) })}</span>
          </span>
        </span>
      </div>
    );
  };

  const panel = (row: Row | null, inSheet: boolean) => {
    if (!row) return <p className="m-auto py-10 text-center text-body text-ink-muted">{t("Pick a challenge to see every day.")}</p>;
    const { tracker, window, summary, outcome } = row;
    const name = tracker.name ?? t("Challenge");
    const going = window.status === "going";
    const upcoming = window.status === "upcoming";
    const circumference = 2 * Math.PI * 29;
    const fill = upcoming ? 0 : going ? window.today / tracker.totalDays : summary.pct / 100;
    const ringTone = going || upcoming ? "stroke-emerald" : outcome === "completed" ? "stroke-income" : "stroke-expense-fill";
    const message = upcoming
      ? t("Starts tomorrow, {date}", { date: short(window.start) })
      : going
        ? t(window.daysLeft === 1 ? "{count} day to go · ends {date}" : "{count} days to go · ends {date}", { count: count(window.daysLeft), date: short(window.end) })
        : outcome === "completed"
          ? t("Completed with {pct}% of days done", { pct: count(summary.pct) })
          : window.ended
            ? t("Ended early on day {day}", { day: count(window.lastDay) })
            : t("Finished under {limit}% ({pct}%)", { limit: count(COMPLETED_PCT), pct: count(summary.pct) });
    const facts = [
      { label: t("Done"), value: count(summary.done), tone: "text-income" },
      { label: t("Missed"), value: count(summary.missed), tone: "text-expense" },
      { label: going ? t("Streak now") : t("Best run"), value: count(going ? summary.streak : summary.best), tone: "text-ink" },
      { label: t("Success"), value: `${count(successRate(summary))}%`, tone: "text-ink" },
    ];
    const items = dailyItems(tracker);
    return (
      <div className={cn("flex min-w-0 flex-col gap-3", inSheet && "px-4 pt-1 pb-5")}>
        <div className="flex items-center gap-3">
          <span role="img" aria-label={going ? t("Day {day} of {total}", { day: count(window.today), total: count(tracker.totalDays) }) : t("{pct}% done", { pct: count(summary.pct) })} className="relative size-17.5 shrink-0">
            <svg viewBox="0 0 70 70" className="size-17.5 -rotate-90">
              <circle cx="35" cy="35" r="29" className="fill-none stroke-surface-sunken" strokeWidth="7" />
              {/* None yet draws no arc (a round cap would leave a dot). */}
              {fill > 0 && <circle cx="35" cy="35" r="29" className={cn("fill-none", ringTone)} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${fill * circumference} ${circumference}`} />}
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[15px] leading-tight font-bold text-ink tabular-nums">{upcoming ? count(tracker.totalDays) : going ? t("Day {day}", { day: count(window.today) }) : `${count(summary.pct)}%`}</span>
              <span className="text-[10px] text-ink-muted">{upcoming ? t("days") : going ? t("of {total}", { total: count(tracker.totalDays) }) : t("done")}</span>
            </span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="truncate text-[17px] font-semibold text-ink">{name}</h2>
            <span className="text-[12.5px] text-ink-muted">{[t(tracker.totalDays === 1 ? "{count} day" : "{count} days", { count: count(tracker.totalDays) }), dateRange(row, true)].join(" · ")}</span>
            <span className={cn("text-[12.5px] font-semibold", going || upcoming ? "text-emerald" : outcome === "completed" ? "text-income" : "text-expense")}>{message}</span>
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={t("More for {name}", { name })} className="flex size-8 shrink-0 items-center justify-center self-start rounded-sm text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
              <MoreVertical className="size-4.5" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-md border border-line bg-surface p-1 shadow-overlay ring-0">
              <DropdownMenuItem asChild className="rounded-sm px-3 py-2 text-body text-ink focus:bg-surface-sunken pointer-coarse:min-h-11">
                <Link href={`/habit-tracker/habits/others/${tracker.id}`}>
                  <ExternalLink className="size-4" aria-hidden="true" />
                  {t("Rows and reminder")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setConfirm({ kind: "remove", row })} className="rounded-sm px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense pointer-coarse:min-h-11">
                <Trash2 className="size-4" aria-hidden="true" />
                {t("Remove")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {facts.map((fact) => (
            <div key={fact.label} className="flex min-w-0 flex-col items-center gap-px rounded-field bg-strip px-1.5 py-2">
              <span className={cn("text-[17px] font-bold tabular-nums", fact.tone)}>{fact.value}</span>
              <span className="truncate text-[11px] text-ink-muted">{fact.label}</span>
            </div>
          ))}
        </div>

        {/* A challenge with rows of its own: today's, one by one. */}
        {going && !ticksTheDay(tracker) && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13.5px] font-semibold text-ink">{t("Today · day {day}", { day: count(window.today) })}</span>
            {items.map((item) => {
              const checked = tracker.checks.some((c) => c.day === window.today && c.item === item);
              return (
                <label key={item} className={cn("flex min-h-9.5 cursor-pointer items-center gap-2.5 rounded-[9px] border px-3 py-1.5 transition-colors pointer-coarse:min-h-11", CHECK_FOCUS, checked ? "border-emerald-line bg-mint-50" : "border-line bg-surface hover:border-line-strong")}>
                  <input type="checkbox" checked={checked} disabled={busy.has(`${tracker.id}:${window.today}`)} onChange={() => tick(row, window.today, [item], !checked)} className="sr-only" />
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-[6px]", checked ? "bg-emerald text-on-action" : "border-[1.5px] border-line-strong bg-surface")}>{checked && <Check className="size-3.25" strokeWidth={3.5} aria-hidden="true" />}</span>
                  <span className="min-w-0 flex-1 text-body font-medium wrap-break-word text-ink">{item === DAY_ITEM ? t("Done for today") : item}</span>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-[13.5px] font-semibold text-ink">{t("Every day")}</span>
          {!upcoming && <span className="text-[11.5px] text-ink-muted">{t("Tap a past day to change it")}</span>}
        </div>
        <div role="group" aria-label={t("Days of {name}", { name })} className="grid grid-cols-10 gap-1">
          {Array.from({ length: tracker.totalDays }, (_, i) => i + 1).map((day) => {
            const mark = challengeMark(tracker, window, day);
            const can = mark === "done" || mark === "missed" || mark === "today";
            const label = `${t("Day {day}", { day: count(day) })} · ${short(shiftDay(window.start, day - 1))}: ${t(MARK_WORD[mark])}`;
            return (
              <button
                key={day}
                type="button"
                disabled={!can || busy.has(`${tracker.id}:${day}`)}
                onClick={() => tick(row, day, items, mark !== "done")}
                title={label}
                aria-label={label}
                aria-pressed={can ? mark === "done" : undefined}
                className={cn("h-7 rounded-[6px] text-[11px] font-bold tabular-nums transition-opacity disabled:cursor-default pointer-coarse:h-9", GRID[mark], can && "hover:opacity-85")}
              >
                {count(day)}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-ink-muted">
          {(window.ended ? (["done", "missed", "notReached"] as const) : (["done", "missed", "later"] as const)).map((mark) => (
            <span key={mark} className="flex items-center gap-1.25">
              <span aria-hidden="true" className={cn("size-2.75 rounded-[3px]", mark === "later" ? "border border-line-strong bg-surface" : mark === "notReached" ? "bg-surface-sunken" : GRID[mark])} />
              {t(MARK_WORD[mark])}
            </span>
          ))}
        </div>

        <div className="mt-auto flex gap-2 pt-1">
          {going && (
            <>
              <Button variant="secondary" onClick={() => setConfirm({ kind: "restart", row })} className="h-9.5 flex-1 rounded-sm pointer-coarse:h-11">
                {t("Restart")}
              </Button>
              <Button variant="secondary" onClick={() => setConfirm({ kind: "end", row })} className="h-9.5 flex-1 rounded-sm border-expense-line bg-expense-soft text-expense hover:bg-expense-soft/70 pointer-coarse:h-11">
                {t("End challenge")}
              </Button>
            </>
          )}
          {window.status === "finished" && (
            <Button onClick={() => setDialog({ open: true, days: tracker.totalDays, name: tracker.name ?? "" })} className="h-9.5 flex-1 rounded-sm pointer-coarse:h-11">
              {t("Try it again")}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <PageFrame className="gap-3.5 md:pt-6">
      <PageHeader
        title={t("Challenges")}
        description={t("Pick a goal for a set number of days and tick it off every day.")}
        actions={
          <Button onClick={() => setDialog({ open: true, days: null, name: "" })} className="rounded-sm">
            <Plus strokeWidth={2.25} />
            {t("New challenge")}
          </Button>
        }
      />

      {notice && (
        // Its own box, not the shared Banner: the board draws it as a plain slate strip.
        <div role="note" className="flex items-center gap-2.5 rounded-field bg-surface-sunken px-3.5 py-2.5 text-[13.5px] text-ink-2">
          <Info className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <b className="font-semibold text-ink">{t("\"Others\" is now called Challenges.")}</b> {t("Everything you made there is here.")}
          </span>
          <button type="button" onClick={dismiss} aria-label={t("Dismiss")} className="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-ink-muted hover:bg-surface hover:text-ink pointer-coarse:size-11">
            <X className="size-3.75" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => {
          const on = stat.key !== null && stat.key === tab;
          const body = (
            <>
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted">
                <span aria-hidden="true" className={cn("size-2 rounded-full", stat.dot)} />
                {stat.label}
              </span>
              <span className="text-[24px] leading-tight font-bold text-ink tabular-nums">{stat.value}</span>
              <span className="truncate text-caption text-ink-muted">{stat.sub}</span>
            </>
          );
          const look = cn("flex min-w-0 flex-col gap-0.5 rounded-md border-[1.5px] px-4 py-2.75 text-left shadow-card", on ? "border-emerald bg-mint-50/60" : "border-line bg-surface");
          return stat.key ? (
            <button key={stat.label} type="button" aria-pressed={on} onClick={() => pickTab(stat.key as Tab)} className={cn(look, !on && "hover:border-line-strong")}>
              {body}
            </button>
          ) : (
            <div key={stat.label} className={look}>
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card padding="none" className="flex min-w-0 flex-col gap-3 rounded-[14px] px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-ink">{t("Your challenges")}</h2>
            <SegmentedControl
              label={t("Show")}
              variant="pill"
              value={tab}
              onChange={pickTab}
              options={[
                { value: "going", label: `${t("Going now")} · ${count(going.length)}` },
                { value: "completed", label: `${t("Completed")} · ${count(completed.length)}` },
                { value: "notCompleted", label: `${t("Not completed")} · ${count(notCompleted.length)}` },
                { value: "all", label: `${t("All")} · ${count(rows.length)}` },
              ]}
            />
          </div>
          {list.length === 0 ? (
            <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-body text-ink-muted">{t(EMPTY[tab])}</p>
          ) : (
            <div className="flex flex-col gap-2.5">{visible.map(card)}</div>
          )}
          {list.length > STEP && <LoadMore shown={Math.min(shown, list.length)} total={list.length} step={STEP} onMore={() => setShown((value) => value + STEP)} onLess={shown >= list.length ? () => setShown(STEP) : undefined} />}
          <span className="text-caption text-ink-muted">{t("Completed means you reached the last day with at least {pct}% of the days done.", { pct: count(COMPLETED_PCT) })}</span>
        </Card>

        <Card padding="none" className="flex min-h-80 min-w-0 flex-col rounded-[14px] px-4.5 py-4 max-xl:hidden xl:sticky xl:top-20">
          {panel(selected, false)}
        </Card>
      </div>

      {/* Narrower than the board, the challenge's days open over the list. */}
      <Sheet open={sheetOpen && !wide && selected !== null} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-xl border-0 bg-surface p-0 text-ink">
          <div className="mx-auto flex w-full max-w-xl flex-col">
            <SheetHeader className="flex-row items-center justify-between space-y-0 px-4 pt-3">
              <SheetTitle className="text-small font-semibold text-ink-muted">{t("Every day")}</SheetTitle>
              <CloseButton onClick={() => setSheetOpen(false)} label={t("Close")} />
            </SheetHeader>
            {panel(selected, true)}
          </div>
        </SheetContent>
      </Sheet>

      <NewChallengeDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, days: null, name: "" })}
        presetDays={dialog.days}
        presetName={dialog.name}
        today={today}
        reminders={reminders}
        onCreated={(id) => {
          setTab("going");
          setPicked(id);
        }}
      />
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => !isPending && setConfirm(null)}
        onConfirm={runConfirm}
        isPending={isPending}
        icon={confirm?.kind === "end" ? <Flag /> : confirm?.kind === "restart" ? <RotateCcw /> : <Trash2 />}
        danger={confirm?.kind !== "restart"}
        title={
          confirm?.kind === "end"
            ? t("End {name}?", { name: confirm.row.tracker.name ?? t("Challenge") })
            : confirm?.kind === "restart"
              ? t("Restart {name}?", { name: confirm.row.tracker.name ?? t("Challenge") })
              : t("Remove {name}?", { name: confirm?.row.tracker.name ?? t("Challenge") })
        }
        description={
          confirm?.kind === "end"
            ? t(confirm.row.summary.done === 1 ? "It moves to Not completed with {count} day done. You can try it again any time." : "It moves to Not completed with {count} days done. You can try it again any time.", { count: count(confirm.row.summary.done) })
            : confirm?.kind === "restart"
              ? t("Day 1 becomes today and its ticks are cleared.")
              : t("Its days and ticks go with it. This can't be undone.")
        }
        confirmLabel={confirm?.kind === "end" ? t("End challenge") : confirm?.kind === "restart" ? t("Restart") : t("Remove")}
        cancelLabel={confirm?.kind === "end" ? t("Keep going") : undefined}
      />
    </PageFrame>
  );
}
