"use client";

import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { byWhen, daysFrom, eventStats, type Ledger, monthGrid, paisa, shiftMonth, suggestedOf, tipFor, upcomingEvents } from "@/lib/customer/eventsDisplay";
import type { EventPerson, SocialEvent } from "@/lib/customer/eventsTypes";
import { plural } from "@/lib/i18n/message";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { formatDay } from "@/lib/date";
import { cn } from "@/lib/utils";
import { typeLook } from "./eventVisuals";
import type { EventWords } from "./useEventWords";

interface EventsCalendarProps {
  events: SocialEvent[];
  people: EventPerson[];
  ledger: Map<string, Ledger>;
  today: string;
  words: EventWords;
  readOnly: boolean;
  // The day picked on the grid ("" for none), kept by the page so a new
  // event's day opens picked.
  selectedDay: string;
  onSelectDay: (day: string) => void;
  month: string;
  onMonth: (month: string) => void;
  onOpenEvent: (id: string) => void;
  onAddOn: (day: string) => void;
}

const CARD = "rounded-[20px] border border-line-card bg-surface shadow-card";
const WEEKEND = new Set([5, 6]);

// The Calendar page: three cards, the month (up to two events a day, then
// "+N more"), and beside it what is coming up or the picked day's events.
export function EventsCalendar({ events, people, ledger, today, words, readOnly, selectedDay, onSelectDay, month, onMonth, onOpenEvent, onAddOn }: EventsCalendarProps) {
  const { t, fmt, money, count } = words;
  const stats = eventStats(events, today);
  const [year, monthNumber] = month.split("-").map(Number);
  const cells = monthGrid(year, monthNumber, fmt.weekStart);
  const byDay = new Map<string, SocialEvent[]>();
  for (const event of [...events].sort(byWhen)) {
    byDay.set(event.date, [...(byDay.get(event.date) ?? []), event]);
  }
  const weekdays = cells.slice(0, 7).map((day) => ({ label: words.weekday(day), weekend: WEEKEND.has(new Date(`${day}T00:00:00Z`).getUTCDay()) }));
  const dayEvents = selectedDay ? (byDay.get(selectedDay) ?? []) : null;
  const side = dayEvents ?? upcomingEvents(events, today).slice(0, 5);

  const cards = [
    {
      Icon: CalendarDays,
      tile: "bg-warning-soft text-warning",
      label: t("Coming up in {month}", { month: formatDay(today, "MMMM", fmt) }),
      value: plural(t, stats.comingUp.length, "{count} event", "{count} events", undefined, fmt),
      sub: stats.comingUp.length ? t("Next: {title}", { title: stats.comingUp[0].title }) : "",
    },
    {
      Icon: ArrowUpRight,
      tile: "bg-tint-pink text-tint-pink-ink",
      label: t("You gave in {year}", { year: toLocaleDigits(today.slice(0, 4), fmt) }),
      value: money(stats.gave),
      sub: plural(t, stats.gaveEvents, "at {count} event", "at {count} events", undefined, fmt),
    },
    {
      Icon: ArrowDownLeft,
      tile: "bg-mint-50 text-brand-ink",
      label: t("You received at your events"),
      value: money(stats.received),
      sub: plural(t, stats.receivedCount, "from {count} gift", "from {count} gifts", undefined, fmt),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map(({ Icon, tile, label, value, sub }) => (
          <div key={label} className="flex items-center gap-3 rounded-[16px] border border-line-card bg-surface px-4 py-3.5">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[12px]", tile)}>
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-[12.5px] text-ink-muted">{label}</span>
              <span className="text-[19px] font-bold tracking-[-0.01em] text-ink tabular-nums">{value}</span>
              <span className="truncate text-caption text-ink-muted">{sub}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="cal-month" className={cn(CARD, "flex flex-col overflow-hidden")}>
          <div className="flex items-center gap-2.5 px-4.5 py-4">
            <h2 id="cal-month" className="flex-1 text-[17px] font-semibold text-ink">
              {formatDay(`${month}-01`, "MMMM yyyy", fmt)}
            </h2>
            <button
              type="button"
              onClick={() => {
                onMonth(today.slice(0, 7));
                onSelectDay("");
              }}
              className="h-8.5 rounded-full border border-input bg-surface px-3 text-small font-semibold text-ink hover:bg-surface-sunken"
            >
              {t("Today")}
            </button>
            <button type="button" onClick={() => (onMonth(shiftMonth(month, -1)), onSelectDay(""))} aria-label={t("Previous month")} className="flex size-8.5 items-center justify-center rounded-full border border-input bg-surface text-ink-soft hover:bg-surface-sunken">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => (onMonth(shiftMonth(month, 1)), onSelectDay(""))} aria-label={t("Next month")} className="flex size-8.5 items-center justify-center rounded-full border border-input bg-surface text-ink-soft hover:bg-surface-sunken">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-7 border-t border-line-card bg-table-head">
            {weekdays.map((weekday) => (
              <span key={weekday.label} className={cn("truncate px-2.5 py-2 text-caption font-semibold", weekday.weekend ? "text-warning" : "text-ink-muted")}>
                {weekday.label}
              </span>
            ))}
          </div>
          <div role="grid" aria-labelledby="cal-month" className="grid grid-cols-7">
            {cells.map((day, index) => {
              const inMonth = day.slice(0, 7) === month;
              const isToday = day === today;
              const picked = day === selectedDay;
              const list = byDay.get(day) ?? [];
              return (
                <div
                  key={day}
                  role="gridcell"
                  aria-selected={picked}
                  className={cn(
                    "relative flex min-h-[86px] flex-col gap-1 border-t border-line-card px-1.5 pt-1.5 pb-2 max-md:min-h-16",
                    index % 7 && "border-l",
                    inMonth ? "bg-surface" : "bg-table-head",
                    picked && "ring-2 ring-primary ring-inset",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectDay(picked ? "" : day)}
                    aria-label={list.length ? `${words.day(day)}, ${plural(t, list.length, "{count} event", "{count} events", undefined, fmt)}` : words.day(day)}
                    className="absolute inset-0 cursor-pointer"
                  />
                  <span
                    className={cn(
                      "pointer-events-none relative flex h-6.5 min-w-6.5 items-center justify-center self-start rounded-full px-1.5 text-small",
                      isToday ? "bg-primary font-bold text-primary-foreground" : inMonth ? "font-medium text-ink" : "font-medium text-ink-faint opacity-70",
                    )}
                  >
                    {toLocaleDigits(String(Number(day.slice(8))), fmt)}
                  </span>
                  {list.slice(0, 2).map((event) => {
                    const look = typeLook(event.type);
                    return (
                      <button
                        key={event.id}
                        type="button"
                        title={event.title}
                        onClick={() => onOpenEvent(event.id)}
                        className={cn("relative flex h-5.5 items-center gap-1 overflow-hidden rounded-[6px] px-1.5 text-left text-[11.5px] font-semibold whitespace-nowrap max-md:px-1", look.bg, look.fg, !inMonth && "opacity-55")}
                      >
                        <span className={cn("size-1.5 shrink-0 rounded-full", look.dot)} aria-hidden="true" />
                        <span className="truncate max-md:sr-only">{event.title}</span>
                      </button>
                    );
                  })}
                  {list.length > 2 && (
                    <span className="pointer-events-none relative pl-1.5 text-[11.5px] font-semibold text-ink-muted">{t("+{count} more", { count: count(list.length - 2) })}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="cal-side" className={cn(CARD, "flex flex-col gap-1 px-4.5 pt-4.5 pb-2.5")}>
          <div className="flex items-center justify-between gap-2 pb-2">
            <h2 id="cal-side" className="text-[16px] font-semibold text-ink">
              {selectedDay ? words.day(selectedDay) : t("Coming up")}
            </h2>
            {selectedDay && (
              <button type="button" onClick={() => onSelectDay("")} className="text-small font-semibold text-emerald hover:text-emerald-hover">
                {t("Show coming up")}
              </button>
            )}
          </div>
          {side.map((event) => (
            <UpcomingRow key={event.id} event={event} events={events} people={people} ledger={ledger} today={today} words={words} onOpen={() => onOpenEvent(event.id)} />
          ))}
          {dayEvents && dayEvents.length === 0 && (
            <div className="flex flex-col items-center gap-2.5 border-t border-divider px-2 pt-6.5 pb-4.5 text-center">
              <span className="text-body text-ink-muted">{t("Nothing on this day.")}</span>
              {!readOnly && (
                <button type="button" onClick={() => onAddOn(selectedDay)} className="flex h-9 items-center gap-1.5 rounded-full bg-emerald-soft px-3.5 text-small font-semibold text-emerald hover:bg-mint-50">
                  <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                  {t("Add an event on this day")}
                </button>
              )}
            </div>
          )}
          {!dayEvents && side.length === 0 && <p className="border-t border-divider px-1.5 py-6 text-center text-body text-ink-muted">{t("Nothing coming up. Add the next invitation when it comes.")}</p>}
        </section>
      </div>
    </>
  );
}

// One event in the side list: its day on a tile in the type's colour, what
// and where, how far off, and the gift so far (or the suggestion).
function UpcomingRow({ event, events, people, ledger, today, words, onOpen }: { event: SocialEvent; events: SocialEvent[]; people: EventPerson[]; ledger: Map<string, Ledger>; today: string; words: EventWords; onOpen: () => void }) {
  const { t, money, fmt } = words;
  const look = typeLook(event.type);
  const days = daysFrom(today, event.date);
  const gave = event.gifts.filter((gift) => gift.direction === "GAVE");
  const tip = event.mine ? null : tipFor(event, events, people, ledger);
  const suggested = suggestedOf(tip);
  const gift = event.mine
    ? t("Your event")
    : gave.length
      ? t("You gave {amount}", { amount: money(gave.reduce((sum, row) => sum + paisa(row.amount), 0)) })
      : tip?.kind === "noGift"
        ? t("Usually no gift")
        : suggested
          ? t("Suggested about {amount}", { amount: money(suggested) })
          : days < 0
            ? t("No gift written down")
            : t("Gift not decided");
  const soon = days >= 0 && days <= 7;
  return (
    <button type="button" onClick={onOpen} className="flex items-start gap-3 border-t border-divider px-1.5 py-3 text-left text-ink hover:bg-row-hover">
      <span className={cn("flex w-11.5 shrink-0 flex-col items-center rounded-[12px] py-1.5", look.bg, look.fg)}>
        <span className="text-[18px] leading-[1.1] font-bold">{toLocaleDigits(String(Number(event.date.slice(8))), fmt)}</span>
        <span className="text-[11px] font-semibold">{formatDay(event.date, "MMM", fmt)}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="truncate text-body font-semibold">{event.title}</span>
        <span className="truncate text-[12.5px] text-ink-muted">{[words.weekday(event.date), event.time && words.clock(event.time), event.place].filter(Boolean).join(" · ")}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-semibold", soon ? "bg-warning-soft text-warning" : "bg-surface-sunken text-ink-soft")}>{words.when(days)}</span>
          <span className={cn("text-caption", gave.length ? "text-brand-ink" : "text-ink-muted")}>{gift}</span>
        </span>
      </span>
    </button>
  );
}
