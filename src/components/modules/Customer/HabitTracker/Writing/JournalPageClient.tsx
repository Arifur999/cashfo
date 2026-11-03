"use client";

import { ChevronLeft, ChevronRight, Lock, NotebookPen, Search, StickyNote, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { JournalEntry, JournalMonth, LockedJournalEntry, NoteCategory } from "@/lib/customer/api";
import { getJournalMonthAction, lockDiaryAction, searchJournalAction } from "@/lib/customer/writingActions";
import { calendarCells, daysSoFar, entrySnippet, isOpenEntry, moodCounts, MOODS, shiftMonth, usualMood } from "@/lib/customer/writingDisplay";
import { formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { weekStartOf } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { DiaryLock } from "./DiaryLock";
import { DiaryPinDialog } from "./DiaryPinDialog";
import { JournalEditor } from "./JournalEditor";

interface JournalPageClientProps {
  data: JournalMonth;
  categories: NoteCategory[];
  // The day the page opens on (?date=, else today), and its entry.
  date: string;
  entry: JournalEntry | LockedJournalEntry | null;
}

const WEEKDAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type DayEntry = JournalEntry | LockedJournalEntry | null;

// Habit Tracker › Notes & Journal › Journal (the JournalHome board): the
// month's figures, a calendar of moods, the mood chart and the day's entry.
// A private day stays behind the diary PIN until it is entered on this
// sign-in; search reads the private days only then.
export function JournalPageClient({ data: initialData, categories, date: initialDate, entry: initialEntry }: JournalPageClientProps) {
  const { t, fmt } = useLocale();
  const [data, setData] = useState(initialData);
  const [selected, setSelected] = useState<{ date: string; entry: DayEntry }>({ date: initialDate, entry: initialEntry });
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ query: string; entries: JournalEntry[]; unlocked: boolean } | null>(null);
  const [pinDialog, setPinDialog] = useState<null | "set" | "change">(null);
  // What to do once a new PIN is set (turn the entry being written private).
  const [afterPin, setAfterPin] = useState<(() => void) | null>(null);
  const [isLoading, startLoading] = useTransition();
  const count = (n: number) => formatCount(n, fmt);
  const today = data.today;

  // The address names the month and day shown, so a reload or a shared
  // link opens the same page.
  useEffect(() => {
    const url = `/habit-tracker/journal?date=${selected.date}${data.month === selected.date.slice(0, 7) ? "" : `&month=${data.month}`}`;
    window.history.replaceState(window.history.state, "", url);
  }, [selected.date, data.month]);

  const load = (month: string, then?: (next: JournalMonth) => void) =>
    startLoading(async () => {
      const result = await getJournalMonthAction(month);
      if (!result.success || !result.data) {
        toast.error(t(result.message ?? "Failed to load the journal"));
        return;
      }
      const next = result.data;
      setData(next);
      then?.(next);
    });

  // The diary opened or closed: read the month again, and the open day with it.
  const reload = () =>
    load(data.month, (next) => {
      const fresh = next.entries.find((entry) => entry.date === selected.date);
      if (fresh || selected.date.slice(0, 7) === next.month) setSelected({ date: selected.date, entry: fresh ?? null });
      else load(selected.date.slice(0, 7), (other) => setSelected({ date: selected.date, entry: other.entries.find((entry) => entry.date === selected.date) ?? null }));
    });

  // Search, a moment after typing stops.
  const term = query.trim();
  useEffect(() => {
    if (!term) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchJournalAction(term).then((result) => {
        if (!cancelled) setHits({ query: term, entries: result.success && result.data ? result.data.entries : [], unlocked: !!result.data?.unlocked });
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);
  const searching = !!term;
  const shownHits = hits && hits.query === term ? hits : null;

  const pickDay = (date: string, entry: DayEntry) => {
    if (date > today) return;
    setSelected({ date, entry });
    setQuery("");
  };

  const openHit = (entry: JournalEntry) => {
    setQuery("");
    if (entry.date.slice(0, 7) !== data.month) load(entry.date.slice(0, 7));
    setSelected({ date: entry.date, entry });
  };

  // A saved entry: into the month when it is the one shown, and the day.
  const saved = (entry: JournalEntry) => {
    setSelected({ date: entry.date, entry });
    setData((current) => {
      if (current.month !== entry.date.slice(0, 7)) return current;
      const had = current.entries.some((row) => row.date === entry.date);
      const entries = had ? current.entries.map((row) => (row.date === entry.date ? entry : row)) : [...current.entries, entry].sort((a, b) => a.date.localeCompare(b.date));
      const wroteToday = entry.date === current.today && !had;
      return { ...current, entries, total: current.total + (had ? 0 : 1), streak: wroteToday ? current.streak + 1 : current.streak };
    });
  };

  const lockDiary = () =>
    startLoading(async () => {
      await lockDiaryAction();
      toast.success(t("Diary locked"));
      reload();
    });

  const moods = useMemo(() => moodCounts(data.entries), [data.entries]);
  const usual = usualMood(data.entries);
  const most = Math.max(1, ...moods);
  const monthShort = formatDay(`${data.month}-01`, "MMM", fmt);
  const written = data.entries.length;
  const kpis = [
    { emoji: "📅", label: t("Written in {month}", { month: monthShort }), value: t("{count} of {total} days", { count: count(written), total: count(daysSoFar(data.month, today)) }) },
    { emoji: "🔥", label: t("Writing streak"), value: t(data.streak === 1 ? "{count} day" : "{count} days", { count: count(data.streak) }) },
    { emoji: usual === null ? "🙂" : MOODS[usual].emoji, label: t("Usual mood"), value: usual === null ? "—" : t(MOODS[usual].label) },
    { emoji: "📔", label: t("All entries"), value: count(data.total) },
  ];

  const weekStart = weekStartOf(fmt);
  const order = Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
  const cells = calendarCells(data.month, weekStart);
  const entryOn = new Map(data.entries.map((entry) => [entry.date, entry]));
  const atLatest = data.month >= today.slice(0, 7);
  const lockedDay = selected.entry?.locked === true;

  return (
    <PageFrame className="gap-3.5 md:pt-7">
      <PageHeader
        title={t("Journal")}
        description={t("A few lines a day. Your diary stays private.")}
        actions={
          <>
            <Input
              type="search"
              size="sm"
              value={query}
              onChange={(event) => setQuery(event.target.value.slice(0, 80))}
              placeholder={t("Search journal and #tags")}
              aria-label={t("Search journal")}
              leading={<Search className="size-4 text-ink-muted" strokeWidth={2} aria-hidden="true" />}
              frameClassName="w-full rounded-sm md:w-65"
            />
            <Button variant="secondary" className="h-9.5 rounded-sm" asChild>
              <Link href="/habit-tracker/notes">
                <StickyNote strokeWidth={2} />
                {t("Notes")}
              </Link>
            </Button>
            {data.pinSet && data.unlocked && (
              <Button variant="secondary" className="h-9.5 rounded-sm" onClick={lockDiary} disabled={isLoading}>
                <Lock strokeWidth={2} />
                {t("Lock diary")}
              </Button>
            )}
            <Button
              className="h-9.5 rounded-sm"
              onClick={() => {
                if (data.month !== today.slice(0, 7)) load(today.slice(0, 7), (next) => setSelected({ date: today, entry: next.entries.find((entry) => entry.date === today) ?? null }));
                else pickDay(today, entryOn.get(today) ?? null);
              }}
            >
              <NotebookPen strokeWidth={2} />
              {t("Write today")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} padding="none" className="flex items-center gap-3 rounded-[12px] px-4 py-2.5">
            <span aria-hidden="true" className="text-[24px]">
              {kpi.emoji}
            </span>
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-[12.5px] text-ink-muted">{kpi.label}</span>
              <span className="text-[19px] font-bold text-ink tabular-nums">{kpi.value}</span>
            </span>
          </Card>
        ))}
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[330px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <Card padding="none" className={cn("flex flex-col gap-2 rounded-[14px] px-3.5 py-3", isLoading && "opacity-70")} aria-busy={isLoading}>
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => load(shiftMonth(data.month, -1))} aria-label={t("Previous month")} className="flex size-8 items-center justify-center rounded-[7px] text-ink-soft hover:bg-surface-sunken">
                <ChevronLeft className="size-4.5" strokeWidth={2} aria-hidden="true" />
              </button>
              <h2 className="text-[14.5px] font-semibold text-ink">{formatDay(`${data.month}-01`, "MMMM yyyy", fmt)}</h2>
              <button
                type="button"
                onClick={() => load(shiftMonth(data.month, 1))}
                disabled={atLatest}
                aria-label={t("Next month")}
                className="flex size-8 items-center justify-center rounded-[7px] text-ink-soft hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-35"
              >
                <ChevronRight className="size-4.5" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.75 text-center text-[10.5px] text-ink-muted" aria-hidden="true">
              {order.map((day) => (
                <span key={day}>{t(WEEKDAY_SHORT[day])}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.75">
              {cells.map((day, index) => {
                if (!day) return <span key={`blank-${index}`} />;
                const entry = entryOn.get(day);
                const future = day > today;
                const on = day === selected.date;
                const mood = entry ? (entry.locked ? "🔒" : MOODS[entry.mood]?.emoji) : "";
                const label = `${formatDay(day, "d MMMM", fmt)} · ${entry ? (entry.locked ? t("Private") : t(MOODS[entry.mood]?.label ?? "")) : t("nothing written")}`;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pickDay(day, entry ?? null)}
                    disabled={future}
                    aria-label={label}
                    aria-pressed={on}
                    title={label}
                    className={cn(
                      "flex h-9 flex-col items-center justify-center rounded-sm border transition-colors disabled:cursor-not-allowed",
                      on ? "border-[1.5px] border-emerald bg-emerald-soft" : day === today ? "border-[1.5px] border-dashed border-emerald" : "border-divider",
                      !on && (entry ? "bg-surface hover:border-line-strong" : "bg-strip hover:border-line-strong"),
                    )}
                  >
                    <span className={cn("text-[11.5px] leading-none font-semibold tabular-nums", future ? "text-ink-faint" : "text-ink")}>{formatCount(Number(day.slice(8)), fmt)}</span>
                    <span aria-hidden="true" className="h-3 text-[12px] leading-none">
                      {mood}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card padding="none" className="flex flex-col gap-2 rounded-[14px] px-3.5 py-3">
            <h2 className="text-[14.5px] font-semibold text-ink">{t("Mood in {month}", { month: formatDay(`${data.month}-01`, "MMMM", fmt) })}</h2>
            <div className="flex h-37.5 items-end gap-2.5" role="img" aria-label={MOODS.map((mood, i) => `${t(mood.label)}: ${count(moods[i])}`).join(", ")}>
              {MOODS.map((mood, i) => (
                <span key={mood.label} title={t("{mood}: {count} days", { mood: t(mood.label), count: count(moods[i]) })} className="flex h-full flex-1 flex-col items-center justify-end gap-0.75">
                  <span className="text-[11px] font-bold text-ink-soft tabular-nums">{moods[i] ? count(moods[i]) : ""}</span>
                  <span className={cn("w-full max-w-8.5 rounded-t-[6px]", mood.barClass)} style={{ height: `${Math.max(3, Math.round((moods[i] / most) * 80))}%` }} />
                  <span aria-hidden="true" className="text-[16px]">
                    {mood.emoji}
                  </span>
                </span>
              ))}
            </div>
          </Card>
        </div>

        <Card padding="none" className="flex min-h-120 flex-col gap-3 rounded-[14px] px-5 py-4" aria-label={t("Entry")} role="region">
          {searching ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[16px] font-semibold text-ink">{shownHits ? t(shownHits.entries.length === 1 ? "{count} entry matches “{query}”" : "{count} entries match “{query}”", { count: count(shownHits.entries.length), query: term }) : t("Searching…")}</h2>
                <button type="button" onClick={() => setQuery("")} className="inline-flex h-7 items-center gap-1 rounded-full border border-line-strong bg-surface px-2.5 text-caption font-semibold text-ink-2 hover:bg-surface-sunken">
                  {t("Clear")}
                  <X className="size-3" strokeWidth={2.5} aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {shownHits?.entries.map((entry) => (
                  <button key={entry.date} type="button" onClick={() => openHit(entry)} className="flex gap-2.5 rounded-field border border-line bg-surface px-3 py-2.5 text-left hover:border-line-strong">
                    <span aria-hidden="true" className="text-[20px]">
                      {MOODS[entry.mood]?.emoji}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <b className="text-[13.5px] text-ink">
                        {formatDay(entry.date, "d MMM yyyy", fmt)} · {t(entry.kind === "DIARY" ? "Diary" : "Daily")}
                      </b>
                      <span className="line-clamp-2 text-small text-ink-soft">{entrySnippet(entry)}</span>
                    </span>
                  </button>
                ))}
                {shownHits && shownHits.entries.length === 0 && (
                  <p className="py-6 text-center text-small text-ink-muted">{t(shownHits.unlocked || !data.pinSet ? "Nothing found." : "Nothing found. Private entries are searched only after you unlock them.")}</p>
                )}
              </div>
            </>
          ) : lockedDay ? (
            <DiaryLock dayLabel={dayTitle(selected.date, today, t, fmt)} onUnlocked={reload} onForgot={() => setPinDialog("change")} />
          ) : (
            <JournalEditor
              key={`${selected.date}:${selected.entry && isOpenEntry(selected.entry) ? selected.entry.updatedAt : "new"}`}
              date={selected.date}
              title={dayTitle(selected.date, today, t, fmt)}
              entry={selected.entry && isOpenEntry(selected.entry) ? selected.entry : null}
              categories={categories}
              pinSet={data.pinSet}
              onSaved={saved}
              onLocked={reload}
              onNeedPin={(then) => {
                setAfterPin(() => then);
                setPinDialog("set");
              }}
              onChangePin={data.pinSet ? () => setPinDialog("change") : undefined}
            />
          )}
        </Card>
      </div>

      <DiaryPinDialog
        mode={pinDialog}
        onClose={() => {
          setPinDialog(null);
          setAfterPin(null);
        }}
        onDone={() => {
          setPinDialog(null);
          afterPin?.();
          setAfterPin(null);
          setData((current) => ({ ...current, pinSet: true, unlocked: true }));
          reload();
        }}
      />
    </PageFrame>
  );
}

// "Today, Friday 2 October" or "Monday 28 September".
function dayTitle(date: string, today: string, t: (key: string, values?: Record<string, string>) => string, fmt: Parameters<typeof formatDay>[2]): string {
  const day = formatDay(date, "EEEE d MMMM", fmt);
  return date === today ? t("Today, {day}", { day }) : day;
}
